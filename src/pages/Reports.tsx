import { useState, useEffect } from "react";
import { 
  Brain, FileText, CheckCircle, Clock, AlertTriangle, 
  Download, Loader2, ShieldCheck, PlusCircle, Trash2,
  Eye, Filter, Search, TrendingUp, BarChart3, Lightbulb,
  Upload, Image as ImageIcon, Sparkles, Copy, Share2, History, X, FileUp, Calculator, Gavel, Hammer, ArrowRight,Badge
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useNavigate } from "react-router-dom";
import * as pdfjsLib from 'pdfjs-dist';

// ✅ PDF.js worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// ✅ Yeni Fine-Kinney Analiz Yapısı
interface FineKinneyAiResult {
  hazardDescription: string;
  probability: number;
  frequency: number;
  severity: number;
  riskScore: number;
  riskLevel: "Kabul Edilebilir" | "Düşük" | "Önemli" | "Yüksek" | "Kritik";
  legalReference: string;
  immediateAction: string;
  preventiveAction: string;
  justification: string;
}

interface AnalysisHistory {
  id: string;
  user_id: string;
  hazard_description: string;
  ai_result: FineKinneyAiResult;
  risk_score: string; // Eski yapıyı bozmamak için string tutuyoruz ama içinde seviye yazacak
  created_at: string;
  updated_at: string;
}

const riskColors: Record<string, string> = {
  "Kabul Edilebilir": "bg-success/15 text-success border-success/30",
  "Düşük": "bg-success/20 text-success border-success/40",
  "Önemli": "bg-warning/15 text-warning border-warning/30",
  "Yüksek": "bg-orange-500/15 text-orange-500 border-orange-500/30",
  "Kritik": "bg-destructive/15 text-destructive border-destructive/30",
  // Eski veri uyumluluğu
  "Low": "bg-success/15 text-success border-success/30",
  "Medium": "bg-warning/15 text-warning border-warning/30",
  "High": "bg-destructive/15 text-destructive border-destructive/30",
};

const tips = [
  "💡 Spesifik ve detaylı tehlike açıklamalarını AI daha iyi analiz edebilir",
  "📷 Fotoğraf ekleyerek AI'ya görsel bilgi sağlayabilirsiniz",
  "📄 PDF/Word dosyası yükleyerek döküman analizi yapabilirsiniz",
  "🎯 Bağlamı netleştirin: 'Ne oldu?', 'Nerede?', 'Kimler etkilendi?'",
  "⚡ AI, doğrudan mevzuat atıfları ile çözüm sunar",
];

