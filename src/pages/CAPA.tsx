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

export default function CAPA() {
  const { user } = useAuth();
  const location = useLocation();

  const [records, setRecords] = useState<CAPARecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchText, setSearchText] = useState("");

  // Form state
  const [nonConformity, setNonConformity] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [assignedPerson, setAssignedPerson] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<"Düşük" | "Orta" | "Yüksek" | "Kritik">("Orta");
  const [notes, setNotes] = useState("");

  // Fetch organization ve DÖF'leri yükle
  useEffect(() => {
    fetchRecords();
  }, [user]);

  // AI Raporları sayfasından gelen veriyi doldur
  useEffect(() => {
    if (location.state?.aiData) {
      const { description, plan, justification, risk } = location.state.aiData;
      setNonConformity(description || "");
      setCorrectiveAction(plan || "");
      setRootCause(justification || "");

      // Risk seviyesini priority'ye çevir
      if (risk === "High") setPriority("Kritik");
      else if (risk === "Medium") setPriority("Yüksek");
      else setPriority("Orta");

      setDialogOpen(true);
      toast.success("📋 AI verisi DÖF formuna dolduruldu!");
    }
  }, [location.state]);

  const fetchRecords = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) {
        throw new Error("Organization not found");
      }

      const { data, error } = await supabase
        .from("capa_records")
        .select("*")
        .eq("org_id", profile.organization_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecords((data as CAPARecord[]) || []);
    } catch (error) {
      console.error("Error fetching records:", error);
      toast.error("DÖF'ler yüklenemedi");
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
        .single();

      if (!profile?.organization_id) {
        throw new Error("Organization not found");
      }

      if (editingId) {
        // ✅ UPDATE
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
        toast.success("✅ DÖF güncellendi");
      } else {
        // ✅ CREATE
        const { error } = await supabase
          .from("capa_records")
          .insert({
            org_id: profile.organization_id,
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
        toast.success("✅ Yeni DÖF kaydı oluşturuldu");
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
      const { error } = await supabase
        .from("capa_records")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setRecords(records.filter((r) => r.id !== id));
      toast.success("✅ DÖF silindi");
    } catch (error: any) {
      toast.error("Silme işlemi başarısız");
    }
  };

  const updateStatus = async (id: string, status: CAPAStatus) => {
    try {
      const { error } = await supabase
        .from("capa_records")
        .update({
          status: status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      setRecords(records.map((r) => (r.id === id ? { ...r, status } : r)));
      toast.success(`✅ Durum güncellendi: ${status}`);
    } catch (error) {
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
    açık: records.filter((r) => r.status === "Açık").length,
    devamEdiyor: records.filter((r) => r.status === "Devam Ediyor").length,
    tamamlandı: records.filter((r) => r.status === "Tamamlandı").length,
    gecmiş: records.filter((r) => r.status !== "Tamamlandı" && isPast(parseISO(r.deadline))).length,
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            📋 DÖF Yönetim Sistemi
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Düzeltici ve Önleyici Faaliyetler — Uygunsuzluk takibi, durum yönetimi
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

              {/* DÜZELTICI FAALIYET */}
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
          <p className="text-2xl font-bold text-destructive">{stats.açık}</p>
        </div>
        <div className="glass-card p-4 border border-warning/30 bg-warning/5 space-y-2">
          <p className="text-xs text-warning">🟡 Devam Ediyor</p>
          <p className="text-2xl font-bold text-warning">{stats.devamEdiyor}</p>
        </div>
        <div className="glass-card p-4 border border-success/30 bg-success/5 space-y-2">
          <p className="text-xs text-success">✅ Tamamlandı</p>
          <p className="text-2xl font-bold text-success">{stats.tamamlandı}</p>
        </div>
        <div className="glass-card p-4 border border-red-500/30 bg-red-500/5 space-y-2">
          <p className="text-xs text-red-600">⚠️ Gecikmiş</p>
          <p className="text-2xl font-bold text-red-600">{stats.gecmiş}</p>
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
                    <tr key={record.id} className={isOverdue ? "bg-red-500/5" : ""}>
                      <td className="px-4 py-3 font-mono text-primary">{record.id}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate">{record.non_conformity}</td>
                      <td className="px-4 py-3">{record.assigned_person}</td>
                      <td className={`px-4 py-3 ${isOverdue ? "text-red-600 font-bold" : ""}`}>
                        {record.deadline} {isOverdue && "⚠️"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded ${priorCfg.color}`}>
                          {priorCfg.icon} {record.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Select value={record.status} onValueChange={(v) => updateStatus(record.id, v as CAPAStatus)}>
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card">
                            <SelectItem value="Açık">🔴 Açık</SelectItem>
                            <SelectItem value="Devam Ediyor">🟡 Devam</SelectItem>
                            <SelectItem value="Tamamlandı">✅ Tamamlandı</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(record)}
                          className="gap-2"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(record.id)}
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
    </div>
  );
}