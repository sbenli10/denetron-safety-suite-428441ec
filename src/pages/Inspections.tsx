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

export default function Inspections() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [locationName, setLocationName] = useState("");
  const [equipmentCategory, setEquipmentCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("low"); // ✅ Doğru type
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

  // 🤖 AI Analiz Et
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

      // ✅ Risk seviyesini güncelle (type-safe)
      const aiRisk = data.riskScore?.toLowerCase();
      if (aiRisk === "low" || aiRisk === "düşük") setRiskLevel("low");
      else if (aiRisk === "medium" || aiRisk === "orta") setRiskLevel("medium");
      else if (aiRisk === "high" || aiRisk === "yüksek") setRiskLevel("high");
      else if (aiRisk === "critical" || aiRisk === "kritik") setRiskLevel("critical");

      toast.success(`AI analizi tamamlandı: Risk Seviyesi = ${data.riskScore}`);
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

      // 📊 Organization ID'sini al
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.organization_id) {
        throw new Error("Kuruluş bilgisi bulunamadı");
      }

      // ✅ Yeni denetim kaydı (type-safe)
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
      toast.success("Denetim başarıyla oluşturuldu");

      // Form sıfırla
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

  const handleExport = async () => {
    if (filtered.length === 0) {
      toast.error("Dışa aktarılacak denetim bulunamadı");
      return;
    }

    setExporting(true);
    try {
      // ✅ Uygun format ile export et
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
      toast.success("PDF raporu başarıyla oluşturuldu");
    } catch (error) {
      toast.error("PDF oluşturulurken hata oluştu");
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

  // 📊 İstatistik hesaplamaları
  const stats: StatCard[] = [
    {
      title: "Toplam Denetim",
      value: inspections.length,
      icon: <Activity className="h-5 w-5" />,
      color: "from-blue-500 to-blue-600",
      trend: "+12% bu ay",
    },
    {
      title: "Kritik Risk",
      value: inspections.filter(
        (i) => i.risk_level === "high" || i.risk_level === "critical"
      ).length,
      icon: <AlertCircle className="h-5 w-5" />,
      color: "from-red-500 to-red-600",
      trend: inspections.filter((i) => i.risk_level === "critical").length > 0
        ? "⚠️ Dikkat!"
        : "İyi durumda",
    },
    {
      title: "Devam Eden",
      value: inspections.filter(
        (i) => i.status === "in_progress" || i.status === "draft"
      ).length,
      icon: <Clock className="h-5 w-5" />,
      color: "from-orange-500 to-orange-600",
      trend: inspections.filter((i) => i.status === "in_progress").length > 0
        ? "Tamamla!"
        : "Yok",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Denetimler</h1>
          <p className="text-sm text-muted-foreground mt-1">
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
                <DialogTitle className="text-lg">Yeni Denetim Oluştur</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="locationName">Konum Adı *</Label>
                    <Input
                      id="locationName"
                      placeholder="ör: İnşaat Sahası Gamma"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="equipmentCategory">Ekipman Kategorisi</Label>
                    <Input
                      id="equipmentCategory"
                      placeholder="ör: Vinç, Asansör"
                      value={equipmentCategory}
                      onChange={(e) => setEquipmentCategory(e.target.value)}
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="riskLevel">Risk Seviyesi</Label>
                    <Select value={riskLevel} onValueChange={(value) => setRiskLevel(value as RiskLevel)}>
                      <SelectTrigger className="bg-secondary/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Düşük</SelectItem>
                        <SelectItem value="medium">Orta</SelectItem>
                        <SelectItem value="high">Yüksek</SelectItem>
                        <SelectItem value="critical">Kritik</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 🤖 Notlar + AI Analiz */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notes">Notlar</Label>
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
                      AI Analiz Et
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
                      {notes.length} karakter • AI analizi risk seviyesini otomatik
                      güncelleyecek
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Fotoğraf</Label>
                  <ImageUpload
                    onImageSelected={(file) => setSelectedFile(file)}
                    onRemoveImage={() => setSelectedFile(null)}
                    disabled={submitting}
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full gap-2"
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

      {/* 📊 İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className={`glass-card p-5 rounded-lg border border-border/50 overflow-hidden relative group hover:border-border transition-colors`}
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
                  className={`p-2.5 rounded-lg bg-gradient-to-br ${stat.color} bg-clip-padding text-white`}
                >
                  {stat.icon}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                <p
                  className={`text-xs font-medium ${
                    stat.trend?.includes("Yok")
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Denetimlerde ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {statusFilters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                activeFilter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all"
                ? "Tümü"
                : f === "completed"
                ? "Tamamlandı"
                : f === "in_progress"
                ? "Devam"
                : f === "draft"
                ? "Taslak"
                : "İptal"}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="glass-card divide-y divide-border/50">
        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Denetimler yükleniyor...</p>
          </div>
        ) : filtered.length > 0 ? (
          filtered.map((inspection) => (
            <InspectionRow
              key={inspection.id}
              id={inspection.id}
              site={inspection.location_name}
              inspector={inspection.equipment_category || "N/A"}
              date={new Date(inspection.created_at).toLocaleDateString("tr-TR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              status={
                inspection.status === "in_progress"
                  ? "in-progress"
                  : inspection.status === "completed"
                  ? "completed"
                  : "scheduled"
              }
              riskLevel={inspection.risk_level}
              photoUrl={inspection.media_urls?.[0] || null}
            />
          ))
        ) : (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Kriterlere uygun denetim bulunamadı.
          </div>
        )}
      </div>
    </div>
  );
}