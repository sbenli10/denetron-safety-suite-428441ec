import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteOsgbPersonnel,
  listOsgbAssignments,
  listOsgbPersonnel,
  type OsgbAssignmentRecord,
  type OsgbPersonnelInput,
  type OsgbPersonnelRecord,
  upsertOsgbPersonnel,
} from "@/lib/osgbOperations";

type PersonnelFormState = {
  fullName: string;
  role: OsgbPersonnelRecord["role"];
  certificateNo: string;
  certificateExpiryDate: string;
  expertiseAreas: string;
  phone: string;
  email: string;
  monthlyCapacityMinutes: string;
  isActive: "active" | "passive";
  notes: string;
};

const emptyForm: PersonnelFormState = {
  fullName: "",
  role: "igu",
  certificateNo: "",
  certificateExpiryDate: "",
  expertiseAreas: "",
  phone: "",
  email: "",
  monthlyCapacityMinutes: "",
  isActive: "active",
  notes: "",
};

const roleLabels: Record<OsgbPersonnelRecord["role"], string> = {
  igu: "İGU",
  hekim: "İşyeri Hekimi",
  dsp: "DSP",
};

const roleIcons = {
  igu: ShieldCheck,
  hekim: Stethoscope,
  dsp: UserCog,
};

const roleBadgeClass: Record<OsgbPersonnelRecord["role"], string> = {
  igu: "bg-cyan-500/15 text-cyan-200 border-cyan-400/20",
  hekim: "bg-emerald-500/15 text-emerald-200 border-emerald-400/20",
  dsp: "bg-violet-500/15 text-violet-200 border-violet-400/20",
};

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("tr-TR");
};

