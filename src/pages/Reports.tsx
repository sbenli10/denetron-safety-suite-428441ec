import { useState, useEffect } from "react";
import { 
  Brain, FileText, CheckCircle, Clock, AlertTriangle, 
  Download, Loader2, ShieldCheck, PlusCircle, Trash2,
  Eye, Filter, Search, TrendingUp, BarChart3, Lightbulb,
  Upload, Image as ImageIcon, Sparkles, Copy, Share2, History, X, FileUp
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
import mammoth from 'mammoth';

// ✅ PDF.js worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface AiResult {
  riskScore: "Low" | "Medium" | "High";
  correctionPlan: string;
  justification: string;
  complianceScore: number;
  complianceNotes: string;
}

interface AnalysisHistory {
  id: string;
  user_id: string;
  hazard_description: string;
  ai_result: Record<string, any>;
  risk_score: "Low" | "Medium" | "High" | null;
  created_at: string;
  updated_at: string;
}

const riskColors: Record<string, string> = {
  Low: "bg-success/15 text-success border-success/30",
  Medium: "bg-warning/15 text-warning border-warning/30",
  High: "bg-destructive/15 text-destructive border-destructive/30",
};

const tips = [
  "💡 Spesifik ve detaylı tehlike açıklamalarını AI daha iyi analiz edebilir",
  "📷 Fotoğraf ekleyerek AI'ya görsel bilgi sağlayabilirsiniz",
  "📄 PDF/Word dosyası yükleyerek döküman analizi yapabilirsiniz",
  "🎯 Bağlamı netleştirin: 'Ne oldu?', 'Nerede?', 'Kimler etkilendi?'",
  "⚡ AI, mevzuat uyumunu otomatik kontrol eder",
];

