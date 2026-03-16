import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  Eye,
  Download,
  Filter,
  Search,
  Loader2,
  TrendingUp,
  Calendar,
  User,
  FileText,
  X,
  Image as ImageIcon,
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, isPast, parseISO } from "date-fns";

type CAPAStatus = "Açık" | "Devam Ediyor" | "Tamamlandı";

interface CAPARecord {
  id: string;
  org_id: string;
  user_id: string;
  non_conformity: string;
  root_cause: string;
  corrective_action: string;
  assigned_person: string;
  deadline: string;
  status: CAPAStatus;
  priority: "Düşük" | "Orta" | "Yüksek" | "Kritik";
  notes?: string;
  media_urls?: string[];
  source?: string;
  created_at: string;
  updated_at: string;
}

const statusConfig: Record<CAPAStatus, { color: string; icon: string }> = {
  "Açık": { color: "bg-destructive/10 text-destructive border-destructive/30", icon: "🔴" },
  "Devam Ediyor": { color: "bg-warning/10 text-warning border-warning/30", icon: "🟡" },
  "Tamamlandı": { color: "bg-success/10 text-success border-success/30", icon: "✅" },
};

const priorityConfig: Record<string, { color: string; icon: string }> = {
  "Kritik": { color: "bg-destructive/10 text-destructive", icon: "🔴" },
  "Yüksek": { color: "bg-orange-500/10 text-orange-600", icon: "🟠" },
  "Orta": { color: "bg-yellow-500/10 text-yellow-600", icon: "🟡" },
  "Düşük": { color: "bg-success/10 text-success", icon: "🟢" },
};

const getCapaCacheKey = (userId: string) => `denetron:capa:${userId}`;

