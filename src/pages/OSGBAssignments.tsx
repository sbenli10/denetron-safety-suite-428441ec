import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Briefcase,
  Gauge,
  Plus,
  RefreshCcw,
  Search,
  ShieldBan,
  Trash2,
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
  deleteOsgbAssignment,
  getAssignmentRecommendation,
  getOsgbCompanyOptions,
  listOsgbAssignments,
  listOsgbPersonnel,
  type OsgbAssignmentInput,
  type OsgbAssignmentRecord,
  type OsgbCompanyOption,
  type OsgbPersonnelRecord,
  upsertOsgbAssignment,
} from "@/lib/osgbOperations";
import { readOsgbPageCache, writeOsgbPageCache } from "@/lib/osgbPageCache";
import { useAccessRole } from "@/hooks/useAccessRole";
import { downloadCsv } from "@/lib/csvExport";

type AssignmentFormState = {
  companyId: string;
  personnelId: string;
  assignedRole: OsgbAssignmentRecord["assigned_role"];
  assignedMinutes: string;
  startDate: string;
  endDate: string;
  status: OsgbAssignmentRecord["status"];
  notes: string;
};

const emptyForm: AssignmentFormState = {
  companyId: "",
  personnelId: "",
  assignedRole: "igu",
  assignedMinutes: "",
  startDate: "",
  endDate: "",
  status: "active",
  notes: "",
};

const statusLabel: Record<OsgbAssignmentRecord["status"], string> = {
  active: "Aktif",
  passive: "Pasif",
  completed: "TamamlandÄ±",
  cancelled: "Ä°ptal",
};

const roleLabel: Record<OsgbAssignmentRecord["assigned_role"], string> = {
  igu: "Ä°GU",
  hekim: "Ä°ÅŸyeri Hekimi",
  dsp: "DSP",
};

const statusClass: Record<OsgbAssignmentRecord["status"], string> = {
  active: "bg-emerald-500/15 text-emerald-200 border-emerald-400/20",
  passive: "bg-slate-500/15 text-slate-200 border-slate-400/20",
  completed: "bg-cyan-500/15 text-cyan-200 border-cyan-400/20",
  cancelled: "bg-rose-500/15 text-rose-200 border-rose-400/20",
};

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("tr-TR");
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const getCacheKey = (userId: string) => `assignments:${userId}`;

