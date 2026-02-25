import { useState, useEffect } from "react";
import { Search, Plus, Download, Loader2 } from "lucide-react";
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

interface Inspection {
  id: string;
  site_name: string;
  inspector_name: string;
  inspection_date: string;
  status: "completed" | "in-progress" | "overdue" | "scheduled";
  risk_level: "low" | "medium" | "high" | "critical";
  score?: number;
  observations?: string;
  photo_url?: string;
}

const statusFilters = ["all", "completed", "in-progress", "overdue", "scheduled"] as const;

export default function Inspections() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [siteName, setSiteName] = useState("");
  const [inspectorName, setInspectorName] = useState("");
  const [inspectionDate, setInspectionDate] = useState("");
  const [riskLevel, setRiskLevel] = useState<string>("low");
  const [observations, setObservations] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [exporting, setExporting] = useState(false);

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
        .order("inspection_date", { ascending: false });

      if (error) throw error;
      setInspections(data || []);
    } catch (error: any) {
      toast.error("Denetimler yüklenirken hata oluştu");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !siteName || !inspectorName || !inspectionDate) {
      toast.error("Lütfen tüm zorunlu alanları doldurun");
      return;
    }

    setSubmitting(true);
    try {
      let photoUrl = null;
      if (selectedFile) {
        photoUrl = await uploadInspectionPhoto(selectedFile, user.id);
        if (!photoUrl) {
          toast.error("Fotoğraf yüklenirken hata oluştu");
          setSubmitting(false);
          return;
        }
      }

      const { error } = await supabase.from("inspections").insert({
        user_id: user.id,
        site_name: siteName,
        inspector_name: inspectorName,
        inspection_date: inspectionDate,
        risk_level: riskLevel,
        observations: observations || null,
        photo_url: photoUrl,
        status: "scheduled",
      });

      if (error) throw error;

      toast.success("Denetim başarıyla oluşturuldu");
      setDialogOpen(false);
      resetForm();
      fetchInspections();
    } catch (error: any) {
      toast.error("Denetim kaydedilirken hata oluştu");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSiteName("");
    setInspectorName("");
    setInspectionDate("");
    setRiskLevel("low");
    setObservations("");
    setSelectedFile(null);
  };

  const handleExport = async () => {
    if (filtered.length === 0) {
      toast.error("Dışa aktarılacak denetim bulunamadı");
      return;
    }

    setExporting(true);
    try {
      await generateInspectionsPDF(filtered);
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
      i.site_name.toLowerCase().includes(search.toLowerCase()) ||
      i.inspector_name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === "all" || i.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Denetimler</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? "Yükleniyor..." : `${inspections.length} toplam denetim`}
          </p>
        </div>
        <div className="flex gap-2">
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
            Dışa Aktar
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 gradient-primary border-0 text-foreground">
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
                    <Label htmlFor="siteName">Saha Adı *</Label>
                    <Input
                      id="siteName"
                      placeholder="ör: İnşaat Sahası Gamma"
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inspectorName">Denetçi Adı *</Label>
                    <Input
                      id="inspectorName"
                      placeholder="ör: Ahmet Yılmaz"
                      value={inspectorName}
                      onChange={(e) => setInspectorName(e.target.value)}
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inspectionDate">Denetim Tarihi *</Label>
                    <Input
                      id="inspectionDate"
                      type="date"
                      value={inspectionDate}
                      onChange={(e) => setInspectionDate(e.target.value)}
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="riskLevel">Risk Seviyesi</Label>
                    <Select value={riskLevel} onValueChange={setRiskLevel}>
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

                <div className="space-y-2">
                  <Label htmlFor="observations">Gözlemler</Label>
                  <Textarea
                    id="observations"
                    placeholder="Denetim sırasında yapılan gözlemleri buraya yazın..."
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    rows={3}
                    className="bg-secondary/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Saha Fotoğrafı</Label>
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
              {f === "all" ? "Tümü" : f === "completed" ? "Tamamlandı" : f === "in-progress" ? "Devam Ediyor" : f === "overdue" ? "Gecikmiş" : "Planlandı"}
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
              site={inspection.site_name}
              inspector={inspection.inspector_name}
              date={new Date(inspection.inspection_date).toLocaleDateString("tr-TR")}
              status={inspection.status}
              riskLevel={inspection.risk_level}
              score={inspection.score}
              photoUrl={inspection.photo_url}
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
