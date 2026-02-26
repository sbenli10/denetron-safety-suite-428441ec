import { useState } from "react";
import { 
  Brain, FileText, CheckCircle, Clock, AlertTriangle, 
  Download, Loader2, ShieldCheck, PlusCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { useNavigate } from "react-router-dom"; // Sayfa yönlendirmesi için

interface AiResult {
  riskScore: "Low" | "Medium" | "High";
  correctionPlan: string;
  justification: string;
  complianceScore: number;
  complianceNotes: string;
}

const riskColors: Record<string, string> = {
  Low: "bg-success/15 text-success",
  Medium: "bg-warning/15 text-warning",
  High: "bg-destructive/15 text-destructive",
};

export default function Reports() {
  const navigate = useNavigate();
  const [hazardInput, setHazardInput] = useState("");
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Yapay Zeka Analizi Fonksiyonu
  const analyzeHazard = async () => {
    if (!hazardInput.trim()) {
      toast.error("Lütfen önce bir tehlike açıklaması yazın.");
      return;
    }
    setLoading(true);
    setAiResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-hazard", {
        body: { hazardDescription: hazardInput.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      setAiResult(data as AiResult);
      toast.success("Yapay zeka analizi tamamlandı!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Analiz sırasında bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // DÖF Sayfasına Veri Gönderme Fonksiyonu (YENİ)
  const sendToCapa = () => {
    if (!aiResult) return;
    
    // Veriyi 'state' içinde DÖF (CAPA) sayfasına paslıyoruz
    navigate("/capa", { 
      state: { 
        aiData: {
          description: hazardInput,
          plan: aiResult.correctionPlan,
          justification: aiResult.justification,
          risk: aiResult.riskScore
        } 
      } 
    });
    
    toast.info("Veriler DÖF formuna aktarılıyor...");
  };

  const generatePDF = () => {
    if (!aiResult) return;
    const doc = new jsPDF();
    const now = new Date().toLocaleDateString();

    doc.setFontSize(18);
    doc.text("Denetron İSG Yönetim Sistemi", 20, 20);
    doc.setFontSize(14);
    doc.text("AI Tehlike Analiz Raporu", 20, 30);
    doc.setFontSize(10);
    doc.text(`Tarih: ${now}`, 20, 40);
    doc.line(20, 44, 190, 44);

    doc.setFontSize(12);
    doc.text("Tehlike Tanımı:", 20, 54);
    const hazardLines = doc.splitTextToSize(hazardInput, 170);
    doc.text(hazardLines, 20, 62);

    let y = 62 + hazardLines.length * 5 + 10;
    doc.text(`Risk Skoru: ${aiResult.riskScore}`, 20, y);
    y += 10;
    doc.text("Düzeltici Plan:", 20, y);
    y += 8;
    const planLines = doc.splitTextToSize(aiResult.correctionPlan, 170);
    doc.text(planLines, 20, y);

    doc.save(`isg-ai-rapor-${Date.now()}.pdf`);
    toast.success("PDF raporu indirildi!");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Raporları</h1>
          <p className="text-sm text-muted-foreground mt-1">Yapay zeka destekli otomatik saha analizleri</p>
        </div>
      </div>

      <div className="glass-card p-5 glow-primary space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg gradient-primary">
            <Brain className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">AI Tehlike Analizörü</h3>
            <p className="text-xs text-muted-foreground">Tehlikeyi tarif edin, AI size düzeltici plan ve risk skoru hazırlasın</p>
          </div>
        </div>

        <Textarea
          placeholder="Örn: Depo yükleme alanında forkliftlerin emniyet kemersiz kullanıldığı gözlemlendi. Yaya yolları ile forklift rotaları arasında bariyer bulunmuyor."
          value={hazardInput}
          onChange={(e) => setHazardInput(e.target.value)}
          className="min-h-[100px] bg-secondary/50 border-border/50"
        />

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={analyzeHazard}
            disabled={loading || !hazardInput.trim()}
            className="gap-2 gradient-primary border-0 text-foreground"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
            {loading ? "Analiz Ediliyor..." : "Tehlikeyi Analiz Et"}
          </Button>

          {aiResult && (
            <>
              <Button onClick={sendToCapa} variant="secondary" className="gap-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-blue-500/30">
                <PlusCircle className="h-4 w-4" />
                DÖF'e Aktar
              </Button>
              <Button onClick={generatePDF} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                PDF Raporu İndir
              </Button>
            </>
          )}
        </div>

        {aiResult && (
          <div className="space-y-4 pt-2 animate-fade-in">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${riskColors[aiResult.riskScore]}`}>
                <AlertTriangle className="h-4 w-4" />
                Risk: {aiResult.riskScore}
              </span>
              <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${
                aiResult.complianceScore >= 70 ? "bg-success/15 text-success" :
                aiResult.complianceScore >= 40 ? "bg-warning/15 text-warning" :
                "bg-destructive/15 text-destructive"
              }`}>
                <ShieldCheck className="h-4 w-4" />
                Mevzuat Uyumu: {aiResult.complianceScore}/100
              </span>
            </div>

            <div className="glass-card p-4 space-y-2">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                İSG Mevzuat Notları
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{aiResult.complianceNotes}</p>
            </div>

            <div className="glass-card p-4 space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Düzeltici Faaliyet Planı</h4>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {aiResult.correctionPlan}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}