export default function OSGBAssignments() {
  const { user } = useAuth();
  const { canManage } = useAccessRole();
  const [records, setRecords] = useState<OsgbAssignmentRecord[]>([]);
  const [companies, setCompanies] = useState<OsgbCompanyOption[]>([]);
  const [personnel, setPersonnel] = useState<OsgbPersonnelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OsgbAssignmentRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [form, setForm] = useState<AssignmentFormState>(emptyForm);

  const loadData = async (silent = false) => {
    if (!user?.id) return;
    if (!silent) setLoading(true);
    try {
      const [assignmentRows, companyRows, personnelRows] = await Promise.all([
        listOsgbAssignments(user.id),
        getOsgbCompanyOptions(user.id),
        listOsgbPersonnel(user.id),
      ]);
      setRecords(assignmentRows);
      setCompanies(companyRows);
      setPersonnel(personnelRows.filter((item) => item.is_active));
      writeOsgbPageCache(getCacheKey(user.id), {
        records: assignmentRows,
        companies: companyRows,
        personnel: personnelRows.filter((item) => item.is_active),
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Personel gÃ¶revlendirme verisi yÃ¼klenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    const cached = readOsgbPageCache<{
      records: OsgbAssignmentRecord[];
      companies: OsgbCompanyOption[];
      personnel: OsgbPersonnelRecord[];
    }>(getCacheKey(user.id), CACHE_TTL_MS);
    if (cached) {
      setRecords(cached.records);
      setCompanies(cached.companies);
      setPersonnel(cached.personnel);
      setLoading(false);
      void loadData(true);
      return;
    }
    void loadData();
  }, [user?.id]);

  const livePersonnelCapacity = useMemo(() => {
    if (!form.personnelId) return null;
    const selected = personnel.find((item) => item.id === form.personnelId);
    if (!selected) return null;

    const currentAssigned = records
      .filter((record) => record.personnel_id === form.personnelId && record.status === "active" && record.id !== editing?.id)
      .reduce((sum, record) => sum + record.assigned_minutes, 0);

    const requested = Number(form.assignedMinutes || 0);
    const totalProjected = currentAssigned + requested;
    const remaining = selected.monthly_capacity_minutes - totalProjected;
    const ratio = selected.monthly_capacity_minutes > 0
      ? Math.round((totalProjected / selected.monthly_capacity_minutes) * 100)
      : 0;

    return {
      selected,
      currentAssigned,
      totalProjected,
      remaining,
      ratio,
      exceeded: remaining < 0,
    };
  }, [editing?.id, form.assignedMinutes, form.personnelId, personnel, records]);

  const liveCompanyRequirement = useMemo(() => {
    if (!form.companyId) return null;
    const selected = companies.find((item) => item.id === form.companyId);
    if (!selected) return null;

    const currentAssigned = records
      .filter((record) => record.company_id === form.companyId && record.status === "active" && record.id !== editing?.id)
      .reduce((sum, record) => sum + record.assigned_minutes, 0);

    const requested = Number(form.assignedMinutes || 0);
    const totalProjected = currentAssigned + requested;
    const required = selected.requiredMinutes || 0;
    const gap = Math.max(0, required - totalProjected);
    const ratio = required > 0 ? Math.round((totalProjected / required) * 100) : 0;

    return {
      selected,
      currentAssigned,
      totalProjected,
      required,
      gap,
      ratio,
      stillInsufficient: gap > 0,
    };
  }, [companies, editing?.id, form.assignedMinutes, form.companyId, records]);

  const regulationRecommendation = useMemo(() => {
    const selectedCompany = companies.find((item) => item.id === form.companyId);
    return getAssignmentRecommendation(
      selectedCompany,
      form.assignedRole,
      liveCompanyRequirement?.currentAssigned ?? 0,
    );
  }, [companies, form.assignedRole, form.companyId, liveCompanyRequirement?.currentAssigned]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesStatus = statusFilter === "ALL" || record.status === statusFilter;
      const matchesQuery =
        !query ||
        [
          record.company?.company_name || "",
          record.personnel?.full_name || "",
          record.notes || "",
          roleLabel[record.assigned_role],
        ].some((value) => value.toLowerCase().includes(query));
      return matchesStatus && matchesQuery;
    });
  }, [records, search, statusFilter]);

  const summary = useMemo(() => {
    const active = records.filter((item) => item.status === "active").length;
    const pendingCompanyIds = new Set(
      companies.filter((company) => !records.some((record) => record.company_id === company.id && record.status === "active")).map((company) => company.id),
    );
    return {
      active,
      total: records.length,
      unassignedCompanies: pendingCompanyIds.size,
    };
  }, [companies, records]);

  const openCreate = () => {
    if (!canManage) {
      toast.error("Bu iÅŸlem iÃ§in dÃ¼zenleme yetkisi gerekiyor.");
      return;
    }
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (record: OsgbAssignmentRecord) => {
    if (!canManage) {
      toast.error("Bu iÅŸlem iÃ§in dÃ¼zenleme yetkisi gerekiyor.");
      return;
    }
    setEditing(record);
    setForm({
      companyId: record.company_id,
      personnelId: record.personnel_id,
      assignedRole: record.assigned_role,
      assignedMinutes: String(record.assigned_minutes || ""),
      startDate: record.start_date || "",
      endDate: record.end_date || "",
      status: record.status,
      notes: record.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!canManage) {
      toast.error("Bu iÅŸlem iÃ§in dÃ¼zenleme yetkisi gerekiyor.");
      return;
    }
    if (!user?.id || !form.companyId || !form.personnelId || !form.assignedMinutes) {
      toast.error("Firma, personel ve dakika alanlarÄ± zorunludur.");
      return;
    }
    if (Number(form.assignedMinutes) <= 0) {
      toast.error("Atanan dakika sÄ±fÄ±rdan bÃ¼yÃ¼k olmalÄ±dÄ±r.");
      return;
    }
    if (form.startDate && form.endDate && new Date(form.startDate) > new Date(form.endDate)) {
      toast.error("BitiÅŸ tarihi baÅŸlangÄ±Ã§ tarihinden Ã¶nce olamaz.");
      return;
    }
    if (livePersonnelCapacity?.exceeded) {
      toast.error("SeÃ§ilen personelin kapasitesi aÅŸÄ±lÄ±yor.");
      return;
    }

    setSaving(true);
    try {
      const payload: OsgbAssignmentInput = {
        companyId: form.companyId,
        personnelId: form.personnelId,
        assignedRole: form.assignedRole,
        assignedMinutes: Number(form.assignedMinutes),
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
        notes: form.notes,
      };
      const saved = await upsertOsgbAssignment(user.id, payload, editing?.id);
      setRecords((prev) => (editing ? prev.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...prev]));
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
      toast.success(editing ? "GÃ¶revlendirme gÃ¼ncellendi." : "Personel firmaya atandÄ±.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "GÃ¶revlendirme kaydÄ± kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManage) {
      toast.error("Bu iÅŸlem iÃ§in dÃ¼zenleme yetkisi gerekiyor.");
      return;
    }
    if (!confirm("Bu gÃ¶revlendirmeyi silmek istiyor musunuz?")) return;
    try {
      await deleteOsgbAssignment(id);
      setRecords((prev) => prev.filter((item) => item.id !== id));
      toast.success("GÃ¶revlendirme silindi.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "GÃ¶revlendirme silinemedi.");
    }
  };

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-200">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">OSGB Personel GÃ¶revlendirme</h1>
              <p className="text-sm text-slate-400">
                Her firmaya tek aktif atama kuralÄ± ile personel gÃ¶revlendirin. MÃ¼kerrer aktif atamalar hem uygulamada hem veritabanÄ±nda engellenir.
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void loadData()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Yenile
          </Button>
          <Button onClick={openCreate} disabled={!canManage}>
            <Plus className="mr-2 h-4 w-4" />
            GÃ¶revlendirme oluÅŸtur
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-800 bg-slate-950/70"><CardHeader className="pb-2"><CardDescription>Aktif atama</CardDescription><CardTitle className="text-3xl text-white">{summary.active}</CardTitle></CardHeader><CardContent className="text-xs text-slate-400">Åžu an aktif durumda olan firma atamalarÄ±.</CardContent></Card>
        <Card className="border-slate-800 bg-slate-950/70"><CardHeader className="pb-2"><CardDescription>Toplam kayÄ±t</CardDescription><CardTitle className="text-3xl text-white">{summary.total}</CardTitle></CardHeader><CardContent className="text-xs text-slate-400">Aktif, pasif, tamamlanan ve iptal edilen tÃ¼m kayÄ±tlar.</CardContent></Card>
        <Card className="border-slate-800 bg-slate-950/70"><CardHeader className="pb-2"><CardDescription>AtanmamÄ±ÅŸ firma</CardDescription><CardTitle className="text-3xl text-white">{summary.unassignedCompanies}</CardTitle></CardHeader><CardContent className="text-xs text-slate-400">HenÃ¼z aktif personel atanmamÄ±ÅŸ firma sayÄ±sÄ±.</CardContent></Card>
      </div>

      <Alert>
        <ShieldBan className="h-4 w-4" />
        <AlertTitle>MÃ¼kerrer atama engeli aktif</AlertTitle>
        <AlertDescription>Bir firmada aynÄ± anda yalnÄ±zca bir aktif personel gÃ¶revlendirmesi olabilir. Yeni aktif kayÄ±t eklenmeye Ã§alÄ±ÅŸÄ±lÄ±rsa iÅŸlem reddedilir.</AlertDescription>
      </Alert>

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>GÃ¶revlendirme verisi yÃ¼klenemedi</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-slate-800 bg-slate-950/70">
        <CardHeader className="pb-4">
          <CardTitle className="text-white">Filtreler</CardTitle>
          <CardDescription>Firma gÃ¶revlendirmelerini hÄ±zlÄ±ca bulun ve yÃ¶netin.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="space-y-2">
            <Label>Arama</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Firma, personel veya rol ara..." className="pl-9" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Durum</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="TÃ¼m durumlar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">TÃ¼m durumlar</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="passive">Pasif</SelectItem>
                <SelectItem value="completed">TamamlandÄ±</SelectItem>
                <SelectItem value="cancelled">Ä°ptal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-950/70">
        <CardHeader>
          <CardTitle className="text-white">Atama listesi</CardTitle>
          <CardDescription>Firma baÅŸÄ±na tek aktif atama standardÄ± ile yÃ¶netilen atamalar.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">GÃ¶revlendirme kayÄ±tlarÄ± yÃ¼kleniyor...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800">
                  <TableHead>Firma</TableHead>
                  <TableHead>Personel</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Atanan sÃ¼re</TableHead>
                  <TableHead>Tarih aralÄ±ÄŸÄ±</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">Ä°ÅŸlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id} className="border-slate-800">
                    <TableCell className="font-medium text-white">{record.company?.company_name || "Firma"}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-white">{record.personnel?.full_name || "-"}</div>
                        <div className="text-xs text-slate-400">{record.notes || "-"}</div>
                      </div>
                    </TableCell>
                    <TableCell>{roleLabel[record.assigned_role]}</TableCell>
                    <TableCell>{record.assigned_minutes} dk</TableCell>
                    <TableCell>{formatDate(record.start_date)} - {formatDate(record.end_date)}</TableCell>
                    <TableCell><Badge className={statusClass[record.status]}>{statusLabel[record.status]}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(record)}>DÃ¼zenle</Button>
                        <Button size="sm" variant="ghost" className="text-rose-300 hover:text-rose-200" onClick={() => void handleDelete(record.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "GÃ¶revlendirme dÃ¼zenle" : "Yeni gÃ¶revlendirme oluÅŸtur"}</DialogTitle>
            <DialogDescription>Firma, personel ve dakika bilgilerini girin. Bir firmada tek aktif assignment kuralÄ± uygulanÄ±r.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Firma</Label>
              <Select value={form.companyId} onValueChange={(value) => setForm((prev) => ({ ...prev, companyId: value }))}>
                <SelectTrigger><SelectValue placeholder="Firma seÃ§in" /></SelectTrigger>
                <SelectContent>{companies.map((company) => <SelectItem key={company.id} value={company.id}>{company.companyName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Personel</Label>
              <Select value={form.personnelId} onValueChange={(value) => setForm((prev) => ({ ...prev, personnelId: value }))}>
                <SelectTrigger><SelectValue placeholder="Personel seÃ§in" /></SelectTrigger>
                <SelectContent>{personnel.map((item) => <SelectItem key={item.id} value={item.id}>{item.full_name} â€¢ {item.role.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>GÃ¶revlendirme rolÃ¼</Label>
              <Select value={form.assignedRole} onValueChange={(value) => setForm((prev) => ({ ...prev, assignedRole: value as AssignmentFormState["assignedRole"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="igu">Ä°GU</SelectItem>
                  <SelectItem value="hekim">Ä°ÅŸyeri Hekimi</SelectItem>
                  <SelectItem value="dsp">DSP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Atanan sÃ¼re (dk)</Label>
              <Input type="number" min="0" value={form.assignedMinutes} onChange={(e) => setForm((prev) => ({ ...prev, assignedMinutes: e.target.value }))} />
            </div>
            {regulationRecommendation ? (
              <div className="space-y-2 md:col-span-2">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Mevzuat Ã¶neri motoru</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <div>{regulationRecommendation.summary}</div>
                    <div className="text-xs text-slate-400">
                      KiÅŸi baÅŸÄ± Ã¶neri: {regulationRecommendation.perEmployeeMinutes} dk â€¢ Toplam Ã¶neri: {regulationRecommendation.recommendedMinutes} dk â€¢ Mevcut aktif toplam: {regulationRecommendation.currentAssignedMinutes} dk
                    </div>
                    <div className="text-xs text-slate-400">
                      Kalan mevzuat aÃ§Ä±ÄŸÄ±: {regulationRecommendation.remainingGapMinutes} dk â€¢ Dayanak: {regulationRecommendation.legalReference}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          assignedMinutes: String(
                            regulationRecommendation.remainingGapMinutes > 0
                              ? regulationRecommendation.remainingGapMinutes
                              : regulationRecommendation.recommendedMinutes,
                          ),
                        }))
                      }
                    >
                      Ã–nerilen dakikayÄ± uygula
                    </Button>
                  </AlertDescription>
                </Alert>
              </div>
            ) : null}
            {liveCompanyRequirement ? (
              <div className="space-y-2 md:col-span-2">
                <Alert variant={liveCompanyRequirement.stillInsufficient ? "destructive" : "default"}>
                  <Gauge className="h-4 w-4" />
                  <AlertTitle>{liveCompanyRequirement.selected.companyName} iÃ§in gerekli sÃ¼re karÅŸÄ±laÅŸtÄ±rmasÄ±</AlertTitle>
                  <AlertDescription>
                    Gerekli: {liveCompanyRequirement.required} dk â€¢ Mevcut aktif atama: {liveCompanyRequirement.currentAssigned} dk â€¢ Bu kayÄ±tla toplam: {liveCompanyRequirement.totalProjected} dk â€¢ Kalan fark: {liveCompanyRequirement.gap} dk
                  </AlertDescription>
                </Alert>
              </div>
            ) : null}
            {livePersonnelCapacity ? (
              <div className="space-y-2 md:col-span-2">
                <Alert variant={livePersonnelCapacity.exceeded ? "destructive" : "default"}>
                  <Gauge className="h-4 w-4" />
                  <AlertTitle>{livePersonnelCapacity.selected.full_name} iÃ§in canlÄ± kapasite gÃ¶rÃ¼nÃ¼mÃ¼</AlertTitle>
                  <AlertDescription>
                    Mevcut yÃ¼k: {livePersonnelCapacity.currentAssigned} dk â€¢ Bu atama ile toplam: {livePersonnelCapacity.totalProjected} dk / {livePersonnelCapacity.selected.monthly_capacity_minutes} dk â€¢ Kalan: {livePersonnelCapacity.remaining} dk
                  </AlertDescription>
                </Alert>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>BaÅŸlangÄ±Ã§ tarihi</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>BitiÅŸ tarihi</Label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Durum</Label>
              <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as AssignmentFormState["status"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="passive">Pasif</SelectItem>
                  <SelectItem value="completed">TamamlandÄ±</SelectItem>
                  <SelectItem value="cancelled">Ä°ptal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notlar</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>VazgeÃ§</Button>
            <Button onClick={() => void handleSave()} disabled={saving || livePersonnelCapacity?.exceeded}>
              {saving ? "Kaydediliyor..." : editing ? "GÃ¼ncelle" : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

