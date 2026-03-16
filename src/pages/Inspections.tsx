//src\pages\Inspections.tsx
import { useState, useEffect, useRef } from "react";
import {
  Search,
  Plus,
  Download,
  Loader2,
  AlertCircle,
  Clock,
  Zap,
  Activity,
  ChevronRight,
  Eye,
  FileText,
  MapPin,
  User,
  Calendar,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Share2,
  X,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InspectionRow } from "@/components/InspectionRow";
import { FineKinneyWizard } from "@/components/FineKinneyWizard";
import { ImageUpload } from "@/components/ImageUpload";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { uploadInspectionPhoto } from "@/lib/storage";
import { generateInspectionsPDF } from "@/lib/inspectionPdfExport";
import { SendReportModal } from "@/components/SendReportModal";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";
import jsPDF from "jspdf";

type InspectionStatus = "completed" | "draft" | "in_progress" | "cancelled";
type RiskLevel = "low" | "medium" | "high" | "critical";

interface Inspection {
  id: string;
  org_id: string;
  user_id: string;
  location_name: string;
  equipment_category?: string | null;
  status: InspectionStatus;
  risk_level: RiskLevel;
  answers: Record<string, any>;
  media_urls: string[];
  notes?: string | null;
  completed_at?: string | null;
  created_at: string;
}

interface InspectionCachePayload {
  data: Inspection[];
  timestamp: number;
}

interface StatCard {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  trend?: string;
}

const INSPECTIONS_CACHE_TTL = 10 * 60 * 1000;
const INSPECTIONS_CACHE_LIMIT = 75;

const getInspectionsCacheKey = (userId: string) =>
  `denetron:inspections:${userId}:v2`;

const getInspectionsSessionCacheKey = (userId: string) =>
  `denetron:inspections:${userId}:session:v2`;

const createCacheableInspections = (data: Inspection[]): Inspection[] =>
  data.slice(0, INSPECTIONS_CACHE_LIMIT).map((inspection) => ({
    ...inspection,
    answers: {},
    media_urls: inspection.media_urls?.slice(0, 1) ?? [],
    notes: inspection.notes ? inspection.notes.slice(0, 500) : inspection.notes,
  }));

const parseInspectionCache = (raw: string | null): Inspection[] | null => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as InspectionCachePayload;

    if (Date.now() - parsed.timestamp > INSPECTIONS_CACHE_TTL) {
      return null;
    }

    return parsed.data ?? null;
  } catch {
    return null;
  }
};

const readCachedInspections = (userId: string): Inspection[] | null => {
  const localKey = getInspectionsCacheKey(userId);
  const sessionKey = getInspectionsSessionCacheKey(userId);

  const localCached = parseInspectionCache(localStorage.getItem(localKey));
  if (localCached) return localCached;

  localStorage.removeItem(localKey);

  const sessionCached = parseInspectionCache(sessionStorage.getItem(sessionKey));
  if (sessionCached) return sessionCached;

  sessionStorage.removeItem(sessionKey);
  return null;
};

const writeCachedInspections = (userId: string, data: Inspection[]) => {
  const payload: InspectionCachePayload = {
    data: createCacheableInspections(data),
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem(getInspectionsCacheKey(userId), JSON.stringify(payload));
  } catch {
    try {
      sessionStorage.setItem(
        getInspectionsSessionCacheKey(userId),
        JSON.stringify(payload)
      );
    } catch {
      sessionStorage.removeItem(getInspectionsSessionCacheKey(userId));
      localStorage.removeItem(getInspectionsCacheKey(userId));
    }
  }
};

const statusFilters = ["all", "completed", "in_progress", "draft", "cancelled"] as const;

const statusConfig = {
  completed: { label: "Tamamlandı", color: "bg-success/10 text-success border-success/30", icon: "✅" },
  in_progress: { label: "Devam Ediyor", color: "bg-blue-500/10 text-blue-600 border-blue-500/30", icon: "⏳" },
  draft: { label: "Taslak", color: "bg-gray-500/10 text-gray-600 border-gray-500/30", icon: "📝" },
  cancelled: { label: "İptal", color: "bg-destructive/10 text-destructive border-destructive/30", icon: "❌" },
};