export default function Reports() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hazardInput, setHazardInput] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
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

  // ✅ WORD TEXT EXTRACT (docx)
  const extractWordText = async (file: File): Promise<string> => {
    try {
      // ✅ DÜZELTME: Mammoth'u dinamik olarak import et ve extractRawText kullan
      const mammoth = await import("mammoth");
      const arrayBuffer = await file.arrayBuffer();
      
      // Mammoth'ta 'read' yerine genellikle 'extractRawText' kullanılır
      const result = await mammoth.extractRawText({ arrayBuffer });
      
      return result.value; // Word içindeki ham metni döner
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
          // Resimler base64 olarak zaten var
          content = `[Görsel: ${file.name}]`;
        }

        allContent += `\n--- ${file.name} ---\n${content}\n`;
      } catch (error: any) {
        toast.error(`❌ ${file.name} - ${error.message}`);
      }
    }

    return allContent;
  };

  // ✅ IMAGE UPLOAD
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageUrl(event.target?.result as string);
        toast.success("📷 Fotoğraf yüklendi");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Fotoğraf yüklenemedi");
    }
  };

  // ✅ ANALYZE HAZARD
  const analyzeHazard = async () => {
    if (!hazardInput.trim() && uploadedFiles.length === 0) {
      toast.error("Lütfen bir tehlike açıklaması yazın veya dosya yükleyin");
      return;
    }

    setLoading(true);
    setAiResult(null);

    try {
      let analysisText = hazardInput;

      // ✅ EXTRACT FILES IF ANY
      if (uploadedFiles.length > 0) {
        toast.info("📄 Dosyalar analiz ediliyor...");
        const fileContent = await extractFilesContent();
        analysisText = `${analysisText}\n\n--- YÜKLENEN DOSYALAR ---\n${fileContent}`;
      }

      const { data, error } = await supabase.functions.invoke("analyze-hazard", {
        body: { 
          hazardDescription: analysisText.trim(),
          imageUrl: imageUrl,
          fileCount: uploadedFiles.length,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setAiResult(data as AiResult);

      const { error: saveError } = await supabase
        .from("hazard_analyses")
        .insert({
          user_id: user?.id,
          hazard_description: hazardInput.trim(),
          ai_result: data,
          risk_score: data.riskScore,
        });

      if (!saveError) {
        fetchHistory();
      }

      toast.success("✅ AI Analizi tamamlandı!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Analiz sırasında hata oluştu");
    } finally {
      setLoading(false);
      setExtracting(false);
    }
  };

  const sendToCapa = (analysis: Record<string, any>, description: string) => {
    navigate("/capa", {
      state: {
        aiData: {
          description: description,
          plan: analysis.correctionPlan,
          justification: analysis.justification,
          risk: analysis.riskScore,
        },
      },
    });
    toast.info("Veriler DÖF formuna aktarılıyor...");
  };

  const generatePDF = (analysis: Record<string, any>, description: string) => {
    const doc = new jsPDF();
    const now = new Date().toLocaleDateString("tr-TR");

    doc.setFontSize(18);
    doc.text("Denetron İSG Yönetim Sistemi", 20, 20);
    doc.setFontSize(14);
    doc.text("AI Tehlike Analiz Raporu", 20, 30);
    doc.setFontSize(10);
    doc.text(`Tarih: ${now}`, 20, 40);
    doc.line(20, 44, 190, 44);

    doc.setFontSize(12);
    doc.text("Tehlike Tanımı:", 20, 54);
    const hazardLines = doc.splitTextToSize(description, 170);
    doc.text(hazardLines, 20, 62);

    let y = 62 + hazardLines.length * 5 + 10;

    const riskScore = analysis.riskScore || "Unknown";
    
    if (riskScore === "High") {
      doc.setTextColor(220, 20, 20);
    } else if (riskScore === "Medium") {
      doc.setTextColor(255, 165, 0);
    } else {
      doc.setTextColor(34, 139, 34);
    }
    
    doc.text(`Risk Skoru: ${riskScore}`, 20, y);
    doc.setTextColor(0, 0, 0);
    y += 10;

    const compliance = analysis.complianceScore || 0;
    doc.text(`Mevzuat Uyumu: %${compliance}`, 20, y);
    y += 10;

    doc.text("Düzeltici Plan:", 20, y);
    y += 8;
    const planLines = doc.splitTextToSize(analysis.correctionPlan || "Plan bulunmamaktadır", 170);
    doc.text(planLines, 20, y);

    doc.save(`isg-ai-rapor-${Date.now()}.pdf`);
    toast.success("✅ PDF indirildi!");
  };

  const deleteAnalysis = async (id: string) => {
    if (!confirm("Bu analizi silmek istediğinize emin misiniz?")) return;

    try {
      const { error } = await supabase
        .from("hazard_analyses")
        .delete()
        .eq("id", id);

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
    const matchesSearch = item.hazard_description
      .toLowerCase()
      .includes(searchText.toLowerCase());
    return matchesRisk && matchesSearch;
  });

  const stats = {
    total: history.length,
    high: history.filter((h) => h.risk_score === "High").length,
    medium: history.filter((h) => h.risk_score === "Medium").length,
    low: history.filter((h) => h.risk_score === "Low").length,
    avgCompliance: history.length > 0
      ? Math.round(
          history.reduce((sum, h) => {
            const compliance = (h.ai_result?.complianceScore || 0) as number;
            return sum + compliance;
          }, 0) / history.length
        )
      : 0,
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          🧠 AI Tehlike Analizi
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Yapay zeka destekli otomatik saha analizleri • Fotoğraf, PDF, Word analizi
        </p>
      </div>

      {/* STATISTICS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-card p-4 border border-border/50 space-y-2">
          <p className="text-xs text-muted-foreground">Toplam Analiz</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="glass-card p-4 border border-destructive/30 bg-destructive/5 space-y-2">
          <p className="text-xs text-destructive">🔴 Yüksek Risk</p>
          <p className="text-2xl font-bold text-destructive">{stats.high}</p>
        </div>
        <div className="glass-card p-4 border border-warning/30 bg-warning/5 space-y-2">
          <p className="text-xs text-warning">🟡 Orta Risk</p>
          <p className="text-2xl font-bold text-warning">{stats.medium}</p>
        </div>
        <div className="glass-card p-4 border border-success/30 bg-success/5 space-y-2">
          <p className="text-xs text-success">🟢 Düşük Risk</p>
          <p className="text-2xl font-bold text-success">{stats.low}</p>
        </div>
        <div className="glass-card p-4 border border-blue-500/30 bg-blue-500/5 space-y-2">
          <p className="text-xs text-blue-600">⚖️ Ort. Uyum</p>
          <p className="text-2xl font-bold text-blue-600">%{stats.avgCompliance}</p>
        </div>
      </div>

      {/* AI ANALYZER SECTION */}
      <div className="glass-card p-6 border border-primary/20 space-y-4">
        {/* TIPS */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-2">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-700 mb-2">💡 AI'yı En İyi Kullanma İpuçları</p>
              <div className="space-y-1">
                {tips.map((tip, idx) => (
                  <p key={idx} className="text-xs text-blue-600">• {tip}</p>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* HEADER */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg gradient-primary">
            <Brain className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">🤖 AI Analiz Motoru</h3>
            <p className="text-xs text-muted-foreground">
              Metin, Fotoğraf, PDF veya Word - AI hepsini analiz edebilir
            </p>
          </div>
        </div>

        {/* INPUT */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold mb-2 flex items-center gap-2">
              📝 Tehlike Açıklaması *
            </Label>
            <Textarea
              placeholder="Örn: Depo yükleme alanında forkliftlerin emniyet kemersiz kullanıldığı gözlemlendi..."
              value={hazardInput}
              onChange={(e) => setHazardInput(e.target.value)}
              className="min-h-[100px] bg-secondary/50 border-border/50"
            />
            <p className="text-xs text-muted-foreground mt-1">
              ✏️ {hazardInput.length} karakter
            </p>
          </div>

          {/* FILE UPLOAD - PDF/WORD/IMAGE */}
          <div>
            <Label className="text-sm font-semibold mb-2 flex items-center gap-2">
              <FileUp className="h-4 w-4" />
              Dosya Yükle (PDF, Word, Fotoğraf)
            </Label>
            <label className="block border-2 border-dashed border-border/50 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors">
              <div className="space-y-2">
                <div className="flex justify-center gap-3">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground">Dosya Yükle</p>
                <p className="text-xs text-muted-foreground">PDF, Word (.docx), Fotoğraf (JPG, PNG) - Max 10MB</p>
              </div>
              <input
                type="file"
                multiple
                accept=".pdf,.docx,image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* UPLOADED FILES LIST */}
            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">📁 Yüklenen Dosyalar:</p>
                <div className="space-y-1">
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-secondary/50 rounded">
                      <span className="text-xs text-foreground">{file.name}</span>
                      <button
                        onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx))}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* IMAGE DIRECT UPLOAD */}
          {imageUrl && (
            <div>
              <Label className="text-sm font-semibold mb-2">📷 Fotoğraf Önizlemesi</Label>
              <div className="relative w-full h-40 rounded-lg overflow-hidden border border-border/50">
                <img src={imageUrl} alt="Yüklenen" className="w-full h-full object-cover" />
                <button
                  onClick={() => setImageUrl(null)}
                  className="absolute top-2 right-2 bg-destructive p-1.5 rounded hover:bg-destructive/80"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ANALYZE BUTTON */}
        <Button
          onClick={analyzeHazard}
          disabled={loading || extracting || (!hazardInput.trim() && uploadedFiles.length === 0)}
          className="w-full gap-2 gradient-primary border-0 text-foreground h-11 text-base"
        >
          {loading || extracting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              {extracting ? "Dosyalar Okunuyor..." : "Analiz Ediliyor..."}
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              🤖 AI ile Analiz Et
            </>
          )}
        </Button>

        {/* RESULT */}
        {aiResult && (
          <div className="space-y-4 pt-4 border-t border-border animate-fade-in">
            {/* BADGES */}
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-full border ${riskColors[aiResult.riskScore] || riskColors["Low"]}`}>
                <AlertTriangle className="h-4 w-4" />
                Risk: {aiResult.riskScore || "Unknown"}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-full border ${
                  (aiResult.complianceScore || 0) >= 70
                    ? "bg-success/15 text-success border-success/30"
                    : (aiResult.complianceScore || 0) >= 40
                    ? "bg-warning/15 text-warning border-warning/30"
                    : "bg-destructive/15 text-destructive border-destructive/30"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                Mevzuat Uyumu: %{aiResult.complianceScore || 0}
              </span>
            </div>

            {/* GRID */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="glass-card p-4 border border-border/50 space-y-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  ⚖️ Mevzuat & Uyum
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {aiResult.complianceNotes || "Mevzuat bilgisi bulunmamaktadır"}
                </p>
              </div>

              <div className="glass-card p-4 border border-border/50 space-y-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  📋 Düzeltici Plan
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-4">
                  {aiResult.correctionPlan || "Plan bilgisi bulunmamaktadır"}
                </p>
              </div>

              <div className="glass-card p-4 border border-border/50 space-y-2 md:col-span-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  💬 Gerekçe & Açıklama
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {aiResult.justification || "Gerekçe bilgisi bulunmamaktadır"}
                </p>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                onClick={() => sendToCapa(aiResult, hazardInput)}
                variant="secondary"
                className="gap-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-blue-500/30"
              >
                <PlusCircle className="h-4 w-4" />
                DÖF'e Aktar
              </Button>
              <Button
                onClick={() => generatePDF(aiResult, hazardInput)}
                variant="outline"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                PDF İndir
              </Button>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(hazardInput);
                  toast.success("Kopyalandı");
                }}
                variant="outline"
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Kopyala
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* HISTORY SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <History className="h-5 w-5" />
            📊 Analiz Geçmişi
          </h2>
          <span className="text-sm text-muted-foreground">{filteredHistory.length} analiz</span>
        </div>

        {/* FILTERS */}
        <div className="glass-card p-4 border border-border/50 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Search className="h-4 w-4" />
                Ara
              </Label>
              <Input
                placeholder="Tehlike açıklamasında ara..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="bg-secondary/50 border-border/50 h-11"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Risk Düzeyi
              </Label>
              <Select value={filterRisk} onValueChange={setFilterRisk}>
                <SelectTrigger className="bg-secondary/50 border-border/50 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="High">🔴 Yüksek Risk</SelectItem>
                  <SelectItem value="Medium">🟡 Orta Risk</SelectItem>
                  <SelectItem value="Low">🟢 Düşük Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* LIST */}
        {historyLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Analizler yükleniyor...</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="glass-card p-12 border border-border/50 text-center space-y-4">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
            <p className="text-muted-foreground">Henüz analiz yapılmamış</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedHistory(item);
                  setDetailsOpen(true);
                }}
                className="glass-card p-4 border border-border/50 hover:border-primary/50 cursor-pointer transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full border ${
                        item.risk_score ? riskColors[item.risk_score] : riskColors["Low"]
                      }`}>
                        <AlertTriangle className="h-3 w-3" />
                        {item.risk_score || "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        %{(item.ai_result?.complianceScore || 0)} Uyum
                      </span>
                      <span className="text-xs text-muted-foreground">
                        📅 {new Date(item.created_at).toLocaleDateString("tr-TR")}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {item.hazard_description}
                    </p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        generatePDF(item.ai_result, item.hazard_description);
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        sendToCapa(item.ai_result, item.hazard_description);
                      }}
                    >
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAnalysis(item.id);
                      }}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {selectedHistory?.id === item.id && detailsOpen && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3 animate-fade-in">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2">Düzeltici Plan</h4>
                        <p className="text-sm text-foreground whitespace-pre-line">
                          {(item.ai_result?.correctionPlan || "Plan bulunmamaktadır")}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2">Mevzuat Notları</h4>
                        <p className="text-sm text-foreground">
                          {(item.ai_result?.complianceNotes || "Notlar bulunmamaktadır")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}