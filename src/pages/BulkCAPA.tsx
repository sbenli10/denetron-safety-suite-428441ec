import { useState, useCallback } from "react";
import {
  ShieldPlus,
  Plus,
  Trash2,
  Brain,
  Loader2,
  Download,
  Send,
  Mail,
  AlertTriangle,
  Calculator,
  Edit2,
  Check,
  AlertCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

// Fine-Kinney seçenekleri (Türkçeleştirilmiş)
const probOpts = [
  { v: 0.1, l: "0.1 — Neredeyse İmkansız" },
  { v: 0.2, l: "0.2 — Pratik Olarak İmkansız" },
  { v: 0.5, l: "0.5 — Düşük İhtimal" },
  { v: 1, l: "1 — Olası Değil Ama Mümkün" },
  { v: 3, l: "3 — Olağandışı" },
  { v: 6, l: "6 — Oldukça Olası" },
  { v: 10, l: "10 — Beklenen" },
];

const sevOpts = [
  { v: 1, l: "1 — Hafif" },
  { v: 3, l: "3 — Önemli" },
  { v: 7, l: "7 — Ciddi" },
  { v: 15, l: "15 — Tek Ölüm" },
  { v: 40, l: "40 — Çoklu Ölüm" },
  { v: 100, l: "100 — Felaket" },
];

const freqOpts = [
  { v: 0.5, l: "0.5 — Yıllık" },
  { v: 1, l: "1 — Yılda Birkaç Kez" },
  { v: 2, l: "2 — Aylık" },
  { v: 3, l: "3 — Haftalık" },
  { v: 6, l: "6 — Günlük" },
  { v: 10, l: "10 — Saatlik" },
];

function fkLevel(score: number) {
  if (score <= 20) return { label: "Kabul Edilebilir", cls: "bg-success/15 text-success" };
  if (score <= 70) return { label: "Olası", cls: "bg-blue-500/15 text-blue-400" };
  if (score <= 200) return { label: "Önemli", cls: "bg-warning/15 text-warning" };
  if (score <= 400) return { label: "Yüksek", cls: "bg-orange-500/15 text-orange-400" };
  return { label: "Kritik", cls: "bg-destructive/15 text-destructive" };
}

interface HazardEntry {
  localId: string;
  description: string;
  correctionPlan: string;
  riskScore: string;
  justification: string;
  fkP: number;
  fkS: number;
  fkF: number;
  fkValue: number;
  fkLevel: string;
  aiWarning?: string; // ✅ AI uyarı mesajı
}

export default function BulkCAPA() {
  const { user } = useAuth();
  const [siteName, setSiteName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [entries, setEntries] = useState<HazardEntry[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [sending, setSending] = useState(false);

  const [desc, setDesc] = useState("");
  const [fkP, setFkP] = useState("");
  const [fkS, setFkS] = useState("");
  const [fkF, setFkF] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  // 🤖 AI Analiz & Fine-Kinney Senkronizasyonu
  const analyzeAndAdd = async () => {
    if (!desc.trim()) {
      toast.error("Bulguyu açıklayın.");
      return;
    }
    if (!fkP || !fkS || !fkF) {
      toast.error("Tüm Fine-Kinney faktörlerini seçin.");
      return;
    }

    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-hazard", {
        body: { hazardDescription: desc.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const p = parseFloat(fkP);
      const s = parseFloat(fkS);
      const f = parseFloat(fkF);
      const fkVal = p * s * f;
      const fkLevelData = fkLevel(fkVal);

      // 🚨 AI vs Fine-Kinney uyarısı
      let aiWarning: string | undefined;
      const aiRiskLower = data.riskScore?.toLowerCase();
      const fkLevelLower = fkLevelData.label.toLowerCase();

      if (
        (fkLevelLower === "kritik" || fkLevelLower === "yüksek") &&
        (aiRiskLower === "low" || aiRiskLower === "düşük")
      ) {
        aiWarning = `⚠️ Uyarı: Fine-Kinney skoru '${fkLevelData.label}' (${fkVal.toFixed(1)}) ama AI 'Düşük' risk tespit etti. Bulgyu kontrol edin!`;
        toast.warning(aiWarning);
      }

      const entry: HazardEntry = {
        localId: crypto.randomUUID(),
        description: desc.trim(),
        correctionPlan: data.correctionPlan,
        riskScore: data.riskScore,
        justification: data.justification,
        fkP: p,
        fkS: s,
        fkF: f,
        fkValue: fkVal,
        fkLevel: fkLevelData.label,
        aiWarning,
      };

      setEntries((prev) => [...prev, entry]);
      setDesc("");
      setFkP("");
      setFkS("");
      setFkF("");
      toast.success("Bulgu listeye eklendi!");
    } catch (e: any) {
      toast.error(e.message || "AI analizi başarısız.");
      console.error("AI Error:", e);
    } finally {
      setAiLoading(false);
    }
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.localId !== id));
    toast.info("Bulgu kaldırıldı.");
  };

  const updateEntry = (id: string, field: keyof HazardEntry, value: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.localId === id ? { ...e, [field]: value } : e))
    );
  };

  const generatePDF = useCallback(() => {
    if (entries.length === 0) {
      toast.error("Dışa aktarılacak bulgu yok.");
      return;
    }

    try {
      const doc = new jsPDF("p", "mm", "a4");
      const now = new Date().toLocaleDateString("tr-TR");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("Denetron İSG Sistemi", 20, 20);

      doc.setFontSize(14);
      doc.text("Toplu Denetim Raporu — Bulk CAPA", 20, 30);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(
        `Site: ${siteName || "N/A"}  |  Tarih: ${now}  |  Bulgular: ${entries.length}`,
        20,
        40
      );
      doc.line(20, 44, 190, 44);

      let y = 52;
      entries.forEach((entry, i) => {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        // 🔤 Türkçe karakterler için latin encoding
        const title = `${i + 1}. ${entry.description}`;
        doc.text(title, 20, y);
        y += 7;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const riskText = `AI Risk: ${entry.riskScore}  |  Fine-Kinney: ${entry.fkValue.toFixed(
          1
        )} (${entry.fkLevel})`;
        doc.text(riskText, 24, y);
        y += 5;

        const causeText = `Temel Neden: ${entry.justification}`;
        doc.text(causeText, 24, y);
        y += 5;

        const planLines = doc.splitTextToSize(
          `Düzeltici İşlem: ${entry.correctionPlan}`,
          162
        );
        doc.text(planLines, 24, y);
        y += planLines.length * 4 + 8;
      });

      doc.save(`toplu-denetim-${Date.now()}.pdf`);
      toast.success("PDF indirildi!");
    } catch (e: any) {
      toast.error("PDF oluşturulurken hata: " + e.message);
      console.error("PDF Error:", e);
    }
  }, [entries, siteName]);

  // ✅ Veritabanı transactions ile saveAndSend
  const saveAndSend = async () => {
    if (!user) {
      toast.error("Lütfen giriş yapın.");
      return;
    }

    if (entries.length === 0) {
      toast.error("En az bir bulgu ekleyin.");
      return;
    }

    if (!siteName.trim()) {
      toast.error("Site adı gerekli.");
      return;
    }

    if (!recipientEmail.trim()) {
      toast.error("Geçerli bir email girin.");
      return;
    }

    setSending(true);
    setShowOverlay(true);

    let inspectionId: string | null = null;

    try {
      // ✅ ADIM 1: Organization ID kontrol
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw new Error(
          `Profil yüklenemedi: ${profileError.message || "Bilinmeyen hata"}`
        );
      }

      if (!profile?.organization_id) {
        throw new Error(
          "Kuruluş bilgisi bulunamadı. Lütfen profilinizi güncelleyin."
        );
      }

      // ✅ ADIM 2: Inspection kaydı oluştur
      const { data: inspection, error: inspectionError } = await supabase
        .from("inspections")
        .insert({
          org_id: profile.organization_id,
          user_id: user.id,
          location_name: siteName,
          notes: `Toplu Denetim (Bulk CAPA) - Alıcı: ${recipientEmail}`,
          status: "in_progress",
          risk_level: "high",
          equipment_category: null,
          answers: {},
          media_urls: [],
        })
        .select()
        .single();

      if (inspectionError || !inspection) {
        throw new Error(
          `Denetim kaydı oluşturulamadı: ${inspectionError?.message || "Bilinmeyen hata"}`
        );
      }

      inspectionId = inspection.id;

      // ✅ ADIM 3: Bulgular ekle (Transaction benzeri davranış)
      const findingsData = entries.map((e) => {
        const dueDateObj = new Date();
        dueDateObj.setDate(dueDateObj.getDate() + 15);
        const dueDate = dueDateObj.toISOString().split("T")[0];

        return {
          inspection_id: inspectionId,
          description: e.description,
          action_required: e.correctionPlan,
          due_date: dueDate,
          is_resolved: false,
        };
      });

      const { error: findingsError } = await supabase
        .from("findings")
        .insert(findingsData);

      if (findingsError) {
        // ❌ Findings kaydı hatası - cleanup başlat
        console.error("Findings Error:", findingsError);

        // Yarım kalan inspection kaydını sil
        await supabase.from("inspections").delete().eq("id", inspectionId);

        throw new Error(
          `Bulgular kaydedilemedi: ${findingsError.message || "Bilinmeyen hata"}. Denetim kaydı silinmiştir. Lütfen tekrar deneyin.`
        );
      }

      // ✅ ADIM 4: PDF oluştur
      generatePDF();

      // ✅ ADIM 5: Başarı mesajı
      toast.success(
        "✅ Bulgular başarıyla kaydedildi ve denetim oluşturuldu!"
      );

      // ✅ ADIM 6: Form temizle
      setEntries([]);
      setSiteName("");
      setRecipientEmail("");
    } catch (e: any) {
      toast.error(`❌ Hata: ${e.message}`);
      console.error("SaveAndSend Error:", e);

      // Eğer inspection oluşturulduysa ama failures varsa, cleanup yap
      if (inspectionId) {
        console.warn("Cleanup: Inspection kaydı silinecek...");
        await supabase.from("inspections").delete().eq("id", inspectionId);
      }
    } finally {
      setSending(false);
      setShowOverlay(false);
    }
  };

  const riskColors: Record<string, string> = {
    Low: "bg-success/15 text-success",
    Medium: "bg-warning/15 text-warning",
    High: "bg-destructive/15 text-destructive",
  };

  return (
    <div className="space-y-6 relative">
      {/* 🔄 Loading Overlay */}
      {showOverlay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-card p-8 rounded-lg border border-border shadow-xl text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <h3 className="text-lg font-semibold text-foreground">İşlem Devam Ediyor</h3>
            <p className="text-sm text-muted-foreground">Lütfen bekleyin...</p>
            <div className="w-48 h-1 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary animate-pulse" />
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-foreground">Çoklu DÖF Hazırlama</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Toplu denetim — Birden fazla bulguyu bir denetim kaydı olarak kaydedin
        </p>
      </div>

      {/* Site Info */}
      <div className="glass-card p-5 space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20">
            <ShieldPlus className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Oturum Bilgisi</h3>
            <p className="text-xs text-muted-foreground">Site ve bulgular ekleyin</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Site Adı *
            </Label>
            <Input
              placeholder="ör: İnşaat Sahası Gamma"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="bg-secondary/50 border-border/50"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Mail className="h-3 w-3" /> Alıcı Email *
            </Label>
            <Input
              placeholder="yonetici@example.com"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="bg-secondary/50 border-border/50"
            />
          </div>
        </div>
      </div>

      {/* Add Hazard Form */}
      <div className="glass-card p-5 space-y-4 animate-fade-in border-emerald-500/20">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Plus className="h-4 w-4 text-emerald-400" /> Bulgu Ekle
        </h3>

        <Textarea
          placeholder="Gözlemlenen güvenlik sorununu açıklayın..."
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="min-h-[80px] bg-secondary/50 border-border/50"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Olasılık
            </Label>
            <Select value={fkP} onValueChange={setFkP}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <SelectValue placeholder="Seçin..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                {probOpts.map((o) => (
                  <SelectItem key={o.v} value={String(o.v)}>
                    {o.l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Şiddet
            </Label>
            <Select value={fkS} onValueChange={setFkS}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <SelectValue placeholder="Seçin..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                {sevOpts.map((o) => (
                  <SelectItem key={o.v} value={String(o.v)}>
                    {o.l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Frekans
            </Label>
            <Select value={fkF} onValueChange={setFkF}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <SelectValue placeholder="Seçin..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                {freqOpts.map((o) => (
                  <SelectItem key={o.v} value={String(o.v)}>
                    {o.l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={analyzeAndAdd}
          disabled={aiLoading || !desc.trim() || !fkP || !fkS || !fkF}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 border-0 text-white"
        >
          {aiLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Brain className="h-4 w-4" />
          )}
          {aiLoading ? "Analiz yapılıyor..." : "AI ile Analiz Et & Ekle"}
        </Button>
      </div>

      {/* Session List */}
      {entries.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Denetim Özeti — {entries.length} bulgu
            </h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={generatePDF}
                disabled={sending}
              >
                <Download className="h-3.5 w-3.5" /> PDF İndir
              </Button>
              <Button
                size="sm"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 border-0 text-white"
                onClick={saveAndSend}
                disabled={sending}
              >
                {sending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                {sending ? "Lütfen Bekleyin..." : "Kaydet & Gönder"}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {entries.map((entry, idx) => {
              const level = fkLevel(entry.fkValue);
              const isEditing = editingIdx === idx;
              return (
                <div key={entry.localId} className="glass-card p-4 space-y-3 border border-border/50">
                  {/* ⚠️ AI Uyarısı */}
                  {entry.aiWarning && (
                    <div className="flex gap-2 bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                      <AlertCircle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-orange-600">{entry.aiWarning}</p>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-mono text-muted-foreground">
                          #{idx + 1}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            riskColors[entry.riskScore] || "bg-secondary text-foreground"
                          }`}
                        >
                          <AlertTriangle className="h-3 w-3 inline mr-1" />
                          AI: {entry.riskScore}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${level.cls}`}>
                          <Calculator className="h-3 w-3 inline mr-1" />
                          FK: {entry.fkValue.toFixed(1)} — {entry.fkLevel}
                        </span>
                      </div>
                      {isEditing ? (
                        <Textarea
                          value={entry.description}
                          onChange={(e) =>
                            updateEntry(entry.localId, "description", e.target.value)
                          }
                          className="text-sm bg-secondary/50 border-border/50 mb-2"
                          rows={2}
                        />
                      ) : (
                        <p className="text-sm font-medium text-foreground">
                          {entry.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        {entry.justification}
                      </p>
                      {isEditing ? (
                        <Textarea
                          value={entry.correctionPlan}
                          onChange={(e) =>
                            updateEntry(entry.localId, "correctionPlan", e.target.value)
                          }
                          className="text-sm bg-secondary/50 border-border/50 mt-2"
                          rows={3}
                        />
                      ) : (
                        <p className="text-xs text-muted-foreground mt-2 whitespace-pre-line">
                          {entry.correctionPlan}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {isEditing ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setEditingIdx(null)}
                        >
                          <Check className="h-3.5 w-3.5 text-success" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setEditingIdx(idx)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeEntry(entry.localId)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <div className="glass-card p-12 text-center animate-fade-in">
          <ShieldPlus className="h-10 w-10 text-emerald-400/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Henüz bulgu eklenmedi. Yukarıdaki formu kullanarak başlayın.
          </p>
        </div>
      )}
    </div>
  );
}