export default function CAPA() {
  const { user } = useAuth();
  const location = useLocation();

  const [records, setRecords] = useState<CAPARecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<CAPARecord | null>(null);

  // Form state
  const [nonConformity, setNonConformity] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [assignedPerson, setAssignedPerson] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<"Düşük" | "Orta" | "Yüksek" | "Kritik">("Orta");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!user) return;
    const cached = sessionStorage.getItem(getCapaCacheKey(user.id));
    if (cached) {
      try {
        setRecords(JSON.parse(cached) as CAPARecord[]);
        setLoading(false);
      } catch {
        sessionStorage.removeItem(getCapaCacheKey(user.id));
      }
    }
    void fetchRecords(Boolean(cached));
  }, [user]);

  useEffect(() => {
    if (location.state?.aiData) {
      const { description, plan, justification, risk } = location.state.aiData;
      setNonConformity(description || "");
      setCorrectiveAction(plan || "");
      setRootCause(justification || "");

      if (risk === "High") setPriority("Kritik");
      else if (risk === "Medium") setPriority("Yüksek");
      else setPriority("Orta");

      setDialogOpen(true);
      toast.success("AI verisi DÖF formuna dolduruldu.");
    }
  }, [location.state]);

  const fetchRecords = async (silent = false) => {
    if (!user) return;

    if (!silent) {
      setLoading(true);
    }
    try {
      console.log("Fetching records for user:", user.id);

      // 1. Profile ve Organization ID bilgisini al
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .maybeSingle();

      const organizationId = profile?.organization_id || user.id;

      // 2. Normal CAPA kayıtlarını çek
      const { data: capaData, error: capaError } = await supabase
        .from("capa_records")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (capaError && capaError.code !== 'PGRST116') throw capaError;

     const capaRecords: CAPARecord[] = (capaData || []).map(record => {
      const rawRecord = record as any; 
      
      return {
        ...record,
        status: record.status as CAPAStatus,
        priority: record.priority as "Düşük" | "Orta" | "Yüksek" | "Kritik",
        source: "capa",
        media_urls: rawRecord.media_urls || [], 
        notes: record.notes || ""
      };
    });
      const { data: findingsData, error: findingsError } = await supabase
        .from("findings")
        .select(`
          *,
          inspection:inspections!inner(
            id,
            location_name,
            user_id,
            media_urls,
            notes,
            risk_definition,
            corrective_action,
            preventive_action
          )
        `)
        .eq("inspection.user_id", user.id)
        .order("created_at", { ascending: false });

      // Findings'i CAPARecord'a çevir
      const findingsAsCapa: CAPARecord[] = (findingsData || []).map(f => {
        const inspection = (f as any).inspection;
        
        return {
          id: f.id,
          org_id: profile?.organization_id || user.id,
          user_id: f.user_id || user.id,
          non_conformity: f.description,
          root_cause: inspection?.risk_definition || "Bulk CAPA'dan otomatik oluşturuldu",
          corrective_action: inspection?.corrective_action || f.action_required || "Belirtilmemiş",
          assigned_person: f.assigned_to || "Atanmamış",
          deadline: f.due_date || new Date().toISOString().split('T')[0],
          status: f.is_resolved ? "Tamamlandı" : "Açık" as CAPAStatus,
          priority: (
            f.priority === "critical" ? "Kritik" :
            f.priority === "high" ? "Yüksek" :
            f.priority === "medium" ? "Orta" : "Düşük"
          ) as "Düşük" | "Orta" | "Yüksek" | "Kritik",
          notes: [
            `Konum: ${inspection?.location_name || "Bilinmiyor"}`,
            `Kaynak: Toplu DÖF`,
            `Fotoğraf: ${inspection?.media_urls?.length || 0} adet`,
            `Önleyici: ${inspection?.preventive_action?.substring(0, 100) || "Yok"}...`,
            inspection?.notes || "",
            f.resolution_notes || ""
          ].filter(Boolean).join("\n"),
          media_urls: inspection?.media_urls || [],
          source: "findings",
          created_at: f.created_at,
          updated_at: f.created_at
        };
      });

      // 4. İki farklı kaynaktan gelen verileri birleştir
      const allRecords = [...capaRecords, ...findingsAsCapa];

      console.log(`İşlem tamamlandı: ${capaRecords.length} standart, ${findingsAsCapa.length} toplu DÖF yüklendi.`);

      setRecords(allRecords);
      sessionStorage.setItem(getCapaCacheKey(user.id), JSON.stringify(allRecords));
      
      if (allRecords.length === 0) {
        toast.info("Henüz DÖF kaydı bulunamadı.");
      }
    } catch (error: any) {
      console.error("CAPA yükleme hatası:", error);
      toast.error(`Veriler çekilirken bir sorun oluştu: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!nonConformity || !rootCause || !correctiveAction || !assignedPerson || !deadline) {
      toast.error("Lütfen tüm zorunlu alanları doldurun");
      return;
    }

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user?.id)
        .maybeSingle();

      const orgId = profile?.organization_id || user?.id;

      if (editingId) {
        // UPDATE - Hangi tablodan geldiğini kontrol et
        const record = records.find(r => r.id === editingId);
        
        if (record?.source === "findings") {
          // Findings tablosunu güncelle
          const { error } = await supabase
            .from("findings")
            .update({
              description: nonConformity,
              action_required: correctiveAction,
              due_date: deadline,
              priority: priority === "Kritik" ? "critical" : 
                       priority === "Yüksek" ? "high" : 
                       priority === "Orta" ? "medium" : "low",
              resolution_notes: notes,
            })
            .eq("id", editingId);

          if (error) throw error;
        } else {
          // CAPA records tablosunu güncelle
          const { error } = await supabase
            .from("capa_records")
            .update({
              non_conformity: nonConformity,
              root_cause: rootCause,
              corrective_action: correctiveAction,
              assigned_person: assignedPerson,
              deadline: deadline,
              priority: priority,
              notes: notes,
              updated_at: new Date().toISOString(),
            })
            .eq("id", editingId);

          if (error) throw error;
        }
        
        toast.success("DÖF güncellendi");
      } else {
        // CREATE - Sadece capa_records'a ekle
        const { error } = await supabase
          .from("capa_records")
          .insert({
            org_id: orgId,
            user_id: user?.id,
            non_conformity: nonConformity,
            root_cause: rootCause,
            corrective_action: correctiveAction,
            assigned_person: assignedPerson,
            deadline: deadline,
            status: "Açık",
            priority: priority,
            notes: notes,
          });

        if (error) throw error;
        toast.success("Yeni DÖF kaydı oluşturuldu");
      }

      // Reset form
      setNonConformity("");
      setRootCause("");
      setCorrectiveAction("");
      setAssignedPerson("");
      setDeadline("");
      setPriority("Orta");
      setNotes("");
      setEditingId(null);
      setDialogOpen(false);

      fetchRecords();
    } catch (error: any) {
      console.error("Submit error:", error);
      toast.error(error.message || "İşlem başarısız");
    }
  };

  const handleEdit = (record: CAPARecord) => {
    setNonConformity(record.non_conformity);
    setRootCause(record.root_cause);
    setCorrectiveAction(record.corrective_action);
    setAssignedPerson(record.assigned_person);
    setDeadline(record.deadline);
    setPriority(record.priority);
    setNotes(record.notes || "");
    setEditingId(record.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu DÖF kaydını silmek istediğinize emin misiniz?")) return;

    try {
      const record = records.find(r => r.id === id);
      
      if (record?.source === "findings") {
        const { error } = await supabase
          .from("findings")
          .delete()
          .eq("id", id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("capa_records")
          .delete()
          .eq("id", id);

        if (error) throw error;
      }
      
      setRecords(records.filter((r) => r.id !== id));
      setDetailsOpen(false);
      setDetailRecord(null);
      toast.success("DÖF silindi");
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("Silme işlemi başarısız");
    }
  };

  const updateStatus = async (id: string, status: CAPAStatus) => {
    try {
      const record = records.find(r => r.id === id);
      
      if (record?.source === "findings") {
        const { error } = await supabase
          .from("findings")
          .update({
            is_resolved: status === "Tamamlandı",
          })
          .eq("id", id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("capa_records")
          .update({
            status: status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (error) throw error;
      }

      setRecords(records.map((r) => (r.id === id ? { ...r, status } : r)));
      toast.success(`Durum güncellendi: ${status}`);
    } catch (error: any) {
      console.error("Update status error:", error);
      toast.error("Durum güncellenemedi");
    }
  };

  const filteredRecords = records.filter((record) => {
    const matchesStatus = filterStatus === "all" || record.status === filterStatus;
    const matchesSearch =
      record.non_conformity.toLowerCase().includes(searchText.toLowerCase()) ||
      record.assigned_person.toLowerCase().includes(searchText.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: records.length,
    acik: records.filter((r) => r.status === "Açık").length,
    devamEdiyor: records.filter((r) => r.status === "Devam Ediyor").length,
    tamamlandi: records.filter((r) => r.status === "Tamamlandı").length,
    gecmis: records.filter((r) => r.status !== "Tamamlandı" && isPast(parseISO(r.deadline))).length,
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            DÖF Yönetim Sistemi
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Düzeltici ve Önleyici Faaliyetler - Uygunsuzluk takibi ve durum yönetimi
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingId(null);
                setNonConformity("");
                setRootCause("");
                setCorrectiveAction("");
                setAssignedPerson("");
                setDeadline("");
                setPriority("Orta");
                setNotes("");
              }}
              className="gap-2 gradient-primary border-0 text-foreground"
            >
              <Plus className="h-4 w-4" />
              Yeni DÖF Kaydı
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {editingId ? "DÖF Kaydını Düzenle" : "Yeni DÖF Formu"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* UYGUNSUZLUK */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Uygunsuzluk Tanımı *
                </Label>
                <Textarea
                  placeholder="Yapılan uygunsuzluğu detaylı olarak açıklayın..."
                  value={nonConformity}
                  onChange={(e) => setNonConformity(e.target.value)}
                  rows={3}
                  className="bg-secondary/50"
                />
              </div>

              {/* KÖK NEDEN */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Kök Neden Analizi *</Label>
                <Textarea
                  placeholder="Sorunun temel nedenlerini analiz edin..."
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  rows={2}
                  className="bg-secondary/50"
                />
              </div>

              {/* DÜZELTİCİ FAALİYET */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Düzeltici Faaliyet Planı *</Label>
                <Textarea
                  placeholder="Sorunun çözümü için yapılacak işlemleri liste halinde yazın..."
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                  rows={3}
                  className="bg-secondary/50"
                />
              </div>

              {/* GRID */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Sorumlu Kişi *
                  </Label>
                  <Input
                    placeholder="İsim Soyadı"
                    value={assignedPerson}
                    onChange={(e) => setAssignedPerson(e.target.value)}
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Son Tarih *
                  </Label>
                  <Input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="bg-secondary/50"
                  />
                </div>
              </div>

              {/* GRID 2 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Öncelik Düzeyi</Label>
                  <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card">
                      <SelectItem value="Düşük">🟢 Düşük</SelectItem>
                      <SelectItem value="Orta">🟡 Orta</SelectItem>
                      <SelectItem value="Yüksek">🟠 Yüksek</SelectItem>
                      <SelectItem value="Kritik">🔴 Kritik</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Durum</Label>
                  <div className="h-10 bg-secondary/50 rounded-lg flex items-center px-3 text-sm">
                    {editingId ? "Mevcut" : "Açık"}
                  </div>
                </div>
              </div>

              {/* NOTLAR */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Ek Notlar</Label>
                <Textarea
                  placeholder="Ek bilgiler, referanslar vb..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="bg-secondary/50"
                />
              </div>

              {/* SUBMIT */}
              <Button onClick={handleSubmit} className="w-full gap-2 gradient-primary border-0 text-foreground">
                <CheckCircle2 className="h-4 w-4" />
                {editingId ? "Güncelle" : "DÖF Kaydını Oluştur"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* STATISTICS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-card p-4 border border-border/50 space-y-2">
          <p className="text-xs text-muted-foreground">Toplam DÖF</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="glass-card p-4 border border-destructive/30 bg-destructive/5 space-y-2">
          <p className="text-xs text-destructive">🔴 Açık</p>
          <p className="text-2xl font-bold text-destructive">{stats.acik}</p>
        </div>
        <div className="glass-card p-4 border border-warning/30 bg-warning/5 space-y-2">
          <p className="text-xs text-warning">🟡 Devam Ediyor</p>
          <p className="text-2xl font-bold text-warning">{stats.devamEdiyor}</p>
        </div>
        <div className="glass-card p-4 border border-success/30 bg-success/5 space-y-2">
          <p className="text-xs text-success">✅ Tamamlandı</p>
          <p className="text-2xl font-bold text-success">{stats.tamamlandi}</p>
        </div>
        <div className="glass-card p-4 border border-red-500/30 bg-red-500/5 space-y-2">
          <p className="text-xs text-red-600">⏰ Gecikmiş</p>
          <p className="text-2xl font-bold text-red-600">{stats.gecmis}</p>
        </div>
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
              placeholder="Uygunsuzluk, sorumlu kişi..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="bg-secondary/50 border-border/50"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Durum Filtresi
            </Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card">
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="Açık">🔴 Açık</SelectItem>
                <SelectItem value="Devam Ediyor">🟡 Devam Ediyor</SelectItem>
                <SelectItem value="Tamamlandı">✅ Tamamlandı</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* TABLE */}
      {loading ? (
        <div className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">DÖF'ler yükleniyor...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="glass-card p-12 border border-border/50 text-center space-y-4">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
          <p className="text-muted-foreground">DÖF kaydı bulunamadı</p>
        </div>
      ) : (
        <div className="glass-card border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 border-b border-border/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Uygunsuzluk</th>
                  <th className="px-4 py-3 text-left font-semibold">Sorumlu</th>
                  <th className="px-4 py-3 text-left font-semibold">Son Tarih</th>
                  <th className="px-4 py-3 text-left font-semibold">Öncelik</th>
                  <th className="px-4 py-3 text-left font-semibold">Durum</th>
                  <th className="px-4 py-3 text-right font-semibold">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredRecords.map((record) => {
                  const isOverdue = record.status !== "Tamamlandı" && isPast(parseISO(record.deadline));
                  const statusCfg = statusConfig[record.status];
                  const priorCfg = priorityConfig[record.priority];

                  return (
                    <tr 
                      key={record.id} 
                      className={`${isOverdue ? "bg-red-500/5" : ""} cursor-pointer hover:bg-secondary/30 transition-colors`}
                      onClick={() => {
                        setDetailRecord(record);
                        setDetailsOpen(true);
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-primary text-xs">
                            {record.id.substring(0, 8)}...
                          </span>
                          {record.source === "findings" && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 border border-purple-500/20 w-fit">
                              Toplu DÖF
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{record.non_conformity}</span>
                          {record.media_urls && record.media_urls.length > 0 && (
                            <span className="shrink-0 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">
                              📷 {record.media_urls.length}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">{record.assigned_person}</td>
                      <td className={`px-4 py-3 ${isOverdue ? "text-red-600 font-bold" : ""}`}>
                        {record.deadline} {isOverdue && "⏰"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded ${priorCfg.color}`}>
                          {priorCfg.icon} {record.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Select 
                          value={record.status} 
                          onValueChange={(v) => updateStatus(record.id, v as CAPAStatus)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card">
                            <SelectItem value="Açık">🔴 Açık</SelectItem>
                            <SelectItem value="Devam Ediyor">🟡 Devam Ediyor</SelectItem>
                            <SelectItem value="Tamamlandı">✅ Tamamlandı</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(record);
                          }}
                          className="gap-2"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(record.id);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}
      {detailsOpen && detailRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-primary/20">
            {/* HEADER */}
            <div className="sticky top-0 bg-gradient-to-r from-primary to-primary/80 p-6 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-bold text-primary-foreground flex items-center gap-2">
                  DÖF Detayları
                  {detailRecord.source === "findings" && (
                    <span className="text-xs px-2 py-1 rounded bg-white/20 border border-white/30">
                      Toplu DÖF
                    </span>
                  )}
                </h2>
                <p className="text-sm text-primary-foreground/80 mt-1">
                  ID: {detailRecord.id.substring(0, 8)}...
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
              {/* STATUS & PRIORITY */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg border ${statusConfig[detailRecord.status].color}`}>
                  <p className="text-xs text-muted-foreground mb-1">Durum</p>
                  <p className="font-bold">{statusConfig[detailRecord.status].icon} {detailRecord.status}</p>
                </div>
                <div className={`p-4 rounded-lg border ${priorityConfig[detailRecord.priority].color}`}>
                  <p className="text-xs text-muted-foreground mb-1">Öncelik</p>
                  <p className="font-bold">{priorityConfig[detailRecord.priority].icon} {detailRecord.priority}</p>
                </div>
              </div>

              {/* INFO GRID */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-4 border border-border/50 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Uygunsuzluk
                  </p>
                  <p className="font-semibold text-sm">{detailRecord.non_conformity}</p>
                </div>
                <div className="glass-card p-4 border border-border/50 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" /> Sorumlu
                  </p>
                  <p className="font-semibold text-sm">{detailRecord.assigned_person}</p>
                </div>
                <div className="glass-card p-4 border border-border/50 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Son Tarih
                  </p>
                  <p className="font-semibold text-sm">{detailRecord.deadline}</p>
                </div>
                <div className="glass-card p-4 border border-border/50 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Oluşturulma
                  </p>
                  <p className="font-semibold text-sm">
                    {new Date(detailRecord.created_at).toLocaleDateString("tr-TR")}
                  </p>
                </div>
              </div>

              {/* KÖK NEDEN */}
              <div className="glass-card p-4 border border-border/50 space-y-2">
                <p className="text-sm font-semibold flex items-center gap-2">
                  Kök Neden
                </p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {detailRecord.root_cause}
                </p>
              </div>

              {/* DÜZELTİCİ FAALİYET */}
              <div className="glass-card p-4 border border-border/50 space-y-2">
                <p className="text-sm font-semibold flex items-center gap-2">
                  Düzeltici Faaliyet
                </p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {detailRecord.corrective_action}
                </p>
              </div>

              {/* NOTES */}
              {detailRecord.notes && (
                <div className="glass-card p-4 border border-border/50 space-y-2">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Notlar
                  </p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {detailRecord.notes}
                  </p>
                </div>
              )}
              {/* FOTOĞRAFLAR - BASE64 DESTEĞİ */}
              {detailRecord.media_urls && detailRecord.media_urls.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Fotoğraflar ({detailRecord.media_urls.length})
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {detailRecord.media_urls.map((url, idx) => {
                      // Base64 veya HTTP URL kontrolü
                      const isBase64 = url.startsWith('data:image');
                      const isHttpUrl = url.startsWith('http');
                      
                      // Geçersiz URL'leri atla
                      if (!isBase64 && !isHttpUrl) {
                        console.warn(`Invalid image URL at index ${idx}:`, url.substring(0, 50));
                        return null;
                      }

                      return (
                        <div
                          key={idx}
                          className="group relative rounded-lg overflow-hidden border border-border/50 hover:border-primary/50 transition-colors cursor-pointer"
                          onClick={() => {
                            // Base64 ise yeni sekmede aç
                            if (isBase64) {
                              const win = window.open();
                              if (win) {
                                win.document.write(`<img src="${url}" style="max-width:100%;height:auto;" />`);
                              }
                            } else {
                              window.open(url, '_blank');
                            }
                          }}
                        >
                          <img
                            src={url}
                            alt={`Fotoğraf ${idx + 1}`}
                            className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              // Hata durumunda placeholder göster
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EYüklenemedi%3C/text%3E%3C/svg%3E';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <p className="absolute bottom-2 right-2 text-xs font-semibold bg-black/70 text-white px-2 py-1 rounded">
                            {idx + 1}/{detailRecord.media_urls.length}
                          </p>
                          {/* Base64 Badge */}
                          {isBase64 && (
                            <p className="absolute top-2 left-2 text-[9px] font-semibold bg-purple-600 text-white px-2 py-1 rounded">
                              BASE64
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ACTIONS */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => {
                    handleEdit(detailRecord);
                    setDetailsOpen(false);
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                  Düzenle
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    handleDelete(detailRecord.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Sil
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
