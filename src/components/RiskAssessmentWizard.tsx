import { useState, useRef } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Settings,
  BarChart3,
  FileText,
  Upload,
  X,
  Calendar,
  Loader2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import jsPDF from "jspdf";

type HazardLevel = "Az Tehlikeli" | "Tehlikeli" | "Çok Tehlikeli";

interface WizardStep {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface FormData {
  firmName: string;
  hazardLevel: HazardLevel;
  reportDate: string;
  validityDate: string;
  logo: string | null;
  observations: string;
  measures: string;
  risks: string;
  compliance: string;
}

const steps: WizardStep[] = [
  { id: "firma", label: "Firma Bilgileri", icon: <Building2 className="h-5 w-5" /> },
  { id: "yonetimi", label: "Yönetimi", icon: <Settings className="h-5 w-5" /> },
  { id: "risk", label: "Risk Esleme", icon: <BarChart3 className="h-5 w-5" /> },
  { id: "islemler", label: "İşlemler", icon: <CheckCircle2 className="h-5 w-5" /> },
  { id: "raporlar", label: "Raporlar", icon: <FileText className="h-5 w-5" /> },
  { id: "pdf", label: "Önizleme PDF", icon: <Download className="h-5 w-5" /> },
];

const hazardConfig: Record<
  HazardLevel,
  { color: string; years: number; icon: string }
> = {
  "Az Tehlikeli": { color: "bg-success/10 text-success", years: 6, icon: "🟢" },
  "Tehlikeli": { color: "bg-warning/10 text-warning", years: 4, icon: "🟡" },
  "Çok Tehlikeli": { color: "bg-destructive/10 text-destructive", years: 2, icon: "🔴" },
};

// ✅ UTF-8 CLEANING
const cleanUTF8 = (text: string): string => {
  return text
    .replace(/[^\w\s\-çğıöşüÇĞİÖŞÜ.,!?;:()]/g, "")
    .trim();
};

// ✅ CALCULATE VALIDITY DATE
const calculateValidityDate = (reportDate: string, hazardLevel: HazardLevel): string => {
  const date = new Date(reportDate);
  const years = hazardConfig[hazardLevel].years;
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString().split("T")[0];
};

export default function RiskAssessmentWizard() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    firmName: "",
    hazardLevel: "Tehlikeli",
    reportDate: new Date().toISOString().split("T")[0],
    validityDate: "",
    logo: null,
    observations: "",
    measures: "",
    risks: "",
    compliance: "",
  });

  // ✅ UPDATE VALIDITY DATE WHEN HAZARD LEVEL CHANGES
  const handleHazardLevelChange = (level: HazardLevel) => {
    setFormData((prev) => ({
      ...prev,
      hazardLevel: level,
      validityDate: calculateValidityDate(prev.reportDate, level),
    }));
  };

  // ✅ UPDATE VALIDITY DATE WHEN REPORT DATE CHANGES
  const handleReportDateChange = (date: string) => {
    setFormData((prev) => ({
      ...prev,
      reportDate: date,
      validityDate: calculateValidityDate(date, prev.hazardLevel),
    }));
  };

  // ✅ LOGO UPLOAD
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo boyutu 2MB'ı aşamaz");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData((prev) => ({
        ...prev,
        logo: event.target?.result as string,
      }));
      toast.success("📷 Logo yüklendi");
    };
    reader.readAsDataURL(file);
  };

  // ✅ GENERATE PDF PREVIEW
  const generatePDFPreview = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // ✅ COLOR BY HAZARD LEVEL
    let textColor: [number, number, number] = [51, 51, 51];
    if (formData.hazardLevel === "Az Tehlikeli") {
      textColor = [34, 139, 34]; // Green
    } else if (formData.hazardLevel === "Tehlikeli") {
      textColor = [255, 165, 0]; // Orange
    } else {
      textColor = [220, 20, 20]; // Red
    }

    // ✅ HEADER
    doc.setFontSize(20);
    doc.setTextColor(...textColor);
    doc.text("Risk Değerlendirme Raporu", pageWidth / 2, yPos, { align: "center" });
    yPos += 15;

    // ✅ COMPANY INFO
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Firma: ${cleanUTF8(formData.firmName)}`, 20, yPos);
    yPos += 8;

    doc.setTextColor(...textColor);
    doc.text(
      `Tehlike Sınıfı: ${hazardConfig[formData.hazardLevel].icon} ${formData.hazardLevel}`,
      20,
      yPos
    );
    yPos += 8;

    doc.setTextColor(0);
    doc.text(`Rapor Tarihi: ${formData.reportDate}`, 20, yPos);
    yPos += 8;
    doc.text(`Geçerlilik Tarihi: ${formData.validityDate}`, 20, yPos);
    yPos += 15;

    // ✅ SECTIONS
    const sections = [
      { title: "Gözlemler", content: formData.observations },
      { title: "Alınması Gereken Önlemler", content: formData.measures },
      { title: "Belirlenen Riskler", content: formData.risks },
      { title: "Mevzuat Uygunluğu", content: formData.compliance },
    ];

    doc.setFontSize(11);
    sections.forEach((section) => {
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
      }

      doc.setTextColor(...textColor);
      doc.text(`${section.title}:`, 20, yPos);
      yPos += 8;

      doc.setTextColor(0);
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(cleanUTF8(section.content) || "Belirtilmedi", 170);
      doc.text(lines, 20, yPos);
      yPos += lines.length * 5 + 10;
    });

    doc.save(`Risk_Raporu_${formData.firmName}_${Date.now()}.pdf`);
    toast.success("✅ PDF indirildi");
  };

  // ✅ SUBMIT TO SUPABASE
  const handleSubmit = async () => {
    if (!formData.firmName.trim()) {
      toast.error("Lütfen firma adını girin");
      return;
    }

    setSubmitting(true);

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.organization_id) {
        throw new Error("Organization not found");
      }

      // ✅ SAVE TO DATABASE
      const { error } = await supabase.from("inspections").insert({
        org_id: profile.organization_id,
        user_id: user?.id,
        location_name: cleanUTF8(formData.firmName),
        equipment_category: formData.hazardLevel,
        status: "completed",
        risk_level:
          formData.hazardLevel === "Az Tehlikeli"
            ? "low"
            : formData.hazardLevel === "Tehlikeli"
            ? "medium"
            : "high",
        answers: {
          observations: cleanUTF8(formData.observations),
          measures: cleanUTF8(formData.measures),
          risks: cleanUTF8(formData.risks),
          compliance: cleanUTF8(formData.compliance),
          logo: formData.logo,
          validityDate: formData.validityDate,
        },
        media_urls: formData.logo ? [formData.logo] : [],
        notes: `Risk Değerlendirme - ${formData.hazardLevel}`,
      });

      if (error) throw error;

      toast.success("✅ Risk Değerlendirmesi kaydedildi!");
      
      // Reset form
      setFormData({
        firmName: "",
        hazardLevel: "Tehlikeli",
        reportDate: new Date().toISOString().split("T")[0],
        validityDate: "",
        logo: null,
        observations: "",
        measures: "",
        risks: "",
        compliance: "",
      });
      setCurrentStep(0);
    } catch (error: any) {
      toast.error(error.message || "Kayıt başarısız");
    } finally {
      setSubmitting(false);
    }
  };

  const hazardCfg = hazardConfig[formData.hazardLevel];

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            📊 Risk Değerlendirme Sihirbazı
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Adım adım risk değerlendirme raporu oluşturun
          </p>
        </div>
      </div>

      {/* STEPPER */}
      <div className="glass-card p-6 border border-border/50">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex items-center flex-1">
              {/* CIRCLE */}
              <button
                onClick={() => setCurrentStep(idx)}
                className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
                  idx === currentStep
                    ? "gradient-primary border-primary text-white"
                    : idx < currentStep
                    ? "bg-success/20 border-success text-success"
                    : "bg-secondary border-border text-muted-foreground"
                }`}
              >
                {idx < currentStep ? <CheckCircle2 className="h-6 w-6" /> : step.icon}
              </button>

              {/* LINE */}
              {idx < steps.length - 1 && (
                <div
                  className={`h-1 flex-1 mx-2 transition-colors ${
                    idx < currentStep ? "bg-success" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* LABELS */}
        <div className="flex items-center justify-between text-xs font-semibold">
          {steps.map((step) => (
            <span key={step.id} className="text-center flex-1 text-muted-foreground">
              {step.label}
            </span>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="glass-card p-6 border border-border/50 space-y-6 min-h-[500px]">
        {/* STEP 1: FIRMA BİLGİLERİ */}
        {currentStep === 0 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Building2 className="h-6 w-6 text-primary" />
                Firma Bilgileri
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Raporu kullanmak için firma ve tarih bilgilerini seçin
              </p>
            </div>
            {/* FIRMA ADI */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Firma Adı *</Label>
              <Input
                placeholder="Firmanızın adını girin"
                value={formData.firmName}
                onChange={(e) => setFormData((prev) => ({ ...prev, firmName: e.target.value }))}
                className="bg-secondary/50 h-11"
              />
            </div>

            {/* GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* RAPOR TARİHİ */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Rapor Tarihi *
                </Label>
                <Input
                  type="date"
                  value={formData.reportDate}
                  onChange={(e) => handleReportDateChange(e.target.value)}
                  className="bg-secondary/50 h-11"
                />
              </div>

              {/* GEÇERLİLİK TARİHİ */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Geçerlilik Tarihi (Otomatik hesaplanır)
                </Label>
                <Input
                  type="date"
                  value={formData.validityDate}
                  disabled
                  className="bg-secondary/50 h-11 opacity-60 cursor-not-allowed"
                />
              </div>
            </div>

            {/* TEHLİKE SINIFI */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Tehlike Sınıfı *</Label>
              <Select value={formData.hazardLevel} onValueChange={handleHazardLevelChange}>
                <SelectTrigger className="bg-secondary/50 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectItem value="Az Tehlikeli">🟢 Az Tehlikeli</SelectItem>
                  <SelectItem value="Tehlikeli">🟡 Tehlikeli</SelectItem>
                  <SelectItem value="Çok Tehlikeli">🔴 Çok Tehlikeli</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                ℹ️ Geçerlilik Tarihi: +{hazardCfg.years} yıl
              </p>
            </div>

            {/* LOGO UPLOAD */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Firma Logosu (Opsiyonel)</Label>
              {formData.logo ? (
                <div className="relative w-full h-40 rounded-lg border border-border/50 overflow-hidden">
                  <img src={formData.logo} alt="Logo" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setFormData((prev) => ({ ...prev, logo: null }))}
                    className="absolute top-2 right-2 bg-destructive p-1.5 rounded hover:bg-destructive/80"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              ) : (
                <label className="block border-2 border-dashed border-border/50 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground">Logo yüklemeleri, göz İtilateleri</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, SVG</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* INFO */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm text-blue-700">
              <p className="font-semibold mb-2">ℹ️ Geçerlilik Periyodu:</p>
              <ul className="space-y-1 text-xs">
                <li>• 🟢 Az Tehlikeli: +6 yıl</li>
                <li>• 🟡 Tehlikeli: +4 yıl</li>
                <li>• 🔴 Çok Tehlikeli: +2 yıl</li>
              </ul>
            </div>
          </div>
        )}

        {/* STEP 2: YÖNETİMİ */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-foreground">Yönetim Uygulamaları</h2>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Gözlemler</Label>
              <textarea
                placeholder="Yapılan gözlemleri yazın..."
                value={formData.observations}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, observations: e.target.value }))
                }
                rows={4}
                className="w-full bg-secondary/50 border border-border/50 rounded-lg p-3 text-sm"
              />
            </div>
          </div>
        )}

        {/* STEP 3: RİSK ESLEME */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-foreground">Risk Esleme</h2>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Belirlenen Riskler</Label>
              <textarea
                placeholder="Tespit edilen riskleri yazın..."
                value={formData.risks}
                onChange={(e) => setFormData((prev) => ({ ...prev, risks: e.target.value }))}
                rows={4}
                className="w-full bg-secondary/50 border border-border/50 rounded-lg p-3 text-sm"
              />
            </div>
          </div>
        )}

        {/* STEP 4: İŞLEMLER */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-foreground">Alınacak İşlemler</h2>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Alınması Gereken Önlemler</Label>
              <textarea
                placeholder="Önerilen önlemleri yazın..."
                value={formData.measures}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, measures: e.target.value }))
                }
                rows={4}
                className="w-full bg-secondary/50 border border-border/50 rounded-lg p-3 text-sm"
              />
            </div>
          </div>
        )}

        {/* STEP 5: RAPORLAR */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-foreground">Mevzuat Uygunluğu</h2>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Mevzuat Uygunluğu Notları</Label>
              <textarea
                placeholder="İlgili mevzuat ve uygunluk durumu hakkında bilgi verin..."
                value={formData.compliance}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, compliance: e.target.value }))
                }
                rows={4}
                className="w-full bg-secondary/50 border border-border/50 rounded-lg p-3 text-sm"
              />
            </div>
          </div>
        )}

        {/* STEP 6: PDF PREVIEW */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-foreground">Önizleme ve PDF</h2>

            {/* SUMMARY */}
            <div className={`p-4 rounded-lg border ${hazardCfg.color}`}>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Firma:</strong> {formData.firmName}
                </p>
                <p>
                  <strong>Tehlike Sınıfı:</strong> {hazardCfg.icon} {formData.hazardLevel}
                </p>
                <p>
                  <strong>Rapor Tarihi:</strong> {formData.reportDate}
                </p>
                <p>
                  <strong>Geçerlilik Tarihi:</strong> {formData.validityDate}
                </p>
              </div>
            </div>

            {/* CONTENT PREVIEW */}
            <div className="space-y-4 text-sm">
              {formData.observations && (
                <div className="p-3 bg-secondary/50 rounded">
                  <p className="font-semibold mb-1">📝 Gözlemler:</p>
                  <p className="text-muted-foreground">{formData.observations}</p>
                </div>
              )}
              {formData.risks && (
                <div className="p-3 bg-secondary/50 rounded">
                  <p className="font-semibold mb-1">⚠️ Riskler:</p>
                  <p className="text-muted-foreground">{formData.risks}</p>
                </div>
              )}
              {formData.measures && (
                <div className="p-3 bg-secondary/50 rounded">
                  <p className="font-semibold mb-1">✅ Önlemler:</p>
                  <p className="text-muted-foreground">{formData.measures}</p>
                </div>
              )}
              {formData.compliance && (
                <div className="p-3 bg-secondary/50 rounded">
                  <p className="font-semibold mb-1">⚖️ Mevzuat Uygunluğu:</p>
                  <p className="text-muted-foreground">{formData.compliance}</p>
                </div>
              )}
            </div>

            {/* PDF DOWNLOAD */}
            <Button
              onClick={generatePDFPreview}
              className="w-full gap-2 gradient-primary border-0 text-foreground"
            >
              <Download className="h-4 w-4" />
              📥 PDF İndir
            </Button>
          </div>
        )}

        {/* PROGRESS */}
        <div className="text-xs text-muted-foreground text-center pt-4 border-t border-border">
          {currentStep + 1} / {steps.length}
        </div>
      </div>

      {/* BUTTONS */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Geri
        </Button>

        <Button
          onClick={
            currentStep === steps.length - 1
              ? handleSubmit
              : () => setCurrentStep(currentStep + 1)
          }
          disabled={submitting}
          className="flex-1 gap-2 gradient-primary border-0 text-foreground"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Kaydediliyor...
            </>
          ) : currentStep === steps.length - 1 ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Kaydet ve Tamamla
            </>
          ) : (
            <>
              İleri
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}