export default function Reports() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hazardInput, setHazardInput] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<FineKinneyAiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [history, setHistory] = useState<AnalysisHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [filterRisk, setFilterRisk] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [selectedHistory, setSelectedHistory] = useState<AnalysisHistory | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("hazard_analyses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setHistory((data as unknown as AnalysisHistory[]) || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ✅ PDF TEXT EXTRACT
  const extractPdfText = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(" ") + "\n";
      }

      return text;
    } catch (error) {
      console.error("PDF extract error:", error);
      throw new Error("PDF dosyası okunamadı");
    }
  };

  // �� WORD TEXT EXTRACT (docx)
  const extractWordText = async (file: File): Promise<string> => {
    try {
      const mammoth = await import("mammoth");
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (error) {
      console.error("Word extract error:", error);
      throw new Error("Word dosyası okunamadı");
    }
  };

  // ✅ FILE UPLOAD HANDLER
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files) return;

    const newFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png", "image/jpg"];
      
      if (!validTypes.includes(file.type)) {
        toast.error(`❌ ${file.name} - Desteklenmeyen dosya türü`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error(`❌ ${file.name} - Dosya boyutu 10MB'ı aşıyor`);
        continue;
      }

      newFiles.push(file);
    }

    setUploadedFiles([...uploadedFiles, ...newFiles]);
    if (newFiles.length > 0) {
      toast.success(`✅ ${newFiles.length} dosya yüklendi`);
    }
  };

  // ✅ EXTRACT ALL FILES
  const extractFilesContent = async (): Promise<string> => {
    let allContent = "";

    for (const file of uploadedFiles) {
      try {
        setExtracting(true);
        toast.info(`📄 ${file.name} okunuyor...`);

        let content = "";
        if (file.type === "application/pdf") {
          content = await extractPdfText(file);
        } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
          content = await extractWordText(file);
        } else if (file.type.startsWith("image/")) {
          content = `[Görsel eklendi: ${file.name}]`;
        }

        allContent += `\n--- ${file.name} ---\n${content}\n`;
      } catch (error: any) {
        toast.error(`❌ ${file.name} - ${error.message}`);
      }
    }

    return allContent;
  };

  // ✅ IMAGE UPLOAD (Önizleme İçin)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageUrl(event.target?.result as string);
        toast.success("📷 Fotoğraf eklendi");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Fotoğraf yüklenemedi");
    }
  };

  // ✅ ANALYZE HAZARD
  const analyzeHazard = async () => {
    if (!hazardInput.trim() && uploadedFiles.length === 0 && !imageUrl) {
      toast.error("Lütfen bir tehlike açıklaması yazın, dosya veya fotoğraf yükleyin");
      return;
    }

    setLoading(true);
    setAiResult(null);

    try {
      let analysisText = hazardInput;

      if (uploadedFiles.length > 0) {
        toast.info("📄 Dosyalar analiz ediliyor...");
        const fileContent = await extractFilesContent();
        analysisText = `${analysisText}\n\n--- YÜKLENEN DOSYALAR ---\n${fileContent}`;
      }

      const { data, error } = await supabase.functions.invoke("analyze-hazard", {
        body: { 
          hazardDescription: analysisText.trim(),
          imageUrl: imageUrl,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const resultData = data as FineKinneyAiResult;
      setAiResult(resultData);

      const { error: saveError } = await supabase
        .from("hazard_analyses")
        .insert({
          user_id: user?.id as string,
          hazard_description: resultData.hazardDescription || hazardInput.trim(),
          ai_result: resultData as any, 
          risk_score: resultData.riskLevel || "Unknown",
        });

      if (!saveError) {
        fetchHistory();
      }

      toast.success("✅ A Sınıfı Uzman Analizi tamamlandı!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Analiz sırasında hata oluştu");
    } finally {
      setLoading(false);
      setExtracting(false);
    }
  };

  const sendToCapa = (analysis: FineKinneyAiResult, description: string) => {
    navigate("/capa", {
      state: {
        aiData: {
          description: analysis.hazardDescription || description,
          plan: `[Anlık] ${analysis.immediateAction}\n\n[Kalıcı] ${analysis.preventiveAction}`,
          justification: `${analysis.justification}\nYasal Atıf: ${analysis.legalReference}`,
          risk: analysis.riskLevel,
        },
      },
    });
    toast.info("Veriler DÖF formuna aktarılıyor...");
  };

  const generatePDF = (analysis: FineKinneyAiResult, originalDescription: string) => {
    const doc = new jsPDF();
    const now = new Date().toLocaleDateString("tr-TR");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Denetron ISG Yonetim Sistemi", 20, 20);
    
    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text("A Sinifi Uzman Analiz Raporu (Fine-Kinney)", 20, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`Tarih: ${now}`, 20, 40);
    doc.line(20, 44, 190, 44);

    doc.setTextColor(0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Tespit Edilen Uygunsuzluk:", 20, 54);
    doc.setFont("helvetica", "normal");
    const hazardLines = doc.splitTextToSize(analysis.hazardDescription || originalDescription, 170);
    doc.text(hazardLines, 20, 62);

    let y = 62 + hazardLines.length * 6 + 5;

    // Risk Değerlendirmesi Tablosu
    doc.setFont("helvetica", "bold");
    doc.text("Risk Degerlendirmesi (Fine-Kinney)", 20, y);
    y += 8;
    
    doc.setFont("helvetica", "normal");
    doc.text(`Ihtimal (O): ${analysis.probability}`, 25, y);
    doc.text(`Frekans (F): ${analysis.frequency}`, 80, y);
    doc.text(`Siddet (S): ${analysis.severity}`, 135, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    const scoreColor = analysis.riskScore >= 400 ? [220,20,20] : analysis.riskScore >= 200 ? [255,140,0] : analysis.riskScore >= 70 ? [255,165,0] : [34,139,34];
    doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
    doc.text(`Risk Puani: ${analysis.riskScore} - Seviye: ${analysis.riskLevel}`, 25, y);
    doc.setTextColor(0);
    y += 12;

    doc.setFont("helvetica", "bold");
    doc.text("Yasal Atif (Mevzuat):", 20, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const refLines = doc.splitTextToSize(analysis.legalReference || "Belirtilmedi", 170);
    doc.text(refLines, 20, y);
    y += refLines.length * 6 + 5;

    doc.setFont("helvetica", "bold");
    doc.text("Anlik Duzeltici Aksiyon:", 20, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const immLines = doc.splitTextToSize(analysis.immediateAction || "-", 170);
    doc.text(immLines, 20, y);
    y += immLines.length * 6 + 5;

    doc.setFont("helvetica", "bold");
    doc.text("Kalici Onleyici Aksiyon:", 20, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const prevLines = doc.splitTextToSize(analysis.preventiveAction || "-", 170);
    doc.text(prevLines, 20, y);

    doc.save(`isg-uzman-rapor-${Date.now()}.pdf`);
    toast.success("✅ Rapor PDF olarak indirildi!");
  };

  const deleteAnalysis = async (id: string) => {
    if (!confirm("Bu analizi silmek istediğinize emin misiniz?")) return;

    try {
      const { error } = await supabase.from("hazard_analyses").delete().eq("id", id);
      if (error) throw error;

      setHistory(history.filter((h) => h.id !== id));
      setDetailsOpen(false);
      setSelectedHistory(null);
      toast.success("✅ Analiz silindi");
    } catch (error) {
      toast.error("❌ Analiz silinemedi");
    }
  };

  const filteredHistory = history.filter((item) => {
    const matchesRisk = filterRisk === "all" || item.risk_score === filterRisk;
    const matchesSearch = item.hazard_description.toLowerCase().includes(searchText.toLowerCase());
    return matchesRisk && matchesSearch;
  });

  const stats = {
    total: history.length,
    critical: history.filter((h) => ["Kritik", "Yüksek", "High"].includes(h.risk_score)).length,
    medium: history.filter((h) => ["Önemli", "Medium"].includes(h.risk_score)).length,
    low: history.filter((h) => ["Düşük", "Kabul Edilebilir", "Low"].includes(h.risk_score)).length,
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          🧠 AI İş Güvenliği Uzmanı (A Sınıfı)
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Fine-Kinney metodolojisine dayalı, yasal mevzuata uygun profesyonel risk analiz motoru.
        </p>
      </div>

      {/* STATISTICS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 border border-border/50 space-y-2">
          <p className="text-xs text-muted-foreground">Toplam Analiz</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="glass-card p-4 border border-destructive/30 bg-destructive/5 space-y-2">
          <p className="text-xs text-destructive">🔴 Kritik / Yüksek</p>
          <p className="text-2xl font-bold text-destructive">{stats.critical}</p>
        </div>
        <div className="glass-card p-4 border border-warning/30 bg-warning/5 space-y-2">
          <p className="text-xs text-warning">🟡 Önemli</p>
          <p className="text-2xl font-bold text-warning">{stats.medium}</p>
        </div>
        <div className="glass-card p-4 border border-success/30 bg-success/5 space-y-2">
          <p className="text-xs text-success">🟢 Düşük / Kabul Edilebilir</p>
          <p className="text-2xl font-bold text-success">{stats.low}</p>
        </div>
      </div>

      {/* AI ANALYZER SECTION */}
      <div className="glass-card p-6 border border-primary/20 space-y-4 shadow-sm shadow-primary/10">
        {/* TIPS */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-700 mb-2">Uzman İpuçları</p>
              <div className="space-y-1">
                {tips.map((tip, idx) => (
                  <p key={idx} className="text-xs text-blue-600">• {tip}</p>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* INPUT */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold mb-2 flex items-center gap-2">
              📝 Saha Gözlemi / Tehlike Bildirimi
            </Label>
            <Textarea
              placeholder="Sahada gördüğünüz uygunsuzluğu, lokasyonu ve etkilenen kişi sayısını belirtin..."
              value={hazardInput}
              onChange={(e) => setHazardInput(e.target.value)}
              className="min-h-[100px] bg-secondary/50 border-border/50 focus:border-primary/50 transition-colors"
            />
          </div>

          {/* FILE & IMAGE UPLOAD */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold mb-2 flex items-center gap-2">
                <FileUp className="h-4 w-4" /> Döküman Yükle
              </Label>
              <label className="block border-2 border-dashed border-border/50 rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors bg-secondary/20">
                <FileText className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-semibold">PDF veya Word</p>
                <input type="file" multiple accept=".pdf,.docx" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
            
            <div>
              <Label className="text-sm font-semibold mb-2 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> Fotoğraf Ekle
              </Label>
              <label className="block border-2 border-dashed border-border/50 rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors bg-secondary/20">
                <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-semibold">Görsel Yükle (JPG, PNG)</p>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* UPLOAD PREVIEWS */}
          {(uploadedFiles.length > 0 || imageUrl) && (
            <div className="p-3 bg-secondary/30 rounded-lg border border-border/50 flex flex-col gap-3">
              {imageUrl && (
                <div className="relative w-32 h-24 rounded overflow-hidden border border-border">
                  <img src={imageUrl} alt="Önizleme" className="w-full h-full object-cover" />
                  <button onClick={() => setImageUrl(null)} className="absolute top-1 right-1 bg-black/60 p-1 rounded hover:bg-black/80 text-white">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {uploadedFiles.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold">Seçilen Dosyalar:</p>
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <FileText className="h-3 w-3 text-primary" /> {file.name}
                      <button onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx))} className="text-destructive"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ANALYZE BUTTON */}
        <Button
          onClick={analyzeHazard}
          disabled={loading || extracting || (!hazardInput.trim() && uploadedFiles.length === 0 && !imageUrl)}
          className="w-full gap-2 gradient-primary border-0 text-white h-12 text-base font-semibold shadow-lg shadow-primary/20"
        >
          {loading || extracting ? (
            <><Loader2 className="h-5 w-5 animate-spin" /> {extracting ? "Dosyalar Okunuyor..." : "A Sınıfı Uzman Analiz Ediyor..."}</>
          ) : (
            <><Brain className="h-5 w-5" /> Riski Analiz Et (Fine-Kinney)</>
          )}
        </Button>

        {/* RESULT SECTION */}
        {aiResult && (
          <div className="space-y-6 pt-6 border-t border-border mt-6 animate-fade-in">
            {/* Fine Kinney Score Board */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="glass-card p-3 text-center border-border/50">
                <p className="text-xs text-muted-foreground">İhtimal</p>
                <p className="text-lg font-bold">{aiResult.probability}</p>
              </div>
              <div className="glass-card p-3 text-center border-border/50">
                <p className="text-xs text-muted-foreground">Frekans</p>
                <p className="text-lg font-bold">{aiResult.frequency}</p>
              </div>
              <div className="glass-card p-3 text-center border-border/50">
                <p className="text-xs text-muted-foreground">Şiddet</p>
                <p className="text-lg font-bold">{aiResult.severity}</p>
              </div>
              <div className="glass-card p-3 text-center col-span-2 md:col-span-2 flex flex-col justify-center bg-secondary/20">
                <p className="text-xs text-muted-foreground mb-1">Risk Puanı & Seviyesi</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-black">{aiResult.riskScore}</span>
                  <Badge className={riskColors[aiResult.riskLevel]}>{aiResult.riskLevel}</Badge>
                </div>
              </div>
            </div>

            {/* Analysis Details */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="glass-card p-5 border-border/50 space-y-3 md:col-span-2">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Teknik Tehlike Tanımı
                </h4>
                <p className="text-sm text-muted-foreground">{aiResult.hazardDescription}</p>
              </div>

              <div className="glass-card p-5 border-destructive/20 bg-destructive/5 space-y-3">
                <h4 className="text-sm font-bold text-destructive flex items-center gap-2">
                  <Hammer className="h-4 w-4" />
                  Anlık Düzeltici Aksiyon (Acil)
                </h4>
                <p className="text-sm text-foreground/80">{aiResult.immediateAction}</p>
              </div>

              <div className="glass-card p-5 border-success/20 bg-success/5 space-y-3">
                <h4 className="text-sm font-bold text-success flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Kalıcı Önleyici Aksiyon (Sistemsel)
                </h4>
                <p className="text-sm text-foreground/80">{aiResult.preventiveAction}</p>
              </div>

              <div className="glass-card p-5 border-border/50 space-y-3 md:col-span-2">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Gavel className="h-4 w-4 text-blue-500" />
                  İlgili Yasal Mevzuat
                </h4>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                    {aiResult.legalReference}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-2 border-t border-border/50 pt-2">
                  <strong>Gerekçe:</strong> {aiResult.justification}
                </p>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => sendToCapa(aiResult, hazardInput)} className="gap-2 bg-primary text-primary-foreground flex-1 sm:flex-none">
                <PlusCircle className="h-4 w-4" />
                DÖF Formu Oluştur
              </Button>
              <Button onClick={() => generatePDF(aiResult, hazardInput)} variant="outline" className="gap-2 flex-1 sm:flex-none">
                <Download className="h-4 w-4" />
                Resmi Rapor PDF
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* HISTORY SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Önceki Risk Değerlendirmeleri
          </h2>
        </div>

        {historyLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((item) => {
              const aiData = item.ai_result as FineKinneyAiResult;
              const isOldFormat = !aiData?.riskScore || typeof aiData.riskScore === 'string'; // Geriye dönük uyumluluk kontrolü

              return (
                <div key={item.id} className="glass-card p-4 border border-border/50 hover:border-primary/50 transition-all">
                  <div className="flex items-start justify-between gap-4 cursor-pointer" onClick={() => { setSelectedHistory(item); setDetailsOpen(selectedHistory?.id !== item.id ? true : !detailsOpen); }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {isOldFormat ? (
                          <Badge className={riskColors[item.risk_score] || riskColors["Low"]}>
                            {item.risk_score || "Bilinmiyor"}
                          </Badge>
                        ) : (
                          <>
                            <Badge className={riskColors[aiData.riskLevel]}>{aiData.riskLevel}</Badge>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-secondary">Skor: {aiData.riskScore}</span>
                          </>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString("tr-TR")}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground line-clamp-2">
                        {isOldFormat ? item.hazard_description : aiData.hazardDescription}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" className="text-muted-foreground" onClick={(e) => { e.stopPropagation(); deleteAnalysis(item.id); }}>
                        <Trash2 className="h-4 w-4 hover:text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {selectedHistory?.id === item.id && detailsOpen && (
                    <div className="mt-4 pt-4 border-t border-border space-y-3 animate-fade-in text-sm">
                      {isOldFormat ? (
                        <p className="text-muted-foreground">Eski formatlı analiz. Detaylar kısıtlıdır.</p>
                      ) : (
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <p className="font-semibold text-destructive mb-1 text-xs">Anlık Aksiyon</p>
                            <p className="text-muted-foreground">{aiData.immediateAction}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-success mb-1 text-xs">Kalıcı Aksiyon</p>
                            <p className="text-muted-foreground">{aiData.preventiveAction}</p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="font-semibold text-blue-500 mb-1 text-xs">Yasal Mevzuat</p>
                            <p className="text-muted-foreground">{aiData.legalReference}</p>
                          </div>
                          <Button size="sm" variant="secondary" className="w-full md:col-span-2 mt-2 gap-2" onClick={() => generatePDF(aiData, aiData.hazardDescription)}>
                            <Download className="h-4 w-4" /> Bu Raporu İndir
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}