export default function OSGBPersonnel() {
  const { user } = useAuth();
  const [records, setRecords] = useState<OsgbPersonnelRecord[]>([]);
  const [assignments, setAssignments] = useState<OsgbAssignmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OsgbPersonnelRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [form, setForm] = useState<PersonnelFormState>(emptyForm);

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [personnelRows, assignmentRows] = await Promise.all([
        listOsgbPersonnel(user.id),
        listOsgbAssignments(user.id),
      ]);
      setRecords(personnelRows);
      setAssignments(assignmentRows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Personel havuzu yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [user?.id]);

  const loadByPersonnelId = useMemo(
    () =>
      assignments
        .filter((assignment) => assignment.status === "active")
        .reduce<Record<string, number>>((acc, assignment) => {
          acc[assignment.personnel_id] = (acc[assignment.personnel_id] || 0) + assignment.assigned_minutes;
          return acc;
        }, {}),
    [assignments],
  );

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesRole = roleFilter === "ALL" || record.role === roleFilter;
      const matchesStatus = statusFilter === "ALL" || (statusFilter === "active" ? record.is_active : !record.is_active);
      const matchesQuery =
        !query ||
        [
          record.full_name,
          record.email || "",
          record.phone || "",
          record.certificate_no || "",
          ...(record.expertise_areas || []),
          roleLabels[record.role],
        ].some((value) => value.toLowerCase().includes(query));
      return matchesRole && matchesStatus && matchesQuery;
    });
  }, [records, roleFilter, search, statusFilter]);

  const summary = useMemo(() => {
    const active = records.filter((item) => item.is_active).length;
    const expiringSoon = records.filter((item) => {
      if (!item.certificate_expiry_date) return false;
      const diff = new Date(item.certificate_expiry_date).getTime() - Date.now();
      return diff >= 0 && diff <= 1000 * 60 * 60 * 24 * 45;
    }).length;
    return {
      active,
      igu: records.filter((item) => item.role === "igu" && item.is_active).length,
      hekim: records.filter((item) => item.role === "hekim" && item.is_active).length,
      dsp: records.filter((item) => item.role === "dsp" && item.is_active).length,
      expiringSoon,
    };
  }, [records]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (record: OsgbPersonnelRecord) => {
    setEditing(record);
    setForm({
      fullName: record.full_name,
      role: record.role,
      certificateNo: record.certificate_no || "",
      certificateExpiryDate: record.certificate_expiry_date || "",
      expertiseAreas: (record.expertise_areas || []).join(", "),
      phone: record.phone || "",
      email: record.email || "",
      monthlyCapacityMinutes: String(record.monthly_capacity_minutes || ""),
      isActive: record.is_active ? "active" : "passive",
      notes: record.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user?.id || !form.fullName || !form.monthlyCapacityMinutes) {
      toast.error("Ad soyad ve aylık kapasite zorunludur.");
      return;
    }

    setSaving(true);
    try {
      const payload: OsgbPersonnelInput = {
        fullName: form.fullName,
        role: form.role,
        certificateNo: form.certificateNo,
        certificateExpiryDate: form.certificateExpiryDate,
        expertiseAreas: form.expertiseAreas
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        phone: form.phone,
        email: form.email,
        monthlyCapacityMinutes: Number(form.monthlyCapacityMinutes),
        isActive: form.isActive === "active",
        notes: form.notes,
      };

      const saved = await upsertOsgbPersonnel(user.id, payload, editing?.id);
      setRecords((prev) => (editing ? prev.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...prev]));
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
      toast.success(editing ? "Personel kaydı güncellendi." : "Personel havuza eklendi.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Personel kaydı kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu personeli havuzdan silmek istiyor musunuz?")) return;
    try {
      await deleteOsgbPersonnel(id);
      setRecords((prev) => prev.filter((item) => item.id !== id));
      setAssignments((prev) => prev.filter((item) => item.personnel_id !== id));
      toast.success("Personel kaydı silindi.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Personel kaydı silinemedi.");
    }
  };

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-200">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">OSGB Personel Havuzu</h1>
              <p className="text-sm text-slate-400">
                İGU, işyeri hekimi ve DSP personellerini tek havuzdan yönetin. Belge geçerlilikleri, uzmanlık alanları ve kapasite dolulukları birlikte izlenir.
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void loadData()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Yenile
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Personel ekle
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="border-slate-800 bg-slate-950/70"><CardHeader className="pb-2"><CardDescription>Aktif personel</CardDescription><CardTitle className="text-3xl text-white">{summary.active}</CardTitle></CardHeader></Card>
        <Card className="border-slate-800 bg-slate-950/70"><CardHeader className="pb-2"><CardDescription>İGU</CardDescription><CardTitle className="text-3xl text-white">{summary.igu}</CardTitle></CardHeader></Card>
        <Card className="border-slate-800 bg-slate-950/70"><CardHeader className="pb-2"><CardDescription>İşyeri hekimi</CardDescription><CardTitle className="text-3xl text-white">{summary.hekim}</CardTitle></CardHeader></Card>
        <Card className="border-slate-800 bg-slate-950/70"><CardHeader className="pb-2"><CardDescription>DSP</CardDescription><CardTitle className="text-3xl text-white">{summary.dsp}</CardTitle></CardHeader></Card>
        <Card className="border-slate-800 bg-slate-950/70"><CardHeader className="pb-2"><CardDescription>Belgesi yaklaşan</CardDescription><CardTitle className="text-3xl text-white">{summary.expiringSoon}</CardTitle></CardHeader></Card>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Personel verisi yüklenemedi</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-slate-800 bg-slate-950/70">
        <CardHeader className="pb-4">
          <CardTitle className="text-white">Filtreler</CardTitle>
          <CardDescription>Rol, durum ve arama ile personel havuzunu yönetin.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Arama</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ad, belge no, uzmanlık veya e-posta..." className="pl-9" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger><SelectValue placeholder="Tüm roller" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tüm roller</SelectItem>
                <SelectItem value="igu">İGU</SelectItem>
                <SelectItem value="hekim">İşyeri Hekimi</SelectItem>
                <SelectItem value="dsp">DSP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Durum</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Tüm durumlar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tüm durumlar</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="passive">Pasif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-950/70">
        <CardHeader>
          <CardTitle className="text-white">Personel listesi</CardTitle>
          <CardDescription>Belge geçerliliği, uzmanlık alanı ve kapasite doluluğu birlikte gösterilir.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">Personel havuzu yükleniyor...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800">
                  <TableHead>Personel</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Belge / Geçerlilik</TableHead>
                  <TableHead>Uzmanlık alanı</TableHead>
                  <TableHead>Kapasite</TableHead>
                  <TableHead>Doluluk</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => {
                  const assignedMinutes = loadByPersonnelId[record.id] || 0;
                  const ratio = record.monthly_capacity_minutes > 0 ? Math.round((assignedMinutes / record.monthly_capacity_minutes) * 100) : 0;
                  const RoleIcon = roleIcons[record.role];

                  return (
                    <TableRow key={record.id} className="border-slate-800">
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-white">{record.full_name}</div>
                          <div className="text-xs text-slate-400">{record.email || "-"} {record.phone ? `• ${record.phone}` : ""}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={roleBadgeClass[record.role]}><RoleIcon className="mr-1 h-3.5 w-3.5" />{roleLabels[record.role]}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          <div className="text-white">{record.certificate_no || "-"}</div>
                          <div className="flex items-center gap-1 text-slate-400">
                            <CalendarClock className="h-3.5 w-3.5" />
                            {formatDate(record.certificate_expiry_date)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(record.expertise_areas || []).length > 0
                            ? record.expertise_areas?.map((item) => (
                                <Badge key={item} variant="outline" className="border-slate-700 text-slate-300">{item}</Badge>
                              ))
                            : <span className="text-xs text-slate-500">Tanımlanmadı</span>}
                        </div>
                      </TableCell>
                      <TableCell>{record.monthly_capacity_minutes} dk</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm text-white">{assignedMinutes} dk / %{Math.min(ratio, 999)}</div>
                          <div className="h-2 rounded-full bg-slate-800">
                            <div className={`h-2 rounded-full ${ratio >= 100 ? "bg-red-500" : ratio >= 80 ? "bg-yellow-500" : "bg-cyan-500"}`} style={{ width: `${Math.min(ratio, 100)}%` }} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(record)}>Düzenle</Button>
                          <Button size="sm" variant="ghost" className="text-rose-300 hover:text-rose-200" onClick={() => void handleDelete(record.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Personel kaydını düzenle" : "Yeni personel ekle"}</DialogTitle>
            <DialogDescription>OSGB personel havuzuna yeni personel ekleyin veya mevcut kaydı güncelleyin.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Ad soyad</Label>
              <Input value={form.fullName} onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={form.role} onValueChange={(value) => setForm((prev) => ({ ...prev, role: value as PersonnelFormState["role"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="igu">İGU</SelectItem>
                  <SelectItem value="hekim">İşyeri Hekimi</SelectItem>
                  <SelectItem value="dsp">DSP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Aylık kapasite (dk)</Label>
              <Input type="number" min="0" value={form.monthlyCapacityMinutes} onChange={(e) => setForm((prev) => ({ ...prev, monthlyCapacityMinutes: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Belge numarası</Label>
              <Input value={form.certificateNo} onChange={(e) => setForm((prev) => ({ ...prev, certificateNo: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Belge geçerlilik tarihi</Label>
              <Input type="date" value={form.certificateExpiryDate} onChange={(e) => setForm((prev) => ({ ...prev, certificateExpiryDate: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Uzmanlık alanları</Label>
              <Input value={form.expertiseAreas} onChange={(e) => setForm((prev) => ({ ...prev, expertiseAreas: e.target.value }))} placeholder="İnşaat, üretim, perakende..." />
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>E-posta</Label>
              <Input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Durum</Label>
              <Select value={form.isActive} onValueChange={(value) => setForm((prev) => ({ ...prev, isActive: value as PersonnelFormState["isActive"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="passive">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notlar</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Vazgeç</Button>
            <Button onClick={() => void handleSave()} disabled={saving}>{saving ? "Kaydediliyor..." : editing ? "Güncelle" : "Kaydet"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
