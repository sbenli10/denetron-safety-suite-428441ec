import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Building2, Users, Flame, Map, FileText, 
  ChevronRight, ChevronLeft, Save, Download,
  AlertTriangle, CheckCircle2, Plus, Trash2, Info,
  MapPin, Phone, Mail, Camera, Upload, Zap,
  Calendar as CalendarIcon, Shield, Award,
  QrCode, Clock, Target, AlertCircle,User,Loader2,
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { generateADEPPDF } from "@/utils/generateADEP";
import { validateTeams, getRecommendedTeamSizes } from "@/utils/teamValidator";
import { generateQRCode, generateADEPUrl } from "@/utils/qrCodeGenerator";
import { findNearbyEmergencyServices } from "@/utils/nearbyPlaces";
import type { 
  ADEPData, 
  CompanyInfo, 
  EmergencyTeams, 
  TeamMember, 
  Scenario,
  BlueprintData,
  EmergencyContact,
  DrillSchedule
} from "@/types/adep";
import { ADVANCED_SCENARIOS } from "@/types/adep";
import { addMonths, format } from "date-fns";

const STORAGE_KEY = "adep_draft";
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const SECTORS = [
  "İnşaat", "İmalat", "Üretim", "Enerji", "Kimya",
  "Tekstil", "Gıda", "Metal", "Otomotiv", "Lojistik",
  "Eğitim", "Sağlık", "Perakende", "Ofis", "Diğer"
];

const CERTIFICATIONS = [
  "İlk Yardım", "Yangın Söndürme", "Arama-Kurtarma", 
  "Kimyasal Müdahale", "Acil Durum Yönetimi", "AFAD Sertifikası"
];

