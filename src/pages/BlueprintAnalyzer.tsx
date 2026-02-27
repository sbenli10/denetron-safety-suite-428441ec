import { useState } from "react";
import { Upload, Building2, Shield, AlertTriangle, CheckCircle2, Loader2, FileImage, Trash2, Download, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { addInterFontsToJsPDF } from "@/utils/fonts";
interface ProjectInfo {
  area_type: string;
  detected_floor: number;
  building_category: string;
  estimated_area_sqm: number;
}

interface Equipment {
  type: string;
  count: number;
  locations: string[];
  adequacy_status: "sufficient" | "insufficient" | "excessive";
}

interface Violation {
  issue: string;
  regulation_reference: string;
  severity: "critical" | "warning" | "info";
  recommended_action: string;
}

interface AnalysisResult {
  project_info: ProjectInfo;
  equipment_inventory: Equipment[];
  safety_violations: Violation[];
  expert_suggestions: string[];
  compliance_score: number;
}

const EQUIPMENT_ICONS: Record<string, string> = {
  extinguisher: "🧯",
  exit: "🚪",
  hydrant: "🚰",
  first_aid: "🩹",
  assembly_point: "🟢"
};

const EQUIPMENT_NAMES: Record<string, string> = {
  extinguisher: "Yangın Söndürme Tüpü",
  exit: "Acil Çıkış",
  hydrant: "Yangın Dolabı/Hidrant",
  first_aid: "İlk Yardım Dolabı",
  assembly_point: "Toplanma Alanı"
};

const LOADING_MESSAGES = [
  "Yapay zeka mimari planı tarıyor...",
  "Güvenlik ekipmanları tespit ediliyor...",
  "Mevzuat kontrolleri yapılıyor...",
  "Uyumsuzluklar analiz ediliyor...",
  "Sonuçlar hazırlanıyor..."
];

export default function BlueprintAnalyzer() {
  const { user } = useAuth();
  const [blueprintImage, setBlueprintImage] = useState<string>("");
  const [blueprintPreview, setBlueprintPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // ✅ Görsel sıkıştırma
  const compressImage = async (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Lütfen geçerli bir görsel dosyası seçin");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const original = event.target?.result as string;
      setBlueprintPreview(original);

      // Sıkıştır
      const compressed = await compressImage(original);
      setBlueprintImage(compressed);

      toast.success("✅ Kroki yüklendi");
    };
    reader.readAsDataURL(file);
  };

  const analyzeBlueprint = async () => {
    if (!blueprintImage) {
      toast.error("Lütfen bir kroki görseli yükleyin");
      return;
    }

    setLoading(true);
    setLoadingMessageIndex(0);
    setAnalysisResult(null);

    // ✅ Loading mesajları rotasyonu
    const messageInterval = setInterval(() => {
      setLoadingMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-blueprint", {
        body: { image: blueprintImage },
      });

      clearInterval(messageInterval);

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setAnalysisResult(data.analysis);

      // ✅ Veritabanına kaydet
      await supabase.from("blueprint_analyses").insert({
        user_id: user?.id,
        analysis_result: data.analysis,
        building_type: data.analysis.project_info.area_type,
        floor_number: data.analysis.project_info.detected_floor,
        area_sqm: data.analysis.project_info.estimated_area_sqm,
        image_size_kb: data.metadata.image_size_kb
      });

      toast.success(`✅ Analiz tamamlandı! Uygunluk: ${data.analysis.compliance_score}%`);

    } catch (e: any) {
      clearInterval(messageInterval);
      console.error(e);
      toast.error(`❌ Analiz hatası: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    if (!analysisResult) return;

    // 1. Yeni bir PDF dökümanı oluştur
    const doc = new jsPDF();
    
    // 2. ✅ Fontları PDF'in içine yükle
    addInterFontsToJsPDF(doc);
    
    // 3. ✅ Varsayılan fontu "Inter" yap
    doc.setFont("Inter", "normal");

    // BAŞLIK - Kalın font
    doc.setFont("Inter", "bold");
    doc.setFontSize(18);
    doc.text("Kroki Güvenlik Analiz Raporu", 20, 20);

    // BİNA BİLGİLERİ - Normal font
    doc.setFontSize(12);
    doc.setFont("Inter", "normal");
    doc.text(`Bina Tipi: ${analysisResult.project_info.building_category}`, 20, 35);
    doc.text(`Kat: ${analysisResult.project_info.detected_floor}`, 20, 42);
    doc.text(`Tahmini Alan: ${analysisResult.project_info.estimated_area_sqm} m²`, 20, 49);
    doc.text(`Genel Uygunluk: %${analysisResult.compliance_score}`, 20, 56);

    // EKİPMAN ENVANTERİ
    doc.setFont("Inter", "bold");
    doc.text("Tespit Edilen Ekipmanlar", 20, 70);
    
    let y = 78;
    doc.setFont("Inter", "normal");
    analysisResult.equipment_inventory.forEach(eq => {
        doc.text(`• ${EQUIPMENT_NAMES[eq.type]}: ${eq.count} adet`, 25, y);
        y += 7;
    });

    // UYUMSUZLUKLAR (Varsa)
    if (analysisResult.safety_violations.length > 0) {
        y += 5;
        doc.setFont("Inter", "bold");
        doc.text("Güvenlik Uyumsuzlukları", 20, y);
        y += 8;
        
        analysisResult.safety_violations.forEach(v => {
        doc.setFont("Inter", "normal");
        doc.setFontSize(10);
        const text = `${v.issue} (${v.regulation_reference})`;
        // Uzun metinler için satır kaydırma (wrapText)
        const lines = doc.splitTextToSize(text, 170);
        doc.text(lines, 25, y);
        y += (lines.length * 5) + 2;
        });
    }

    // 4. PDF'i kaydet
    doc.save(`denetron-kroki-analiz-${Date.now()}.pdf`);
    toast.success("✅ Türkçe karakter uyumlu rapor indirildi");
    };

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Building2 className="h-8 w-8 text-primary" />
          AI Kroki Okuyucu
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Teknik çizimleri, kat planlarını ve tahliye krokilerini yapay zeka ile analiz edin
        </p>
      </div>

      {/* UPLOAD SECTION */}
      <div className="glass-card p-6 border border-primary/20">
        <Label className="text-sm font-semibold mb-4 block">📐 Kroki/Plan Yükle</Label>

        {!blueprintPreview ? (
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 rounded-xl p-12 cursor-pointer transition-all">
            <FileImage className="h-16 w-16 text-primary mb-4" />
            <span className="text-lg font-semibold text-foreground">Kroki Görseli Seç</span>
            <span className="text-xs text-muted-foreground mt-2">CAD çizimi, el çizimi veya dijital plan</span>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload} 
              className="hidden"
            />
          </label>
        ) : (
          <div className="space-y-4">
            <div className="relative w-full h-64 rounded-xl overflow-hidden border-2 border-primary/30">
              <img 
                src={blueprintPreview} 
                alt="Kroki" 
                className="w-full h-full object-contain bg-slate-50"
              />
              <button 
                onClick={() => { setBlueprintPreview(""); setBlueprintImage(""); }}
                className="absolute top-2 right-2 bg-black/70 p-2 rounded-full text-white hover:bg-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <Button 
              onClick={analyzeBlueprint} 
              disabled={loading}
              className="w-full gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-14 text-lg font-bold"
            >
              {loading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  {LOADING_MESSAGES[loadingMessageIndex]}
                </>
              ) : (
                <>
                  <Shield className="h-6 w-6" />
                  Güvenlik Analizi Başlat
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* RESULTS SECTION */}
      {analysisResult && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* LEFT: Equipment Inventory */}
          <div className="glass-card p-6 border border-success/30">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-success" />
                Ekipman Envanteri
              </h3>
              <div className="text-3xl font-black text-success">
                {analysisResult.compliance_score}%
              </div>
            </div>

            <div className="space-y-4">
              {analysisResult.equipment_inventory.map((eq, idx) => (
                <div key={idx} className="p-4 bg-secondary/20 rounded-lg border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{EQUIPMENT_ICONS[eq.type]}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      eq.adequacy_status === 'sufficient' ? 'bg-success/20 text-success' :
                      eq.adequacy_status === 'insufficient' ? 'bg-destructive/20 text-destructive' :
                      'bg-warning/20 text-warning'
                    }`}>
                      {eq.count} adet
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-2">
                    {EQUIPMENT_NAMES[eq.type]}
                  </p>
                  <div className="space-y-1">
                    {eq.locations.map((loc, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                        <span>{loc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Violations */}
          <div className="glass-card p-6 border border-destructive/30">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-6">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              Güvenlik Uyumsuzlukları ({analysisResult.safety_violations.length})
            </h3>

            <div className="space-y-4">
              {analysisResult.safety_violations.length === 0 ? (
                <div className="text-center py-8 text-success">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3" />
                  <p className="font-semibold">Kritik uyumsuzluk tespit edilmedi!</p>
                </div>
              ) : (
                analysisResult.safety_violations.map((violation, idx) => (
                  <div key={idx} className={`p-4 rounded-lg border-2 ${
                    violation.severity === 'critical' ? 'bg-destructive/10 border-destructive/30' :
                    violation.severity === 'warning' ? 'bg-warning/10 border-warning/30' :
                    'bg-blue-500/10 border-blue-500/30'
                  }`}>
                    <div className="flex items-start gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        violation.severity === 'critical' ? 'bg-destructive text-white' :
                        violation.severity === 'warning' ? 'bg-warning text-white' :
                        'bg-blue-500 text-white'
                      }`}>
                        {violation.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="font-semibold text-sm text-foreground mb-2">
                      {violation.issue}
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      📜 {violation.regulation_reference}
                    </p>
                    <p className="text-xs text-foreground bg-background/50 p-2 rounded">
                      💡 {violation.recommended_action}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expert Suggestions */}
      {analysisResult && analysisResult.expert_suggestions.length > 0 && (
        <div className="glass-card p-6 border border-blue-500/30 bg-blue-500/5">
          <h3 className="text-lg font-bold text-blue-700 mb-4">💡 Uzman Önerileri</h3>
          <ul className="space-y-2">
            {analysisResult.expert_suggestions.map((suggestion, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                <span className="text-blue-600">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Export Button */}
      {analysisResult && (
        <Button onClick={exportPDF} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          PDF Rapor İndir
        </Button>
      )}
    </div>
  );
}