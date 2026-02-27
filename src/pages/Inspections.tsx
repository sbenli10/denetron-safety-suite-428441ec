import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { useLocation } from "react-router-dom";

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

interface StatCard {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  trend?: string;
}

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
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);

  const [locationName, setLocationName] = useState("");
  const [equipmentCategory, setEquipmentCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("low");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [exporting, setExporting] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (location.state?.prefilledNotes) {
      setNotes(location.state.prefilledNotes);
    }
  }, [location.state]);

  useEffect(() => {
    fetchInspections();
  }, [user]);

  const fetchInspections = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("inspections")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInspections((data as Inspection[]) || []);
    } catch (error: any) {
      toast.error("Denetimler yüklenirken hata oluştu");
      console.error(error);
    } finally {
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

      setInspections([newInspection as Inspection, ...inspections]);
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
      
      setInspections(inspections.filter(i => i.id !== id));
      setDetailsOpen(false);
      setSelectedInspection(null);
      toast.success("✅ Denetim silindi");
    } catch (error) {
      toast.error("❌ Denetim silinemedi");
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
                setSelectedInspection(inspection);
                setDetailsOpen(true);
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
                    setSelectedInspection(inspection);
                    setDetailsOpen(true);
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
          <div className={`glass-card rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-primary/20 transition-all ${
            detailsOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}>
            {/* HEADER */}
            <div className="sticky top-0 bg-gradient-to-r from-primary to-primary/80 p-6 flex items-center justify-between z-10">
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

            <div className="p-6 space-y-6">
              {/* STATUS & RISK */}
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
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
              <div className="flex gap-2 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => {
                    window.open(selectedInspection.media_urls?.[0], "_blank");
                  }}
                  disabled={!selectedInspection.media_urls?.[0]}
                >
                  <Download className="h-4 w-4" />
                  İndir
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success("Link kopyalandı");
                  }}
                >
                  <Share2 className="h-4 w-4" />
                  Paylaş
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 gap-2 text-destructive hover:text-destructive"
                  onClick={() => {
                    handleDeleteInspection(selectedInspection.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Sil
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
    </div>
  );
}