export default function ADEPWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  // ✅ State Management
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    firma_adi: "",
    adres: "",
    tehlike_sinifi: "Tehlikeli",
    calisan_sayisi: 50,
    logo_url: "",
    sektor: "",
    yetkili_kisi: "",
    yetkili_telefon: "",
    email: ""
  });

  const [teams, setTeams] = useState<EmergencyTeams>({
    sondurme: [],
    kurtarma: [],
    koruma: [],
    ilk_yardim: []
  });

  const [scenarios, setScenarios] = useState<Scenario[]>(ADVANCED_SCENARIOS);
  const [blueprint, setBlueprint] = useState<BlueprintData>({});
  const [blueprintImage, setBlueprintImage] = useState<string>("");
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [drillSchedule, setDrillSchedule] = useState<DrillSchedule[]>([]);
  const [qrCode, setQrCode] = useState<string>("");

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
        if (data.emergencyContacts) setEmergencyContacts(data.emergencyContacts);
        if (data.drillSchedule) setDrillSchedule(data.drillSchedule);
        toast.info("📋 Kaydedilmiş taslak yüklendi");
      } catch (e) {
        console.error("Draft yükleme hatası:", e);
      }
    }
  }, []);

  useEffect(() => {
    const data = {
      companyInfo,
      teams,
      scenarios,
      blueprint,
      emergencyContacts,
      drillSchedule
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [companyInfo, teams, scenarios, blueprint, emergencyContacts, drillSchedule]);

  // ✅ AI Risk Analysis
  const analyzeRisks = async () => {
    if (!companyInfo.firma_adi || !companyInfo.sektor) {
      toast.error("Lütfen firma adı ve sektör bilgisini girin");
      return;
    }

    setAiAnalyzing(true);
    toast.info("🤖 AI risk analizi yapılıyor...");

    try {
const prompt = `İşyeri Bilgileri:
- Firma Adı: ${companyInfo.firma_adi}
- Sektör: ${companyInfo.sektor}
- Tehlike Sınıfı: ${companyInfo.tehlike_sinifi}
- Toplam Çalışan: ${companyInfo.calisan_sayisi}

Görev:
Yukarıdaki bilgilere dayanarak bu işyeri için en olası 5 acil durum senaryosunu analiz et. 

Kısıtlamalar:
1. Sadece şu ID değerlerinden uygun olanları seç: "yangin", "deprem", "kimyasal", "gaz_kacagi", "sel", "elektrik", "bomb_tehdidi", "is_kazasi", "pandemi", "siddetli_hava".
2. "risk_level" değeri sadece "low", "medium", "high" veya "critical" olabilir.
3. Yanıt sadece ham JSON formatında olmalıdır. Markdown etiketleri ( \`\`\`json ) kullanma.

Çıktı Formatı:
{
  "scenarios": [
    {
      "id": "senaryo_id",
      "risk_level": "risk_seviyesi",
      "justification": "Kısa açıklama (Türkçe)"
    }
  ]
}`;
      const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${import.meta.env.VITE_GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          // Hata veren response_format veya mime_type alanlarını sildik
          generationConfig: {
            temperature: 0.2
          }
        })
      }
    );

    // 1. KORUMA: HTTP Hatası Kontrolü
    if (!response.ok) {
      const errorBody = await response.json();
      console.error("API Hata Detayı:", errorBody);
      throw new Error(`API Hatası: ${response.status} - ${errorBody.error?.message || 'Bilinmeyen hata'}`);
    }

    const result = await response.json();

    // 2. KORUMA: Veri Yapısı Kontrolü (Reading '0' hatasını engeller)
    if (!result.candidates || result.candidates.length === 0 || !result.candidates[0].content?.parts?.[0]?.text) {
      throw new Error("API'den anlamlı bir veri dönmedi. Lütfen tekrar deneyin.");
    }

    const content = result.candidates[0].content.parts[0].text;
    const analysis = JSON.parse(content);
      // Senaryoları güncelle
      setScenarios(prev => prev.map(s => {
        const aiScenario = analysis.scenarios.find((ai: any) => ai.id === s.id);
        if (aiScenario) {
          return {
            ...s,
            selected: true,
            risk_level: aiScenario.risk_level
          };
        }
        return s;
      }));

      toast.success("✅ AI analizi tamamlandı! Önerilen senaryolar seçildi.");
    } catch (error: any) {
      console.error("AI Analysis error:", error);
      toast.error("AI analizi başarısız");
    } finally {
      setAiAnalyzing(false);
    }
  };

  // ✅ Nearby Emergency Services
  const findNearbyServices = async () => {
    if (!companyInfo.koordinatlar) {
      // Get coordinates from address
      toast.info("📍 Adres konumu tespit ediliyor...");
      
      try {
        const geocodeResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(companyInfo.adres)}&key=${GOOGLE_MAPS_API_KEY}`
        );
        const geocodeData = await geocodeResponse.json();
        
        if (geocodeData.results.length > 0) {
          const location = geocodeData.results[0].geometry.location;
          setCompanyInfo(prev => ({
            ...prev,
            koordinatlar: { lat: location.lat, lng: location.lng }
          }));
          
          // Find nearby services
          const services = await findNearbyEmergencyServices(
            location.lat,
            location.lng,
            GOOGLE_MAPS_API_KEY!
          );

          const contacts: EmergencyContact[] = [
            { name: "İtfaiye", phone: "110", type: "itfaiye" },
            { name: "Ambulans", phone: "112", type: "ambulans" },
            { name: "Polis", phone: "155", type: "polis" },
            { name: "AFAD", phone: "122", type: "AFAD" },
            ...services.map(s => {
              // Tip dönüşüm haritası
              const typeMapping: Record<string, EmergencyContact['type']> = {
                'hospital': 'hastane',
                'fire_station': 'itfaiye',
                'police': 'polis'
              };

              return {
                name: s.name,
                phone: s.phone || "—",
                address: s.address,
                distance: s.distance,
                // Gelen tip haritada varsa karşılığını, yoksa olduğu gibi (ya da varsayılan) ata
                type: typeMapping[s.type] || (s.type as any) 
              };
            })
        ];

          setEmergencyContacts(contacts);
          toast.success(`✅ ${services.length} yakın acil servis bulundu`);
        }
      } catch (error) {
        console.error("Geocoding error:", error);
        toast.error("Konum tespit edilemedi");
      }
    }
  };

  // ✅ Auto-generate Drill Schedule
  const generateDrillSchedule = () => {
    const selectedScenarios = scenarios.filter(s => s.selected);
    if (selectedScenarios.length === 0) {
      toast.error("Önce senaryo seçin");
      return;
    }

    const schedule: DrillSchedule[] = selectedScenarios.map((scenario, idx) => ({
      date: format(addMonths(new Date(), idx * 3), 'yyyy-MM-dd'),
      scenario: scenario.name,
      duration: scenario.estimated_duration,
      participants: Math.ceil(companyInfo.calisan_sayisi * 0.7),
      notes: `${scenario.name} senaryosu için tatbikat`
    }));

    setDrillSchedule(schedule);
    toast.success(`✅ ${schedule.length} tatbikat planlandı`);
  };

  // ✅ Step Navigation
  const goToStep = (step: number) => {
    if (step < 1 || step > 6) return;

    // Validation
    if (step === 2 && currentStep === 1) {
      if (!companyInfo.firma_adi || !companyInfo.adres || !companyInfo.yetkili_kisi) {
        toast.error("❌ Lütfen tüm zorunlu alanları doldurun");
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
      telefon: "",
      email: ""
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

  // ✅ Photo Upload for Team Members
  const handleMemberPhotoUpload = async (
    teamType: keyof EmergencyTeams,
    memberId: string,
    file: File
  ) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const photoUrl = e.target?.result as string;
      updateTeamMember(teamType, memberId, 'photo_url', photoUrl);
      toast.success("📷 Fotoğraf yüklendi");
    };
    reader.readAsDataURL(file);
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
    toast.info("📄 Profesyonel PDF oluşturuluyor...");

    try {
      // Generate QR Code
      const tempId = crypto.randomUUID().substring(0, 8);
      const qrUrl = generateADEPUrl(tempId);
      const qrDataUrl = await generateQRCode(qrUrl);
      setQrCode(qrDataUrl);

      const adepData: ADEPData = {
        version: "1.0",
        company_info: companyInfo,
        teams,
        scenarios: scenarios.filter(s => s.selected),
        blueprint,
        emergency_contacts: emergencyContacts,
        drill_schedule: drillSchedule,
        created_at: new Date().toISOString(),
        created_by: user?.email || "Bilinmiyor",
        next_review_date: format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
        qr_code: qrDataUrl
      };

      const pdfBlob = await generateADEPPDF(adepData);
      
      // Download
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ADEP-${companyInfo.firma_adi.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      // Save to database
      const { error } = await supabase.from("emergency_plans").insert({
        user_id: user?.id,
        plan_data: adepData as any,
        company_name: companyInfo.firma_adi,
        hazard_class: companyInfo.tehlike_sinifi,
        employee_count: companyInfo.calisan_sayisi,
        pdf_size_kb: Math.round(pdfBlob.size / 1024)
      });

      if (error) throw error;

      toast.success("✅ ADEP başarıyla oluşturuldu!", {
        duration: 5000,
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

  // ✅ Progress Calculation
  const calculateProgress = () => {
    let progress = 0;
    if (companyInfo.firma_adi) progress += 10;
    if (companyInfo.adres) progress += 10;
    if (companyInfo.yetkili_kisi) progress += 10;
    if (teams.sondurme.length > 0) progress += 15;
    if (teams.kurtarma.length > 0) progress += 15;
    if (scenarios.filter(s => s.selected).length > 0) progress += 20;
    if (blueprintImage) progress += 10;
    if (emergencyContacts.length > 0) progress += 10;
    return progress;
  };

 const recommendedSizes = getRecommendedTeamSizes(companyInfo.tehlike_sinifi);

  // ========================
  // STEP CONTENT
  // ========================
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Tamamlanma</span>
                <span>{calculateProgress()}%</span>
              </div>
              <Progress value={calculateProgress()} className="h-2" />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
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
                <Label>Sektör *</Label>
                <Select
                  value={companyInfo.sektor}
                  onValueChange={(value) => setCompanyInfo(prev => ({ ...prev, sektor: value }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTORS.map(sector => (
                      <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Tam Adres *</Label>
              <Textarea
                value={companyInfo.adres}
                onChange={(e) => setCompanyInfo(prev => ({ ...prev, adres: e.target.value }))}
                placeholder="Mahalle, Cadde, No, İlçe, İl"
                className="mt-2 min-h-[80px]"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
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
                    <SelectItem value="Çok Tehlikeli">🔴 Çok Tehlikeli</SelectItem>
                    <SelectItem value="Tehlikeli">🟠 Tehlikeli</SelectItem>
                    <SelectItem value="Az Tehlikeli">🟢 Az Tehlikeli</SelectItem>
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

              <div>
                <Label>Vergi No</Label>
                <Input
                  value={companyInfo.vergi_no || ""}
                  onChange={(e) => setCompanyInfo(prev => ({ ...prev, vergi_no: e.target.value }))}
                  placeholder="1234567890"
                  className="mt-2"
                  maxLength={11}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Yetkili Kişi *
                </Label>
                <Input
                  value={companyInfo.yetkili_kisi}
                  onChange={(e) => setCompanyInfo(prev => ({ ...prev, yetkili_kisi: e.target.value }))}
                  placeholder="İsim Soyisim"
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Yetkili Telefon *
                </Label>
                <Input
                  value={companyInfo.yetkili_telefon}
                  onChange={(e) => setCompanyInfo(prev => ({ ...prev, yetkili_telefon: e.target.value }))}
                  placeholder="0555 123 45 67"
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  E-posta
                </Label>
                <Input
                  type="email"
                  value={companyInfo.email || ""}
                  onChange={(e) => setCompanyInfo(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="info@firma.com"
                  className="mt-2"
                />
              </div>
            </div>

            {/* AI Risk Analysis */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-purple-900 dark:text-purple-100">
                      🤖 AI Destekli Risk Analizi
                    </p>
                    <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                      Yapay zeka sektörünüze özel acil durum senaryolarını otomatik belirler
                    </p>
                  </div>
                </div>
                <Button
                  onClick={analyzeRisks}
                  disabled={aiAnalyzing || !companyInfo.sektor}
                  variant="outline"
                  size="sm"
                  className="gap-2 shrink-0"
                >
                  {aiAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analiz Ediliyor...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      AI Analiz Başlat
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-semibold mb-2">Tehlike Sınıfı Nedir?</p>
                  <ul className="space-y-1 text-xs">
                    <li>• <strong>Çok Tehlikeli:</strong> Maden, inşaat, kimya, patlayıcı madde üretimi</li>
                    <li>• <strong>Tehlikeli:</strong> Metal işleme, imalat, elektrik tesisleri</li>
                    <li>• <strong>Az Tehlikeli:</strong> Ofis, eğitim, perakende, finans</li>
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
                      <p key={idx} className="text-sm text-destructive font-semibold">{error}</p>
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

            {/* Team Cards */}
            {Object.entries({
                sondurme: { name: "Söndürme Ekibi", icon: "🧯", desc: "..." },
                kurtarma: { name: "Arama-Kurtarma Ekibi", icon: "🚑", desc: "..." },
                koruma: { name: "Koruma Ekibi", icon: "🛡️", desc: "..." },
                ilk_yardim: { name: "İlk Yardım Ekibi", icon: "🩹", desc: "..." }
              }).map(([key, meta]) => {
                const teamKey = key as keyof EmergencyTeams;
                // teams[teamKey] undefined olsa bile uygulama çökmez:
                const teamMembers = teams[teamKey] || []; 
                // recommendedSizes[teamKey] undefined olsa bile 0 gösterir:
                const requiredSize = recommendedSizes?.[teamKey] || 0;
              
              return (
                <Card key={key}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <span className="text-2xl">{meta.icon}</span>
                        {meta.name}
                        <Badge variant="outline">
                          {(teamMembers?.length || 0)}/{recommendedSizes[teamKey]}
                        </Badge>
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addTeamMember(teamKey)}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Ekip Üyesi Ekle
                      </Button>
                    </div>
                    <CardDescription>{meta.desc}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {teamMembers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Henüz ekip üyesi eklenmedi</p>
                      </div>
                    ) : (
                      teamMembers.map((member) => (
                        <div key={member.id} className="border border-border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1">
                              {/* Photo */}
                              <div className="relative">
                                {member.photo_url ? (
                                  <img 
                                    src={member.photo_url} 
                                    alt={member.ad_soyad}
                                    className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                                  />
                                ) : (
                                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                                    <User className="h-8 w-8 text-muted-foreground" />
                                  </div>
                                )}
                                <label className="absolute bottom-0 right-0 bg-primary text-white p-1 rounded-full cursor-pointer hover:bg-primary/80 transition-colors">
                                  <Camera className="h-3 w-3" />
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleMemberPhotoUpload(teamKey, member.id, file);
                                    }}
                                  />
                                </label>
                              </div>

                              {/* Info */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                                <div>
                                  <Label className="text-xs text-muted-foreground">Ad Soyad</Label>
                                  <Input
                                    value={member.ad_soyad}
                                    onChange={(e) => updateTeamMember(teamKey, member.id, 'ad_soyad', e.target.value)}
                                    placeholder="Ali Veli"
                                    className="mt-1 h-9"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Görev</Label>
                                  <Input
                                    value={member.gorev}
                                    onChange={(e) => updateTeamMember(teamKey, member.id, 'gorev', e.target.value)}
                                    placeholder="Ekip Lideri"
                                    className="mt-1 h-9"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Telefon</Label>
                                  <Input
                                    value={member.telefon}
                                    onChange={(e) => updateTeamMember(teamKey, member.id, 'telefon', e.target.value)}
                                    placeholder="0555 123 45 67"
                                    className="mt-1 h-9"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Sertifika</Label>
                                  <Select
                                    value={member.sertifika || ""}
                                    onValueChange={(value) => updateTeamMember(teamKey, member.id, 'sertifika', value)}
                                  >
                                    <SelectTrigger className="mt-1 h-9">
                                      <SelectValue placeholder="Seçiniz" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {CERTIFICATIONS.map(cert => (
                                        <SelectItem key={cert} value={cert}>{cert}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>

                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeTeamMember(teamKey, member.id)}
                              className="text-destructive hover:bg-destructive/10 shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {member.sertifika && (
                            <div className="flex items-center gap-2 pt-2 border-t border-border">
                              <Award className="h-4 w-4 text-success" />
                              <span className="text-xs font-semibold text-success">{member.sertifika}</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  İşyerinizde gerçekleşme olasılığı olan acil durum senaryolarını seçin. 
                  Her senaryo için detaylı prosedürler ve süre tahminleri eklenecektir.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateDrillSchedule}
                  disabled={scenarios.filter(s => s.selected).length === 0}
                  className="gap-2 shrink-0"
                >
                  <CalendarIcon className="h-4 w-4" />
                  Tatbikat Planla
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {scenarios.map((scenario) => (
                <Card 
                  key={scenario.id}
                  className={`cursor-pointer transition-all ${
                    scenario.selected 
                      ? 'border-primary bg-primary/5 shadow-md' 
                      : 'hover:border-primary/50 hover:shadow'
                  }`}
                  onClick={() => {
                    setScenarios(prev => prev.map(s =>
                      s.id === scenario.id ? { ...s, selected: !s.selected } : s
                    ));
                  }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                          checked={scenario.selected}
                          onCheckedChange={() => {}}
                          className="pointer-events-none"
                        />
                        <span className="text-3xl">{scenario.icon}</span>
                        <div>
                          <CardTitle className="text-base">{scenario.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant="outline"
                              className={
                                scenario.risk_level === "critical" ? "border-red-500 text-red-600" :
                                scenario.risk_level === "high" ? "border-orange-500 text-orange-600" :
                                scenario.risk_level === "medium" ? "border-yellow-500 text-yellow-600" :
                                "border-green-500 text-green-600"
                              }
                            >
                              {scenario.risk_level === "critical" ? "🔴 Kritik" :
                               scenario.risk_level === "high" ? "🟠 Yüksek" :
                               scenario.risk_level === "medium" ? "🟡 Orta" : "🟢 Düşük"}
                            </Badge>
                            <Badge variant="secondary" className="gap-1">
                              <Clock className="h-3 w-3" />
                              {scenario.estimated_duration}dk
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  {scenario.selected && (
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                          <Target className="h-3 w-3" />
                          Sorumlu Ekip:
                        </p>
                        <Badge className="gap-1">
                          {scenario.responsible_team === "sondurme" && "🧯 Söndürme"}
                          {scenario.responsible_team === "kurtarma" && "🚑 Kurtarma"}
                          {scenario.responsible_team === "koruma" && "🛡️ Koruma"}
                          {scenario.responsible_team === "ilk_yardim" && "🩹 İlk Yardım"}
                        </Badge>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">
                          Prosedürler ({(scenario.procedures?.length || 0)} adım):
                        </p>
                        <ul className="space-y-1 max-h-32 overflow-y-auto">
                          {scenario.procedures.slice(0, 4).map((proc, idx) => (
                            <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                              <span className="text-primary shrink-0">•</span>
                              <span>{proc}</span>
                            </li>
                          ))}
                          {scenario.procedures.length > 4 && (
                            <li className="text-xs text-primary font-semibold">
                              +{scenario.procedures.length - 4} prosedür daha...
                            </li>
                          )}
                        </ul>
                      </div>

                      {(scenario.required_equipment?.length ?? 0) > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">
                            Gerekli Ekipman:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {/* 2. Map işleminden önce dizinin varlığından emin ol (|| []) */}
                            {(scenario.required_equipment || []).map((eq, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {eq}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>

            <div className="flex items-center justify-between bg-secondary/30 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="font-semibold">
                  Seçili: {scenarios.filter(s => s.selected).length} senaryo
                </span>
              </div>
              {drillSchedule.length > 0 && (
                <Badge className="gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  {drillSchedule.length} tatbikat planlandı
                </Badge>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-lg font-bold">Tahliye Krokisi</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  İşyerinizin tahliye planını yükleyin veya AI Kroki Okuyucu'dan aktarın
                </p>
              </div>
              {!blueprintImage && (
                <Button
                  variant="outline"
                  onClick={() => navigate('/blueprint-analyzer')}
                  className="gap-2"
                >
                  <Building2 className="h-4 w-4" />
                  AI Kroki Okuyucu
                </Button>
              )}
            </div>

            {!blueprintImage ? (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 rounded-xl p-16 cursor-pointer transition-all">
                <Map className="h-20 w-20 text-primary mb-4" />
                <span className="text-xl font-bold text-foreground">Kroki Görseli Seç</span>
                <span className="text-sm text-muted-foreground mt-2">PNG, JPG veya PDF formatında (Max 10MB)</span>
                <input 
                  type="file" 
                  accept="image/*,application/pdf" 
                  onChange={handleImageUpload} 
                  className="hidden"
                />
              </label>
            ) : (
              <div className="space-y-4">
                <div className="relative w-full h-[500px] rounded-xl overflow-hidden border-2 border-primary/30 shadow-lg">
                  <img 
                    src={blueprintImage} 
                    alt="Tahliye Krokisi" 
                    className="w-full h-full object-contain bg-slate-50 dark:bg-slate-900"
                  />
                  <button 
                    onClick={() => { 
                      setBlueprintImage(""); 
                      setBlueprint({}); 
                    }}
                    className="absolute top-4 right-4 bg-black/70 hover:bg-destructive p-3 rounded-full text-white transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                {/* Blueprint Details */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Kat Sayısı</Label>
                    <Input
                      type="number"
                      value={blueprint.floor_count || ""}
                      onChange={(e) => setBlueprint(prev => ({ ...prev, floor_count: parseInt(e.target.value) || undefined }))}
                      placeholder="Örn: 3"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Bina Alanı (m²)</Label>
                    <Input
                      type="number"
                      value={blueprint.building_area || ""}
                      onChange={(e) => setBlueprint(prev => ({ ...prev, building_area: parseInt(e.target.value) || undefined }))}
                      placeholder="Örn: 5000"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Acil Çıkış Sayısı</Label>
                    <Input
                      type="number"
                      value={blueprint.emergency_exits || ""}
                      onChange={(e) => setBlueprint(prev => ({ ...prev, emergency_exits: parseInt(e.target.value) || undefined }))}
                      placeholder="Örn: 4"
                      className="mt-2"
                    />
                  </div>
                </div>

                {blueprint.analysis_result && (
                  <div className="bg-success/10 border border-success/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-success">AI Analiz Sonucu Mevcut</p>
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
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-lg font-bold flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Acil Servis İletişim Bilgileri
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Yakın hastane, itfaiye ve diğer acil servisler
                </p>
              </div>
              {emergencyContacts.length === 0 && (
                <Button
                  variant="outline"
                  onClick={findNearbyServices}
                  disabled={!companyInfo.adres}
                  className="gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  Yakın Servisleri Bul
                </Button>
              )}
            </div>

            {emergencyContacts.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                <Phone className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">
                  Henüz acil servis bilgisi eklenmedi
                </p>
                <Button
                  onClick={findNearbyServices}
                  disabled={!companyInfo.adres}
                  className="gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  Otomatik Bul
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {emergencyContacts.map((contact, idx) => (
                  <Card key={idx}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        {contact.type === "itfaiye" && "🚒"}
                        {contact.type === "ambulans" && "🚑"}
                        {contact.type === "polis" && "🚓"}
                        {contact.type === "hastane" && "🏥"}
                        {contact.type === "AFAD" && "🆘"}
                        {contact.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${contact.phone}`} className="font-mono font-bold hover:text-primary">
                          {contact.phone}
                        </a>
                      </div>
                      {contact.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <span className="text-muted-foreground text-xs">{contact.address}</span>
                        </div>
                      )}
                      {contact.distance && (
                        <Badge variant="outline" className="gap-1">
                          <Target className="h-3 w-3" />
                          {contact.distance} km uzaklıkta
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Drill Schedule */}
            {drillSchedule.length > 0 && (
              <div className="space-y-4">
                <Label className="text-lg font-bold flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  Tatbikat Takvimi
                </Label>
                <div className="space-y-2">
                  {drillSchedule.map((drill, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg border border-border">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold">
                            {format(new Date(drill.date), 'dd')}
                          </p>
                          <p className="text-xs text-muted-foreground uppercase">
                            {format(new Date(drill.date), 'MMM')}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold">{drill.scenario} Tatbikatı</p>
                          <p className="text-xs text-muted-foreground">
                            {drill.duration} dakika • {drill.participants} katılımcı
                          </p>
                        </div>
                      </div>
                      <Badge>
                        {Math.ceil((new Date(drill.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} gün sonra
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 border-2 border-green-200 dark:border-green-800 rounded-xl p-8">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-success rounded-xl">
                  <CheckCircle2 className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-2xl text-foreground mb-2">
                    Acil Durum Eylem Planı Hazır!
                  </h3>
                  <p className="text-muted-foreground">
                    Planınız <strong>6331 sayılı İSG Kanunu</strong> ve <strong>Acil Durumlar Hakkında Yönetmelik</strong>'e 
                    uygun olarak oluşturuldu. İndirdiğiniz PDF'i işyerinizde görünür yerlere asabilir ve 
                    dijital ortamda paylaşabilirsiniz.
                  </p>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="border-primary/20">
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
                    <span className="text-muted-foreground">Sektör:</span>
                    <span className="font-semibold">{companyInfo.sektor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tehlike:</span>
                    <Badge variant={
                      companyInfo.tehlike_sinifi === "Çok Tehlikeli" ? "destructive" :
                      companyInfo.tehlike_sinifi === "Tehlikeli" ? "default" : "secondary"
                    }>
                      {companyInfo.tehlike_sinifi}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Çalışan:</span>
                    <span className="font-semibold">{companyInfo.calisan_sayisi} kişi</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Acil Durum Ekipleri
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">🧯 Söndürme:</span>
                    <Badge>{teams.sondurme.length} kişi</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">🚑 Kurtarma:</span>
                    <Badge>{teams.kurtarma.length} kişi</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">🛡️ Koruma:</span>
                    <Badge>{teams.koruma.length} kişi</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">🩹 İlk Yardım:</span>
                    <Badge>{teams.ilk_yardim.length} kişi</Badge>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <div className="flex justify-between font-semibold">
                      <span>Toplam:</span>
                      <span>{teams.sondurme.length + teams.kurtarma.length + teams.koruma.length + teams.ilk_yardim.length} kişi</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Flame className="h-5 w-5 text-primary" />
                    Seçili Senaryolar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {scenarios.filter(s => s.selected).map(s => (
                      <div key={s.id} className="flex items-center justify-between">
                        <span className="text-sm flex items-center gap-2">
                          <span>{s.icon}</span>
                          {s.name}
                        </span>
                        <Badge 
                          variant="outline"
                          className={
                            s.risk_level === "critical" ? "border-red-500 text-red-600" :
                            s.risk_level === "high" ? "border-orange-500 text-orange-600" :
                            "border-yellow-500 text-yellow-600"
                          }
                        >
                          {s.risk_level === "critical" ? "Kritik" :
                           s.risk_level === "high" ? "Yüksek" : "Orta"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Map className="h-5 w-5 text-primary" />
                    Tahliye Krokisi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {blueprintImage ? (
                      <>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-success" />
                          <span className="text-sm font-semibold text-success">Eklendi</span>
                        </div>
                        {blueprint.floor_count && (
                          <p className="text-xs text-muted-foreground">
                            {blueprint.floor_count} katlı bina
                          </p>
                        )}
                        {blueprint.emergency_exits && (
                          <p className="text-xs text-muted-foreground">
                            {blueprint.emergency_exits} acil çıkış
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-warning" />
                        <span className="text-sm font-semibold text-warning">Eklenmedi</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Phone className="h-5 w-5 text-primary" />
                    Acil Servisler
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {emergencyContacts.length > 0 ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-success" />
                          <span className="text-sm font-semibold text-success">
                            {emergencyContacts.length} iletişim
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-5 w-5 text-warning" />
                          <span className="text-sm font-semibold text-warning">Eklenmedi</span>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    Tatbikat Takvimi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {drillSchedule.length > 0 ? (
                      <>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-success" />
                          <span className="text-sm font-semibold text-success">
                            {drillSchedule.length} tatbikat planlandı
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          İlk tatbikat: {format(new Date(drillSchedule[0].date), 'dd MMM yyyy')}
                        </p>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-warning" />
                        <span className="text-sm font-semibold text-warning">Planlanmadı</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* QR Code Preview */}
            {qrCode && (
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-primary" />
                    Dijital ADEP Erişimi
                  </CardTitle>
                  <CardDescription>
                    PDF içindeki QR kodu okutarak planınıza dijital erişim sağlayabilirsiniz
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <img src={qrCode} alt="ADEP QR Code" className="w-48 h-48" />
                </CardContent>
              </Card>
            )}

            {/* Download Button */}
            <Button
              onClick={generateAndDownload}
              disabled={loading}
              className="w-full gap-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 h-16 text-lg font-bold shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  Profesyonel PDF Oluşturuluyor...
                </>
              ) : (
                <>
                  <Download className="h-6 w-6" />
                  ADEP'i İndir (Profesyonel PDF)
                </>
              )}
            </Button>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-100 space-y-2">
                  <p className="font-semibold">PDF İçeriği:</p>
                  <ul className="space-y-1 text-xs">
                    <li>✅ Firma bilgileri ve yetkili imza alanı</li>
                    <li>✅ Tüm ekip üyeleri (fotoğraflı)</li>
                    <li>✅ Detaylı senaryo prosedürleri</li>
                    <li>✅ Tahliye krokisi (varsa)</li>
                    <li>✅ Acil servis iletişim listesi</li>
                    <li>✅ Tatbikat takvimi</li>
                    <li>✅ Dijital erişim QR kodu</li>
                    <li>✅ Yasal mevzuat referansları</li>
                  </ul>
                </div>
              </div>
            </div>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-foreground flex items-center gap-3">
            🚨 ADEP Sihirbazı
          </h1>
          <p className="text-muted-foreground mt-2">
            6 adımda profesyonel, mevzuata uygun Acil Durum Eylem Planı oluşturun
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">{calculateProgress()}%</p>
          <p className="text-xs text-muted-foreground">Tamamlandı</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between overflow-x-auto pb-2">
        {[
          { num: 1, icon: Building2, label: "İşyeri" },
          { num: 2, icon: Users, label: "Ekipler" },
          { num: 3, icon: Flame, label: "Senaryolar" },
          { num: 4, icon: Map, label: "Kroki" },
          { num: 5, icon: Phone, label: "İletişim" },
          { num: 6, icon: FileText, label: "Önizleme" }
        ].map((step, idx) => (
          <div key={step.num} className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={() => goToStep(step.num)}
              className={`flex flex-col items-center justify-center min-w-[60px] h-16 rounded-xl border-2 transition-all ${
                currentStep === step.num
                  ? 'bg-primary border-primary text-white scale-105 shadow-lg'
                  : currentStep > step.num
                  ? 'bg-success border-success text-white'
                  : 'bg-secondary border-border text-muted-foreground hover:border-primary hover:scale-105'
              }`}
            >
              {currentStep > step.num ? (
                <CheckCircle2 className="h-7 w-7" />
              ) : (
                <step.icon className="h-7 w-7" />
              )}
              <span className="text-[10px] font-bold mt-1 hidden md:block">
                {step.label}
              </span>
            </button>
            {idx < 5 && (
              <div className={`flex-1 h-1 rounded min-w-[20px] ${
                currentStep > step.num ? 'bg-success' : 'bg-border'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <Card className="border-2 border-primary/20 shadow-xl">
        <CardHeader className="border-b border-border bg-gradient-to-r from-primary/5 to-blue-500/5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
              Adım {currentStep}/6: {
                currentStep === 1 ? "İşyeri Bilgileri" :
                currentStep === 2 ? "Acil Durum Ekipleri" :
                currentStep === 3 ? "Senaryo Seçimi" :
                currentStep === 4 ? "Tahliye Krokisi" :
                currentStep === 5 ? "Acil İletişim & Tatbikat" :
                "Önizleme & İndirme"
              }
            </CardTitle>
            <Badge variant="secondary">
              {Math.ceil((6 - currentStep) * 3)} dk kaldı
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="min-h-[500px] pt-6">
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => goToStep(currentStep - 1)}
          disabled={currentStep === 1}
          className="gap-2 h-12"
          size="lg"
        >
          <ChevronLeft className="h-5 w-5" />
          Geri
        </Button>

        {currentStep < 6 && (
          <Button
            onClick={() => goToStep(currentStep + 1)}
            className="gap-2 h-12"
            size="lg"
          >
            İleri
            <ChevronRight className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}