const riskConfig = {
  low: { label: "Düşük Risk", color: "bg-success/10 text-success border-success/30", icon: "🟢" },
  medium: { label: "Orta Risk", color: "bg-warning/10 text-warning border-warning/30", icon: "🟡" },
  high: { label: "Yüksek Risk", color: "bg-orange-500/10 text-orange-600 border-orange-500/30", icon: "🔶" },
  critical: { label: "Kritik Risk", color: "bg-destructive/10 text-destructive border-destructive/30", icon: "🔴" },
};

export default function Inspections() {
  const { user } = useAuth();
  const activeUserId = user?.id ?? null;
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sharePreparing, setSharePreparing] = useState(false);
  const [currentReportUrl, setCurrentReportUrl] = useState("");
  const [currentReportFilename, setCurrentReportFilename] = useState("");
  const [linkedReport, setLinkedReport] = useState<{ url: string; filename: string; kind: "dof" | "inspection" } | null>(null);
  const [loadingLinkedReport, setLoadingLinkedReport] = useState(false);

  const [locationName, setLocationName] = useState("");
  const [equipmentCategory, setEquipmentCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("low");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [exporting, setExporting] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const location = useLocation();
  const isFetchingRef = useRef(false);
  const lastFetchedAtRef = useRef<number>(0);

  useEffect(() => {
    if (location.state?.prefilledNotes) {
      setNotes(location.state.prefilledNotes);
    }
  }, [location.state]);

  useEffect(() => {
    if (!activeUserId) return;

    const cached = readCachedInspections(activeUserId);
    if (cached) {
      setInspections(cached);
      setLoading(false);
      void fetchInspections(true);
      return;
    }

    void fetchInspections();
  }, [activeUserId]);

  const fetchInspections = async (silent = false, force = false) => {
    if (!activeUserId || isFetchingRef.current) return;

    const now = Date.now();
    if (!force && now - lastFetchedAtRef.current < 60_000) {
      return;
    }

    isFetchingRef.current = true;
    if (!silent) {
      setLoading(true);
    }
    try {
      const { data, error } = await supabase
        .from("inspections")
        .select("*")
        .eq("user_id", activeUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const nextInspections = (data as Inspection[]) || [];
      setInspections(nextInspections);
      writeCachedInspections(activeUserId, nextInspections);
      lastFetchedAtRef.current = Date.now();
    } catch (error: any) {
      toast.error("Denetimler yüklenirken hata oluştu");
      console.error(error);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  };

  const handleAIAnalysis = async () => {
    if (!notes.trim()) {
      toast.error("Lütfen notları yazın");
      return;
    }

    setAiAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-hazard", {
        body: { hazardDescription: notes.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const aiRisk = data.riskScore?.toLowerCase();
      if (aiRisk === "low" || aiRisk === "düşük") setRiskLevel("low");
      else if (aiRisk === "medium" || aiRisk === "orta") setRiskLevel("medium");
      else if (aiRisk === "high" || aiRisk === "yüksek") setRiskLevel("high");
      else if (aiRisk === "critical" || aiRisk === "kritik") setRiskLevel("critical");

      toast.success(`✅ AI Analizi: Risk = ${data.riskScore}`);
    } catch (e: any) {
      toast.error(e.message || "AI analizi başarısız");
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !locationName) {
      toast.error("Lütfen tüm zorunlu alanları doldurun");
      return;
    }

    setSubmitting(true);
    try {
      let photoUrl = null;
      if (selectedFile) {
        photoUrl = await uploadInspectionPhoto(selectedFile, user.id);
        if (!photoUrl) {
          throw new Error("Fotoğraf yüklenemedi");
        }
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.organization_id) {
        throw new Error("Kuruluş bilgisi bulunamadı");
      }

      const newInspectionData = {
        org_id: profile.organization_id,
        user_id: user.id,
        location_name: locationName,
        equipment_category: equipmentCategory || null,
        status: "draft" as InspectionStatus,
        risk_level: riskLevel as RiskLevel,
        notes: notes || null,
        answers: {},
        media_urls: photoUrl ? [photoUrl] : [],
      };

      const { data: newInspection, error: insertError } = await supabase
        .from("inspections")
        .insert(newInspectionData)
        .select()
        .single();

      if (insertError) throw insertError;

      const nextInspections = [newInspection as Inspection, ...inspections];
      setInspections(nextInspections);
      writeCachedInspections(user.id, nextInspections);
      toast.success("✅ Denetim başarıyla oluşturuldu");

      setLocationName("");
      setEquipmentCategory("");
      setNotes("");
      setRiskLevel("low");
      setSelectedFile(null);
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Denetim oluşturulurken hata oluştu");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteInspection = async (id: string) => {
    if (!confirm("Bu denetimi silmek istediğinize emin misiniz?")) return;

    try {
      const { error } = await supabase
        .from("inspections")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      const nextInspections = inspections.filter(i => i.id !== id);
      setInspections(nextInspections);
      if (user?.id) {
        writeCachedInspections(user.id, nextInspections);
      }
      setDetailsOpen(false);
      setSelectedInspection(null);
      toast.success("✅ Denetim silindi");
    } catch (error) {
      toast.error("❌ Denetim silinemedi");
    }
  };



  const loadLinkedReport = async (inspectionId: string) => {
    if (!user) return;

    setLoadingLinkedReport(true);
    setLinkedReport(null);
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("file_url, title, export_format, content")
        .eq("user_id", user.id)
        .contains("content", { inspection_id: inspectionId })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data?.file_url) return;

      const reportKind =
        (data as any)?.content?.report_kind === "dof" || data.export_format === "docx"
          ? "dof"
          : "inspection";
      const fallbackExt = data.export_format === "docx" ? "docx" : "pdf";
      const baseTitle = data.title || "Rapor";
      const title = baseTitle.includes(".") ? baseTitle : `${baseTitle}.${fallbackExt}`;

      setLinkedReport({
        url: data.file_url,
        filename: title,
        kind: reportKind,
      });
    } catch (error) {
      console.error("Linked report load error:", error);
    } finally {
      setLoadingLinkedReport(false);
    }
  };

  const openInspectionDetails = async (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setDetailsOpen(true);
    await loadLinkedReport(inspection.id);
  };

  const openLinkedReport = () => {
    if (!linkedReport?.url) return;
    window.open(linkedReport.url, "_blank", "noopener,noreferrer");
  };

  const downloadLinkedReport = async () => {
    if (!linkedReport?.url) return;
    try {
      const response = await fetch(linkedReport.url);
      if (!response.ok) throw new Error("Rapor indirilemedi");
      const blob = await response.blob();
      const ext = linkedReport.kind === "dof" ? "docx" : "pdf";
      const filename = linkedReport.filename.includes(".")
        ? linkedReport.filename
        : `${linkedReport.filename}.${ext}`;
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error: any) {
      toast.error(error?.message || "Rapor indirilemedi");
    }
  };
  const handleOpenShareModal = async () => {
    if (!user || !selectedInspection) return;

    if (linkedReport?.url) {
      setCurrentReportUrl(linkedReport.url);
      setCurrentReportFilename(linkedReport.filename);
      setSendModalOpen(true);
      return;
    }

    setSharePreparing(true);
    try {
      const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(16);
      doc.text("Denetim Raporu", 14, 18);

      doc.setFontSize(11);
      let y = 30;
      const line = (label: string, value?: string) => {
        doc.text(`${label}: ${value || "-"}`, 14, y);
        y += 8;
      };

      line("Konum", selectedInspection.location_name);
      line("Tarih", new Date(selectedInspection.created_at).toLocaleDateString("tr-TR"));
      line("Durum", statusConfig[selectedInspection.status].label);
      line("Risk Seviyesi", riskConfig[selectedInspection.risk_level].label);
      line("Ekipman", selectedInspection.equipment_category || "-");
      line("Fotoğraf Sayısı", String(selectedInspection.media_urls?.length || 0));

      if (selectedInspection.notes) {
        y += 2;
        doc.setFontSize(12);
        doc.text("Notlar", 14, y);
        y += 7;
        doc.setFontSize(10);
        const notesLines = doc.splitTextToSize(selectedInspection.notes, 180);
        doc.text(notesLines, 14, y);
      }

      const pdfBlob = doc.output("blob");
      const fileName = `inspection-${selectedInspection.id}.pdf`;
      const storagePath = `inspection-reports/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("reports")
        .upload(storagePath, pdfBlob, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("reports")
        .getPublicUrl(storagePath);

      if (!publicUrlData?.publicUrl) {
        throw new Error("Rapor bağlantısı oluşturulamadı");
      }

      setCurrentReportUrl(publicUrlData.publicUrl);
      setCurrentReportFilename(fileName);
      setSendModalOpen(true);
    } catch (error: any) {
      console.error("Inspection report share error:", error);
      toast.error(error?.message || "E-posta gönderimi için rapor hazırlanamadı");
    } finally {
      setSharePreparing(false);
    }
  };
  const handleExport = async () => {
    if (filtered.length === 0) {
      toast.error("Dışa aktarılacak denetim bulunamadı");
      return;
    }

    setExporting(true);
    try {
      const exportData = filtered.map((i) => ({
        id: i.id,
        site_name: i.location_name,
        inspector_name: i.equipment_category || "N/A",
        inspection_date: i.created_at,
        status: i.status,
        risk_level: i.risk_level,
        observations: i.notes,
        photo_url: i.media_urls?.[0] || null,
      }));

      await generateInspectionsPDF(exportData);
      toast.success("✅ PDF raporu başarıyla oluşturuldu");
    } catch (error) {
      toast.error("❌ PDF oluşturulurken hata oluştu");
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  const filtered = inspections.filter((i) => {
    const matchesSearch =
      i.location_name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === "all" || i.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const stats: StatCard[] = [
    {
      title: "Toplam Denetim",
      value: inspections.length,
      icon: <Activity className="h-5 w-5" />,
      color: "from-blue-500 to-blue-600",
      trend: `${filtered.length} sonuç`,
    },
    {
      title: "Kritik Risk",
      value: inspections.filter(
        (i) => i.risk_level === "high" || i.risk_level === "critical"
      ).length,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: "from-red-500 to-red-600",
      trend: inspections.filter((i) => i.risk_level === "critical").length > 0
        ? "⚠️ Acil Dikkat!"
        : "✅ Güvenli",
    },
    {
      title: "Devam Eden",
      value: inspections.filter(
        (i) => i.status === "in_progress" || i.status === "draft"
      ).length,
      icon: <Clock className="h-5 w-5" />,
      color: "from-orange-500 to-orange-600",
      trend: inspections.filter((i) => i.status === "in_progress").length > 0
        ? "🔔 Tamamla!"
        : "✅ Yok",
    },
  ];

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            📋 Denetimler
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {loading
              ? "Yükleniyor..."
              : `${inspections.length} toplam denetim • ${filtered.length} sonuç`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExport}
            disabled={exporting || loading || filtered.length === 0}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            PDF İndir
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="gap-2 gradient-primary border-0 text-foreground"
              >
                <Plus className="h-4 w-4" /> Yeni Denetim
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg">📝 Yeni Denetim Oluştur</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 shrink-0" />
                  <p className="text-sm text-blue-700">
                    💡 <strong>İpucu:</strong> Notları yazıp "AI Analiz Et" butonuna tıklayarak otomatik risk değerlendirmesi yapabilirsiniz.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="locationName">📍 Konum Adı *</Label>
                    <Input
                      id="locationName"
                      placeholder="ör: İnşaat Sahası Gamma"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      className="bg-secondary/50 h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="equipmentCategory">🔧 Ekipman Kategorisi</Label>
                    <Input
                      id="equipmentCategory"
                      placeholder="ör: Vinç, Asansör"
                      value={equipmentCategory}
                      onChange={(e) => setEquipmentCategory(e.target.value)}
                      className="bg-secondary/50 h-11"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="riskLevel">⚠️ Risk Seviyesi</Label>
                    <Select value={riskLevel} onValueChange={(value) => setRiskLevel(value as RiskLevel)}>
                      <SelectTrigger className="bg-secondary/50 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">🟢 Düşük</SelectItem>
                        <SelectItem value="medium">🟡 Orta</SelectItem>
                        <SelectItem value="high">🔶 Yüksek</SelectItem>
                        <SelectItem value="critical">🔴 Kritik</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notes">📝 Notlar</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 h-7 text-xs"
                      onClick={handleAIAnalysis}
                      disabled={aiAnalyzing || !notes.trim()}
                    >
                      {aiAnalyzing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Zap className="h-3.5 w-3.5" />
                      )}
                      🤖 AI Analiz
                    </Button>
                  </div>
                  <Textarea
                    id="notes"
                    placeholder="Denetim sırasında yapılan gözlemleri buraya yazın... (AI analiz edebilir)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="bg-secondary/50 resize-none"
                  />
                  {notes.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      ✏️ {notes.length} karakter • AI analizi risk seviyesini otomatik güncelleyecek
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>📷 Fotoğraf</Label>
                  <ImageUpload
                    onImageSelected={(file) => setSelectedFile(file)}
                    onRemoveImage={() => setSelectedFile(null)}
                    disabled={submitting}
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full gap-2 gradient-primary border-0 text-foreground"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Denetim Oluştur
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* STATISTICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className={`glass-card p-5 rounded-lg border border-border/50 overflow-hidden relative group hover:border-primary/50 transition-all`}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5 group-hover:opacity-10 transition-opacity`}
            />
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </h3>
                <div
                  className={`p-2.5 rounded-lg bg-gradient-to-br ${stat.color} text-white`}
                >
                  {stat.icon}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                <p
                  className={`text-xs font-medium ${
                    stat.trend?.includes("✅")
                      ? "text-success"
                      : stat.trend?.includes("⚠️")
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {stat.trend}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fine-Kinney Wizard */}
      <FineKinneyWizard />

      {/* FILTERS */}
      <div className="glass-card p-4 border border-border/50 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="🔍 Denetimlerde ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card border-border h-11"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {statusFilters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                  activeFilter === f
                    ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg"
                    : "bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "all"
                  ? "📋 Tümü"
                  : f === "completed"
                  ? "✅ Tamamlandı"
                  : f === "in_progress"
                  ? "⏳ Devam"
                  : f === "draft"
                  ? "📝 Taslak"
                  : "❌ İptal"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* LIST */}
      {loading ? (
        <div className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Denetimler yükleniyor...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((inspection) => (
            <div
              key={inspection.id}
              onClick={() => {
                void openInspectionDetails(inspection);
              }}
              className="glass-card p-5 border border-border/50 hover:border-primary/50 cursor-pointer transition-all group hover:shadow-lg"
            >
              <div className="space-y-4">
                {/* HEADER */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      📍 {inspection.location_name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      📅 {new Date(inspection.created_at).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>

                {/* TAGS */}
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${statusConfig[inspection.status].color}`}>
                    {statusConfig[inspection.status].icon} {statusConfig[inspection.status].label}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${riskConfig[inspection.risk_level].color}`}>
                    {riskConfig[inspection.risk_level].icon} {riskConfig[inspection.risk_level].label}
                  </span>
                </div>

                {/* INFO */}
                <div className="space-y-2 text-xs text-muted-foreground">
                  {inspection.equipment_category && (
                    <div className="flex items-center gap-2">
                      <span>🔧</span>
                      <span>{inspection.equipment_category}</span>
                    </div>
                  )}
                  {inspection.media_urls?.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span>📷</span>
                      <span>{inspection.media_urls.length} fotoğraf</span>
                    </div>
                  )}
                  {inspection.notes && (
                    <div className="flex items-start gap-2">
                      <span>📝</span>
                      <span className="line-clamp-2">{inspection.notes}</span>
                    </div>
                  )}
                </div>

                {/* PREVIEW IMAGE */}
                {inspection.media_urls?.[0] && (
                  <div className="w-full h-32 rounded-lg overflow-hidden border border-border/50">
                    <img
                      src={inspection.media_urls[0]}
                      alt="Denetim"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                )}

                {/* ACTION BUTTON */}
                <Button
                  className="w-full gap-2 h-9"
                  onClick={(e) => {
                    e.stopPropagation();
                    void openInspectionDetails(inspection);
                  }}
                >
                  <Eye className="h-4 w-4" />
                  Detayları Gör
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 border border-border/50 text-center space-y-4">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
          <div>
            <p className="text-foreground font-semibold">Denetim Bulunamadı</p>
            <p className="text-sm text-muted-foreground mt-1">Kriterlere uygun denetim yok. Yeni bir denetim oluşturabilirsiniz.</p>
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}
      {selectedInspection && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all ${
          detailsOpen ? "bg-black/50 backdrop-blur-sm" : "bg-black/0 pointer-events-none"
        }`}>
          <div className={`glass-card rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-primary/30 shadow-2xl bg-gradient-to-b from-card to-card/90 transition-all ${
            detailsOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}>
            {/* HEADER */}
            <div className="sticky top-0 bg-gradient-to-r from-primary/90 via-primary to-primary/80 p-6 md:p-7 flex items-center justify-between z-10 border-b border-primary-foreground/10">
              <div>
                <h2 className="text-xl font-bold text-primary-foreground flex items-center gap-2">
                  📋 Denetim Detayları
                </h2>
                <p className="text-sm text-primary-foreground/80 mt-1">
                  {selectedInspection.location_name}
                </p>
              </div>
              <button
                onClick={() => setDetailsOpen(false)}
                className="p-2 hover:bg-primary-foreground/20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-primary-foreground" />
              </button>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              {/* STATUS & RISK */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg border ${statusConfig[selectedInspection.status].color}`}>
                  <p className="text-xs text-muted-foreground mb-1">Durum</p>
                  <p className="font-bold">{statusConfig[selectedInspection.status].label}</p>
                </div>
                <div className={`p-4 rounded-lg border ${riskConfig[selectedInspection.risk_level].color}`}>
                  <p className="text-xs text-muted-foreground mb-1">Risk Seviyesi</p>
                  <p className="font-bold">{riskConfig[selectedInspection.risk_level].label}</p>
                </div>
              </div>

              {/* INFO GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass-card p-4 border border-border/50 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Konum
                  </p>
                  <p className="font-semibold">{selectedInspection.location_name}</p>
                </div>
                <div className="glass-card p-4 border border-border/50 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Tarih
                  </p>
                  <p className="font-semibold">
                    {new Date(selectedInspection.created_at).toLocaleDateString("tr-TR")}
                  </p>
                </div>
                {selectedInspection.equipment_category && (
                  <div className="glass-card p-4 border border-border/50 space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      🔧 Ekipman
                    </p>
                    <p className="font-semibold">{selectedInspection.equipment_category}</p>
                  </div>
                )}
                <div className="glass-card p-4 border border-border/50 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    📷 Fotoğraf
                  </p>
                  <p className="font-semibold">{selectedInspection.media_urls?.length || 0} adet</p>
                </div>
              </div>

              {/* NOTES */}
              {selectedInspection.notes && (
                <div className="glass-card p-4 border border-border/50 space-y-2">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Notlar
                  </p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedInspection.notes}
                  </p>
                </div>
              )}


              {/* LINKED REPORT */}
              <div className="glass-card p-4 border border-border/50 space-y-3 bg-card/60 rounded-xl">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Oluşturulan Rapor
                </p>
                {loadingLinkedReport ? (
                  <p className="text-sm text-muted-foreground">Rapor bağlantısı kontrol ediliyor...</p>
                ) : linkedReport?.url ? (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-sm text-muted-foreground truncate">{linkedReport.filename}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={openLinkedReport}>
                        Raporu Aç
                      </Button>
                      <Button size="sm" onClick={downloadLinkedReport}>
                        <Download className="h-4 w-4 mr-1" /> İndir
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Bu denetime bağlı rapor bulunamadı.</p>
                )}
              </div>
              {/* PHOTOS */}
              {selectedInspection.media_urls && selectedInspection.media_urls.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <Eye className="h-4 w-4" /> Fotoğraflar
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedInspection.media_urls.map((url, idx) => (
                      <div key={idx} className="rounded-lg overflow-hidden border border-border/50 aspect-video">
                        <img
                          src={url}
                          alt={`Fotoğraf ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ACTIONS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-4 border-t border-border/60">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={openLinkedReport}
                  disabled={!linkedReport?.url}
                >
                  <Eye className="h-4 w-4" />
                  Raporu Aç
                </Button>

                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={downloadLinkedReport}
                  disabled={!linkedReport?.url}
                >
                  <Download className="h-4 w-4" />
                  Raporu İndir
                </Button>

                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={handleOpenShareModal}
                  disabled={sharePreparing}
                >
                  {sharePreparing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Share2 className="h-4 w-4" />
                  )}
                  E-posta Gönder
                </Button>
              </div>

              {/* INFO BOX */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 shrink-0" />
                <div className="text-sm text-blue-700">
                  <p className="font-semibold mb-1">💡 İpucu</p>
                  <p>Denetim detaylarını düzenlemek ve formu tamamlamak için "DÖF Raporları" bölümünü ziyaret edin.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <SendReportModal
        open={sendModalOpen}
        onOpenChange={setSendModalOpen}
        reportType={linkedReport?.kind === "dof" ? "dof" : "inspection"}
        reportUrl={currentReportUrl}
        reportFilename={currentReportFilename}
        companyName={selectedInspection?.location_name || "Denetim"}
      />
    </div>
  );
}
