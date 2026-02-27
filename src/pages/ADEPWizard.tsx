import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Building2, Users, Flame, Map, FileText, 
  ChevronRight, ChevronLeft, Save, Download,
  AlertTriangle, CheckCircle2, Plus, Trash2, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { generateADEPPDF } from "@/utils/generateADEP";
import { validateTeams, getRecommendedTeamSizes } from "@/utils/teamValidator";
import type { 
  ADEPData, 
  CompanyInfo, 
  EmergencyTeams, 
  TeamMember, 
  Scenario,
  BlueprintData 
} from "@/types/adep";
import { DEFAULT_SCENARIOS } from "@/types/adep";

const STORAGE_KEY = "adep_draft";

export default function ADEPWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // ✅ State Management
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    firma_adi: "",
    adres: "",
    tehlike_sinifi: "Tehlikeli",
    calisan_sayisi: 50,
    logo_url: ""
  });

  const [teams, setTeams] = useState<EmergencyTeams>({
    sondurme: [],
    kurtarma: [],
    koruma: [],
    ilk_yardim: []
  });

  const [scenarios, setScenarios] = useState<Scenario[]>(DEFAULT_SCENARIOS);
  const [blueprint, setBlueprint] = useState<BlueprintData>({});
  const [blueprintImage, setBlueprintImage] = useState<string>("");

  // ✅ LocalStorage Persistence
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.companyInfo) setCompanyInfo(data.companyInfo);
        if (data.teams) setTeams(data.teams);
        if (data.scenarios) setScenarios(data.scenarios);
        if (data.blueprint) setBlueprint(data.blueprint);
        toast.info("📋 Kaydedilmiş taslak yüklendi");
      } catch (e) {
        console.error("Draft yükleme hatası:", e);
      }
    }
  }, []);

  useEffect(() => {
    const data: ADEPData = {
      company_info: companyInfo,
      teams,
      scenarios,
      blueprint
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [companyInfo, teams, scenarios, blueprint]);

  // ✅ Step Navigation
  const goToStep = (step: number) => {
    if (step < 1 || step > 5) return;

    // Validation kontrolü
    if (step === 2 && currentStep === 1) {
      if (!companyInfo.firma_adi || !companyInfo.adres || companyInfo.calisan_sayisi < 1) {
        toast.error("❌ Lütfen tüm işyeri bilgilerini doldurun");
        return;
      }
    }

    if (step === 3 && currentStep === 2) {
      const validation = validateTeams(companyInfo, teams);
      if (!validation.valid) {
        toast.error("❌ Ekip sayıları yetersiz", {
          description: validation.errors[0]
        });
        return;
      }
    }

    if (step === 4 && currentStep === 3) {
      const selectedCount = scenarios.filter(s => s.selected).length;
      if (selectedCount === 0) {
        toast.error("❌ En az 1 senaryo seçmelisiniz");
        return;
      }
    }

    setCurrentStep(step);
  };

  // ✅ Team Member Management
  const addTeamMember = (teamType: keyof EmergencyTeams) => {
    const newMember: TeamMember = {
      id: crypto.randomUUID(),
      ad_soyad: "",
      gorev: "",
      telefon: ""
    };
    setTeams(prev => ({
      ...prev,
      [teamType]: [...prev[teamType], newMember]
    }));
  };

  const updateTeamMember = (
    teamType: keyof EmergencyTeams,
    id: string,
    field: keyof TeamMember,
    value: string
  ) => {
    setTeams(prev => ({
      ...prev,
      [teamType]: prev[teamType].map(member =>
        member.id === id ? { ...member, [field]: value } : member
      )
    }));
  };

  const removeTeamMember = (teamType: keyof EmergencyTeams, id: string) => {
    setTeams(prev => ({
      ...prev,
      [teamType]: prev[teamType].filter(member => member.id !== id)
    }));
  };

  // ✅ Image Upload Handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      setBlueprintImage(imageUrl);
      setBlueprint(prev => ({ ...prev, image_url: imageUrl }));
      toast.success("✅ Kroki yüklendi");
    };
    reader.readAsDataURL(file);
  };

  // ✅ Generate & Download PDF
  const generateAndDownload = async () => {
    setLoading(true);
    toast.info("📄 PDF oluşturuluyor...");

    try {
      const adepData: ADEPData = {
        company_info: companyInfo,
        teams,
        scenarios: scenarios.filter(s => s.selected),
        blueprint
      };

      const pdfBlob = await generateADEPPDF(adepData);
      
      // Download
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ADEP-${companyInfo.firma_adi.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

        const { error } = await supabase.from("emergency_plans").insert({
        user_id: user?.id,
        plan_data: adepData as any, // 👈 Cast here
        company_name: companyInfo.firma_adi,
        hazard_class: companyInfo.tehlike_sinifi,
        employee_count: companyInfo.calisan_sayisi,
        pdf_size_kb: Math.round(pdfBlob.size / 1024)
        });

      if (error) throw error;

      toast.success("✅ ADEP başarıyla oluşturuldu!", {
        action: {
          label: "Yeni Plan",
          onClick: () => {
            localStorage.removeItem(STORAGE_KEY);
            window.location.reload();
          }
        }
      });

    } catch (e: any) {
      console.error(e);
      toast.error(`❌ PDF oluşturma hatası: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Recommended Team Sizes
  const recommendedSizes = getRecommendedTeamSizes(companyInfo);

  // ========================
  // STEP CONTENT
  // ========================
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label>Firma Adı *</Label>
              <Input
                value={companyInfo.firma_adi}
                onChange={(e) => setCompanyInfo(prev => ({ ...prev, firma_adi: e.target.value }))}
                placeholder="Örn: ABC İnşaat A.Ş."
                className="mt-2"
              />
            </div>

            <div>
              <Label>Adres *</Label>
              <Textarea
                value={companyInfo.adres}
                onChange={(e) => setCompanyInfo(prev => ({ ...prev, adres: e.target.value }))}
                placeholder="Tam adres bilgisi"
                className="mt-2 min-h-[80px]"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Tehlike Sınıfı *</Label>
                <Select
                  value={companyInfo.tehlike_sinifi}
                  onValueChange={(value: any) => setCompanyInfo(prev => ({ ...prev, tehlike_sinifi: value }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Çok Tehlikeli">Çok Tehlikeli</SelectItem>
                    <SelectItem value="Tehlikeli">Tehlikeli</SelectItem>
                    <SelectItem value="Az Tehlikeli">Az Tehlikeli</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Çalışan Sayısı *</Label>
                <Input
                  type="number"
                  value={companyInfo.calisan_sayisi}
                  onChange={(e) => setCompanyInfo(prev => ({ ...prev, calisan_sayisi: parseInt(e.target.value) || 0 }))}
                  placeholder="50"
                  className="mt-2"
                  min={1}
                />
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-semibold mb-2">Tehlike Sınıfı Nedir?</p>
                  <ul className="space-y-1 text-xs">
                    <li>• <strong>Çok Tehlikeli:</strong> Maden, inşaat, kimya sanayi</li>
                    <li>• <strong>Tehlikeli:</strong> Üretim, imalat, metal işleme</li>
                    <li>• <strong>Az Tehlikeli:</strong> Ofis, eğitim, perakende</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        const validation = validateTeams(companyInfo, teams);
        
        return (
          <div className="space-y-8">
            {/* Validation Alerts */}
            {validation.errors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    {validation.errors.map((error, idx) => (
                      <p key={idx} className="text-sm text-destructive">{error}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    {validation.warnings.map((warning, idx) => (
                      <p key={idx} className="text-sm text-warning">{warning}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Söndürme Ekibi */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    🧯 Söndürme Ekibi
                  </span>
                  <span className="text-sm font-normal text-muted-foreground">
                    Önerilen: {recommendedSizes.sondurme} kişi
                  </span>
                </CardTitle>
                <CardDescription>
                  Yangın söndürme ekipmanlarını kullanarak ilk müdahaleyi yapan ekip
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {teams.sondurme.map((member) => (
                  <div key={member.id} className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-4">
                      <Label className="text-xs">Ad Soyad</Label>
                      <Input
                        value={member.ad_soyad}
                        onChange={(e) => updateTeamMember('sondurme', member.id, 'ad_soyad', e.target.value)}
                        placeholder="Ali Veli"
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Görev</Label>
                      <Input
                        value={member.gorev}
                        onChange={(e) => updateTeamMember('sondurme', member.id, 'gorev', e.target.value)}
                        placeholder="Ekip Lideri"
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-4">
                      <Label className="text-xs">Telefon</Label>
                      <Input
                        value={member.telefon}
                        onChange={(e) => updateTeamMember('sondurme', member.id, 'telefon', e.target.value)}
                        placeholder="0555 123 45 67"
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeTeamMember('sondurme', member.id)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => addTeamMember('sondurme')}
                  className="w-full gap-2"
                >
                  <Plus className="h-4 w-4" /> Ekip Üyesi Ekle
                </Button>
              </CardContent>
            </Card>

            {/* Kurtarma Ekibi */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    🚑 Arama-Kurtarma Ekibi
                  </span>
                  <span className="text-sm font-normal text-muted-foreground">
                    Önerilen: {recommendedSizes.kurtarma} kişi
                  </span>
                </CardTitle>
                <CardDescription>
                  Enkaz altında veya tehlikeli bölgelerde kurtarma operasyonu yapan ekip
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {teams.kurtarma.map((member) => (
                  <div key={member.id} className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-4">
                      <Label className="text-xs">Ad Soyad</Label>
                      <Input
                        value={member.ad_soyad}
                        onChange={(e) => updateTeamMember('kurtarma', member.id, 'ad_soyad', e.target.value)}
                        placeholder="Ali Veli"
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Görev</Label>
                      <Input
                        value={member.gorev}
                        onChange={(e) => updateTeamMember('kurtarma', member.id, 'gorev', e.target.value)}
                        placeholder="Kurtarıcı"
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-4">
                      <Label className="text-xs">Telefon</Label>
                      <Input
                        value={member.telefon}
                        onChange={(e) => updateTeamMember('kurtarma', member.id, 'telefon', e.target.value)}
                        placeholder="0555 123 45 67"
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeTeamMember('kurtarma', member.id)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => addTeamMember('kurtarma')}
                  className="w-full gap-2"
                >
                  <Plus className="h-4 w-4" /> Ekip Üyesi Ekle
                </Button>
              </CardContent>
            </Card>

            {/* Koruma Ekibi */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    🛡️ Koruma Ekibi
                  </span>
                  <span className="text-sm font-normal text-muted-foreground">
                    Önerilen: {recommendedSizes.koruma} kişi
                  </span>
                </CardTitle>
                <CardDescription>
                  Tahliye sırasında yönlendirme ve güvenlik sağlayan ekip
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {teams.koruma.map((member) => (
                  <div key={member.id} className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-4">
                      <Label className="text-xs">Ad Soyad</Label>
                      <Input
                        value={member.ad_soyad}
                        onChange={(e) => updateTeamMember('koruma', member.id, 'ad_soyad', e.target.value)}
                        placeholder="Ali Veli"
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Görev</Label>
                      <Input
                        value={member.gorev}
                        onChange={(e) => updateTeamMember('koruma', member.id, 'gorev', e.target.value)}
                        placeholder="Koruma Görevlisi"
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-4">
                      <Label className="text-xs">Telefon</Label>
                      <Input
                        value={member.telefon}
                        onChange={(e) => updateTeamMember('koruma', member.id, 'telefon', e.target.value)}
                        placeholder="0555 123 45 67"
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeTeamMember('koruma', member.id)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => addTeamMember('koruma')}
                  className="w-full gap-2"
                >
                  <Plus className="h-4 w-4" /> Ekip Üyesi Ekle
                </Button>
              </CardContent>
            </Card>

            {/* İlk Yardım Ekibi */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    🩹 İlk Yardım Ekibi
                  </span>
                  <span className="text-sm font-normal text-muted-foreground">
                    Önerilen: {recommendedSizes.ilk_yardim} kişi
                  </span>
                </CardTitle>
                <CardDescription>
                  Yaralılara ilk müdahaleyi yapan sağlık ekibi
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {teams.ilk_yardim.map((member) => (
                  <div key={member.id} className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-4">
                      <Label className="text-xs">Ad Soyad</Label>
                      <Input
                        value={member.ad_soyad}
                        onChange={(e) => updateTeamMember('ilk_yardim', member.id, 'ad_soyad', e.target.value)}
                        placeholder="Ali Veli"
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Görev</Label>
                      <Input
                        value={member.gorev}
                        onChange={(e) => updateTeamMember('ilk_yardim', member.id, 'gorev', e.target.value)}
                        placeholder="İlk Yardımcı"
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-4">
                      <Label className="text-xs">Telefon</Label>
                      <Input
                        value={member.telefon}
                        onChange={(e) => updateTeamMember('ilk_yardim', member.id, 'telefon', e.target.value)}
                        placeholder="0555 123 45 67"
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeTeamMember('ilk_yardim', member.id)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => addTeamMember('ilk_yardim')}
                  className="w-full gap-2"
                >
                  <Plus className="h-4 w-4" /> Ekip Üyesi Ekle
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                İşyerinizde gerçekleşme olasılığı olan acil durum senaryolarını seçin. 
                Her senaryo için otomatik prosedürler oluşturulacaktır.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {scenarios.map((scenario) => (
                <Card 
                  key={scenario.id}
                  className={`cursor-pointer transition-all ${
                    scenario.selected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                  }`}
                  onClick={() => {
                    setScenarios(prev => prev.map(s =>
                      s.id === scenario.id ? { ...s, selected: !s.selected } : s
                    ));
                  }}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={scenario.selected}
                        onCheckedChange={() => {}}
                        className="pointer-events-none"
                      />
                      <span className="text-3xl">{scenario.icon}</span>
                      <CardTitle className="text-lg">{scenario.name}</CardTitle>
                    </div>
                  </CardHeader>
                  {scenario.selected && (
                    <CardContent>
                      <p className="text-sm font-semibold text-muted-foreground mb-2">
                        Prosedürler:
                      </p>
                      <ul className="space-y-1">
                        {scenario.procedures.slice(0, 3).map((proc, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className="text-primary">•</span>
                            <span>{proc}</span>
                          </li>
                        ))}
                        {scenario.procedures.length > 3 && (
                          <li className="text-xs text-primary">
                            +{scenario.procedures.length - 3} prosedür daha...
                          </li>
                        )}
                      </ul>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>

            <div className="text-sm text-muted-foreground text-center">
              Seçili: <strong>{scenarios.filter(s => s.selected).length}</strong> senaryo
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <Label>Tahliye Krokisi</Label>
              <p className="text-sm text-muted-foreground mt-1">
                İşyerinizin tahliye planını yükleyin veya AI Kroki Okuyucu'dan aktarın
              </p>
            </div>

            {!blueprintImage ? (
              <div className="space-y-4">
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 rounded-xl p-12 cursor-pointer transition-all">
                  <Map className="h-16 w-16 text-primary mb-4" />
                  <span className="text-lg font-semibold text-foreground">Kroki Görseli Seç</span>
                  <span className="text-xs text-muted-foreground mt-2">PNG, JPG veya PDF formatında</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    className="hidden"
                  />
                </label>

                <div className="text-center">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/blueprint-analyzer')}
                    className="gap-2"
                  >
                    <Building2 className="h-4 w-4" />
                    AI Kroki Okuyucu'ya Git
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative w-full h-96 rounded-xl overflow-hidden border-2 border-primary/30">
                  <img 
                    src={blueprintImage} 
                    alt="Tahliye Krokisi" 
                    className="w-full h-full object-contain bg-slate-50"
                  />
                  <button 
                    onClick={() => { setBlueprintImage(""); setBlueprint({}); }}
                    className="absolute top-2 right-2 bg-black/70 p-2 rounded-full text-white hover:bg-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {blueprint.analysis_result && (
                  <div className="bg-success/10 border border-success/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-success">AI Analiz Sonucu Eklenecek</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Teknik denetim raporu PDF'e otomatik eklenecektir
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 border border-green-200 dark:border-green-800 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="h-8 w-8 text-success shrink-0" />
                <div>
                  <h3 className="font-bold text-lg text-foreground mb-2">
                    Acil Durum Eylem Planı Hazır!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Planınız 6331 sayılı İSG Kanunu'na uygun olarak oluşturuldu.
                    İndirdiğiniz PDF'i işyerinizde görünür yerlere asabilirsiniz.
                  </p>
                </div>
              </div>
            </div>

            {/* Özet Bilgiler */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    İşyeri Bilgileri
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Firma:</span>
                    <span className="font-semibold">{companyInfo.firma_adi}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tehlike Sınıfı:</span>
                    <span className="font-semibold">{companyInfo.tehlike_sinifi}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Çalışan:</span>
                    <span className="font-semibold">{companyInfo.calisan_sayisi} kişi</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Acil Durum Ekipleri
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Söndürme:</span>
                    <span className="font-semibold">{teams.sondurme.length} kişi</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kurtarma:</span>
                    <span className="font-semibold">{teams.kurtarma.length} kişi</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Koruma:</span>
                    <span className="font-semibold">{teams.koruma.length} kişi</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">İlk Yardım:</span>
                    <span className="font-semibold">{teams.ilk_yardim.length} kişi</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Flame className="h-5 w-5 text-primary" />
                    Seçili Senaryolar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {scenarios.filter(s => s.selected).map(s => (
                      <span 
                        key={s.id}
                        className="px-3 py-1 bg-primary/10 border border-primary/30 rounded-full text-xs font-medium"
                      >
                        {s.icon} {s.name}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Map className="h-5 w-5 text-primary" />
                    Tahliye Krokisi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {blueprintImage ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-success" />
                        <span className="text-sm font-semibold text-success">Eklendi</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-5 w-5 text-warning" />
                        <span className="text-sm font-semibold text-warning">Eklenmedi</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Download Button */}
            <Button
              onClick={generateAndDownload}
              disabled={loading}
              className="w-full gap-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 h-14 text-lg font-bold"
            >
              {loading ? (
                <>
                  <Save className="h-6 w-6 animate-spin" />
                  PDF Oluşturuluyor...
                </>
              ) : (
                <>
                  <Download className="h-6 w-6" />
                  ADEP'i İndir (PDF)
                </>
              )}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  // ========================
  // MAIN RENDER
  // ========================
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          🚨 Acil Durum Eylem Planı Sihirbazı
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          5 adımda mevzuata uygun ADEP oluşturun
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between">
        {[
          { num: 1, icon: Building2, label: "İşyeri" },
          { num: 2, icon: Users, label: "Ekipler" },
          { num: 3, icon: Flame, label: "Senaryolar" },
          { num: 4, icon: Map, label: "Kroki" },
          { num: 5, icon: FileText, label: "Önizleme" }
        ].map((step, idx) => (
          <div key={step.num} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => goToStep(step.num)}
              className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                currentStep === step.num
                  ? 'bg-primary border-primary text-white scale-110'
                  : currentStep > step.num
                  ? 'bg-success border-success text-white'
                  : 'bg-secondary border-border text-muted-foreground hover:border-primary'
              }`}
            >
              {currentStep > step.num ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : (
                <step.icon className="h-6 w-6" />
              )}
            </button>
            <span className={`text-sm font-medium hidden md:block ${
              currentStep >= step.num ? 'text-foreground' : 'text-muted-foreground'
            }`}>
              {step.label}
            </span>
            {idx < 4 && (
              <div className={`flex-1 h-1 rounded ${
                currentStep > step.num ? 'bg-success' : 'bg-border'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle>
            Adım {currentStep}/5: {
              currentStep === 1 ? "İşyeri Bilgileri" :
              currentStep === 2 ? "Acil Durum Ekipleri" :
              currentStep === 3 ? "Senaryo Seçimi" :
              currentStep === 4 ? "Tahliye Krokisi" :
              "Önizleme & İndirme"
            }
          </CardTitle>
        </CardHeader>
        <CardContent className="min-h-[400px]">
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => goToStep(currentStep - 1)}
          disabled={currentStep === 1}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Geri
        </Button>

        {currentStep < 5 && (
          <Button
            onClick={() => goToStep(currentStep + 1)}
            className="gap-2"
          >
            İleri
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}