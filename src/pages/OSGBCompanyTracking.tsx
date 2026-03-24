import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CircleAlert,
  FileClock,
  Plus,
  RefreshCcw,
  Search,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getOsgbCompanyTrackingPage,
  listOsgbAssignments,
  listOsgbDocuments,
  listOsgbFinance,
  listOsgbPersonnel,
  type OsgbAssignmentInput,
  type OsgbAssignmentRecord,
  type OsgbCompanyTrackingRecord,
  type OsgbDocumentRecord,
  type OsgbDocumentInput,
  type OsgbFinanceRecord,
  type OsgbFinanceInput,
  type OsgbPersonnelRecord,
  upsertOsgbAssignment,
  upsertOsgbDocument,
  upsertOsgbFinance,
} from "@/lib/osgbOperations";
import { readOsgbPageCache, writeOsgbPageCache } from "@/lib/osgbPageCache";
import { useAccessRole } from "@/hooks/useAccessRole";

const money = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value || 0);

const assignmentStatusLabel: Record<OsgbCompanyTrackingRecord["assignmentStatus"], string> = {
  atandi: "Atama tamam",
  eksik: "Eksik süre",
  atanmamis: "Atama yok",
};

const assignmentStatusClass: Record<OsgbCompanyTrackingRecord["assignmentStatus"], string> = {
  atandi: "bg-emerald-500/15 text-emerald-200 border-emerald-400/20",
  eksik: "bg-yellow-500/15 text-yellow-200 border-yellow-400/20",
  atanmamis: "bg-rose-500/15 text-rose-200 border-rose-400/20",
};

type AssignmentQuickForm = {
  personnelId: string;
  assignedRole: "igu" | "hekim" | "dsp";
  assignedMinutes: string;
  startDate: string;
  endDate: string;
  notes: string;
};

type FinanceQuickForm = {
  invoiceNo: string;
  servicePeriod: string;
  dueDate: string;
  amount: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  paymentNote: string;
};

type DocumentQuickForm = {
  documentType: string;
  documentName: string;
  expiryDate: string;
  status: "active" | "warning" | "expired" | "archived";
  notes: string;
};

const emptyAssignmentForm: AssignmentQuickForm = {
  personnelId: "",
  assignedRole: "igu",
  assignedMinutes: "",
  startDate: "",
  endDate: "",
  notes: "",
};

const emptyFinanceForm: FinanceQuickForm = {
  invoiceNo: "",
  servicePeriod: "",
  dueDate: "",
  amount: "",
  status: "pending",
  paymentNote: "",
};

const emptyDocumentForm: DocumentQuickForm = {
  documentType: "risk_assessment",
  documentName: "",
  expiryDate: "",
  status: "active",
  notes: "",
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const getCacheKey = (userId: string) => `company-tracking:${userId}`;
const COMPANY_TRACKING_PAGE_SIZE = 10;

export default function OSGBCompanyTracking() {
  const { user } = useAuth();
  const { canManage } = useAccessRole();
  const [records, setRecords] = useState<OsgbCompanyTrackingRecord[]>([]);
  const [personnel, setPersonnel] = useState<OsgbPersonnelRecord[]>([]);
  const [assignments, setAssignments] = useState<OsgbAssignmentRecord[]>([]);
  const [financeRecords, setFinanceRecords] = useState<OsgbFinanceRecord[]>([]);
  const [documentRecords, setDocumentRecords] = useState<OsgbDocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedCompany, setSelectedCompany] = useState<OsgbCompanyTrackingRecord | null>(null);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [documentOpen, setDocumentOpen] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState<AssignmentQuickForm>(emptyAssignmentForm);
  const [financeForm, setFinanceForm] = useState<FinanceQuickForm>(emptyFinanceForm);
  const [documentForm, setDocumentForm] = useState<DocumentQuickForm>(emptyDocumentForm);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [editingFinanceId, setEditingFinanceId] = useState<string | null>(null);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const loadData = async (silent = false) => {
    if (!user?.id) return;
    if (!silent) setLoading(true);
    try {
      const [trackingResult, personnelRows, assignmentRows, financeRows, documentRows] = await Promise.all([
        getOsgbCompanyTrackingPage(user.id, {
          page,
          pageSize: COMPANY_TRACKING_PAGE_SIZE,
          search,
          status: statusFilter,
        }),
        listOsgbPersonnel(user.id),
        listOsgbAssignments(user.id),
        listOsgbFinance(user.id),
        listOsgbDocuments(user.id),
      ]);
      setRecords(trackingResult.rows);
      setTotalCount(trackingResult.count);
      setPersonnel(personnelRows.filter((item) => item.is_active));
      setAssignments(assignmentRows);
      setFinanceRecords(financeRows);
      setDocumentRecords(documentRows);
      writeOsgbPageCache(`${getCacheKey(user.id)}:${statusFilter}:${search}:${page}`, {
        records: trackingResult.rows,
        totalCount: trackingResult.count,
        personnel: personnelRows.filter((item) => item.is_active),
        assignments: assignmentRows,
        financeRecords: financeRows,
        documentRecords: documentRows,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Firma takip verisi yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    const cached = readOsgbPageCache<{
      records: OsgbCompanyTrackingRecord[];
      totalCount: number;
      personnel: OsgbPersonnelRecord[];
      assignments: OsgbAssignmentRecord[];
      financeRecords: OsgbFinanceRecord[];
      documentRecords: OsgbDocumentRecord[];
    }>(`${getCacheKey(user.id)}:${statusFilter}:${search}:${page}`, CACHE_TTL_MS);
    if (cached) {
      setRecords(cached.records);
      setTotalCount(cached.totalCount);
      setPersonnel(cached.personnel);
      setAssignments(cached.assignments);
      setFinanceRecords(cached.financeRecords);
      setDocumentRecords(cached.documentRecords);
      setLoading(false);
      void loadData(true);
      return;
    }
    void loadData();
  }, [user?.id, page, search, statusFilter]);

  const summary = useMemo(
    () => ({
      tracked: totalCount,
      withExpiredDocs: records.filter((item) => item.documentSummary.expired > 0).length,
      withOverdueFinance: records.filter((item) => item.financeSummary.overdueAmount > 0).length,
      assignmentRisk: records.filter((item) => item.assignmentStatus !== "atandi").length,
    }),
    [records, totalCount],
  );
  const totalPages = Math.max(1, Math.ceil(totalCount / COMPANY_TRACKING_PAGE_SIZE));

  const selectedCompanyAssignments = useMemo(
    () =>
      selectedCompany
        ? assignments.filter((item) => item.company_id === selectedCompany.companyId && item.status === "active")
        : [],
    [assignments, selectedCompany],
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const selectedFinanceRecord = useMemo(() => {
    if (!selectedCompany) return null;
    const rows = financeRecords.filter((item) => item.company_id === selectedCompany.companyId);
    return rows.find((item) => item.status === "overdue")
      || rows.find((item) => item.status === "pending")
      || rows[0]
      || null;
  }, [financeRecords, selectedCompany]);

  const selectedDocumentRecord = useMemo(() => {
    if (!selectedCompany) return null;
    const rows = documentRecords.filter((item) => item.company_id === selectedCompany.companyId);
    return rows.find((item) => item.status === "expired")
      || rows.find((item) => item.status === "warning")
      || rows[0]
      || null;
  }, [documentRecords, selectedCompany]);

  const openQuickAssignment = () => {
    if (!canManage) {
      toast.error("Bu işlem için düzenleme yetkisi gerekiyor.");
      return;
    }
    const current = selectedCompanyAssignments[0];
    setEditingAssignmentId(current?.id || null);
    setAssignmentForm(current ? {
      personnelId: current.personnel_id,
      assignedRole: current.assigned_role,
      assignedMinutes: String(current.assigned_minutes || ""),
      startDate: current.start_date || "",
      endDate: current.end_date || "",
      notes: current.notes || "",
    } : {
      ...emptyAssignmentForm,
      assignedMinutes: String(selectedCompany?.requiredMinutes || ""),
    });
    setAssignmentOpen(true);
  };

  const handleQuickAssignmentSave = async () => {
    if (!canManage) {
      toast.error("Bu işlem için düzenleme yetkisi gerekiyor.");
      return;
    }
    if (!user?.id || !selectedCompany || !assignmentForm.personnelId || !assignmentForm.assignedMinutes) {
      toast.error("Personel ve dakika alanları zorunludur.");
      return;
    }

    setSaving(true);
    try {
      const payload: OsgbAssignmentInput = {
        companyId: selectedCompany.companyId,
        personnelId: assignmentForm.personnelId,
        assignedRole: assignmentForm.assignedRole,
        assignedMinutes: Number(assignmentForm.assignedMinutes),
        startDate: assignmentForm.startDate,
        endDate: assignmentForm.endDate,
        status: "active",
        notes: assignmentForm.notes,
      };
      await upsertOsgbAssignment(user.id, payload, editingAssignmentId || undefined);
      setAssignmentOpen(false);
      setAssignmentForm(emptyAssignmentForm);
      setEditingAssignmentId(null);
      await loadData();
      toast.success(editingAssignmentId ? "Assignment güncellendi." : "Firma için assignment oluşturuldu.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Assignment oluşturulamadı.");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickFinanceSave = async () => {
    if (!canManage) {
      toast.error("Bu işlem için düzenleme yetkisi gerekiyor.");
      return;
    }
    if (!user?.id || !selectedCompany || !financeForm.amount) {
      toast.error("Tutar zorunludur.");
      return;
    }

    setSaving(true);
    try {
      const payload: OsgbFinanceInput = {
        companyId: selectedCompany.companyId,
        invoiceNo: financeForm.invoiceNo,
        servicePeriod: financeForm.servicePeriod,
        dueDate: financeForm.dueDate,
        amount: Number(financeForm.amount),
        status: financeForm.status,
        paymentNote: financeForm.paymentNote,
      };
      await upsertOsgbFinance(user.id, payload, editingFinanceId || undefined);
      setFinanceOpen(false);
      setFinanceForm(emptyFinanceForm);
      setEditingFinanceId(null);
      await loadData();
      toast.success(editingFinanceId ? "Finans kaydı güncellendi." : "Finans kaydı oluşturuldu.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Finans kaydı oluşturulamadı.");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickDocumentSave = async () => {
    if (!canManage) {
      toast.error("Bu işlem için düzenleme yetkisi gerekiyor.");
      return;
    }
    if (!user?.id || !selectedCompany || !documentForm.documentName) {
      toast.error("Doküman adı zorunludur.");
      return;
    }

    setSaving(true);
    try {
      const payload: OsgbDocumentInput = {
        companyId: selectedCompany.companyId,
        documentType: documentForm.documentType,
        documentName: documentForm.documentName,
        expiryDate: documentForm.expiryDate,
        status: documentForm.status,
        notes: documentForm.notes,
      };
      await upsertOsgbDocument(user.id, payload, editingDocumentId || undefined);
      setDocumentOpen(false);
      setDocumentForm(emptyDocumentForm);
      setEditingDocumentId(null);
      await loadData();
      toast.success(editingDocumentId ? "Evrak kaydı güncellendi." : "Evrak kaydı oluşturuldu.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Evrak kaydı oluşturulamadı.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-200">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">OSGB Firma Takibi</h1>
              <p className="text-sm text-slate-400">
                Her firma için aktif personel ataması, evrak durumu, finans baskısı ve açık görevleri tek tabloda izleyin.
              </p>
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => void loadData()}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Yenile
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-slate-800 bg-slate-950/70"><CardHeader className="pb-2"><CardDescription>Takip edilen firma</CardDescription><CardTitle className="text-3xl text-white">{summary.tracked}</CardTitle></CardHeader><CardContent className="text-xs text-slate-400">Portföyde aktif görünen toplam firma.</CardContent></Card>
        <Card className="border-slate-800 bg-slate-950/70"><CardHeader className="pb-2"><CardDescription>Süresi dolan evrak</CardDescription><CardTitle className="text-3xl text-white">{summary.withExpiredDocs}</CardTitle></CardHeader><CardContent className="text-xs text-slate-400">En az bir süresi dolmuş evrakı olan firmalar.</CardContent></Card>
        <Card className="border-slate-800 bg-slate-950/70"><CardHeader className="pb-2"><CardDescription>Gecikmiş finans</CardDescription><CardTitle className="text-3xl text-white">{summary.withOverdueFinance}</CardTitle></CardHeader><CardContent className="text-xs text-slate-400">Gecikmiş ödeme kaydı bulunan firmalar.</CardContent></Card>
        <Card className="border-slate-800 bg-slate-950/70"><CardHeader className="pb-2"><CardDescription>Atama riski</CardDescription><CardTitle className="text-3xl text-white">{summary.assignmentRisk}</CardTitle></CardHeader><CardContent className="text-xs text-slate-400">Atanmamış veya eksik süreli firma sayısı.</CardContent></Card>
      </div>

      {error ? (
        <Alert variant="destructive">
          <CircleAlert className="h-4 w-4" />
          <AlertTitle>Firma takibi yüklenemedi</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-slate-800 bg-slate-950/70">
        <CardHeader className="pb-4">
          <CardTitle className="text-white">Filtreler</CardTitle>
          <CardDescription>Portföyü arama ve atama durumuna göre daraltın.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="space-y-2">
            <Label>Arama</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Firma veya atanan personel ara..." className="pl-9" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Atama durumu</Label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="ALL">Tüm durumlar</option>
              <option value="atandi">Atama tamam</option>
              <option value="eksik">Eksik süre</option>
              <option value="atanmamis">Atama yok</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-950/70">
        <CardHeader>
          <CardTitle className="text-white">Firma operasyon matrisi</CardTitle>
          <CardDescription>Evrak, finans, görev ve not yoğunluğunu tek satırda görün.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">Firma matrisi yükleniyor...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800">
                  <TableHead>Firma</TableHead>
                  <TableHead>Atama</TableHead>
                  <TableHead>Evrak</TableHead>
                  <TableHead>Finans</TableHead>
                  <TableHead>Görev / Not</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.companyId} className="border-slate-800">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-white">{record.companyName}</div>
                        <div className="text-xs text-slate-400">
                          {record.hazardClass} • {record.employeeCount} çalışan • Bitiş: {record.contractEnd || "-"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <Badge className={assignmentStatusClass[record.assignmentStatus]}>{assignmentStatusLabel[record.assignmentStatus]}</Badge>
                        <div className="text-xs text-slate-400">
                          {record.activeAssignment
                            ? `${record.activeAssignment.personnelName} • ${record.activeAssignment.assignedMinutes}/${record.requiredMinutes} dk`
                            : `Atama yok • Gerekli: ${record.requiredMinutes} dk`}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        <div className="text-emerald-300">Aktif: {record.documentSummary.active}</div>
                        <div className="text-yellow-300">Yaklaşan: {record.documentSummary.warning}</div>
                        <div className="text-rose-300">Süresi dolmuş: {record.documentSummary.expired}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        <div className="text-slate-300">Bekleyen: {money(record.financeSummary.pendingAmount)}</div>
                        <div className="text-rose-300">Geciken: {money(record.financeSummary.overdueAmount)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs text-slate-300">
                        <div>Açık görev: {record.openTaskCount}</div>
                        <div>Operasyon notu: {record.noteCount}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setSelectedCompany(record)}>Detay</Button>
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/osgb/documents?status=${record.documentSummary.expired > 0 ? "expired" : record.documentSummary.warning > 0 ? "warning" : "active"}`}>
                            <FileClock className="mr-2 h-4 w-4" />
                            Evrak
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/osgb/finance?status=${record.financeSummary.overdueAmount > 0 ? "overdue" : "pending"}`}>
                            <Wallet className="mr-2 h-4 w-4" />
                            Finans
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {totalCount > COMPANY_TRACKING_PAGE_SIZE ? (
            <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
              <span>Sayfa {page} / {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>Önceki</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>Sonraki</Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedCompany)} onOpenChange={(open) => !open && setSelectedCompany(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedCompany?.companyName}</DialogTitle>
            <DialogDescription>Firma bazlı operasyon özeti ve drawer içinden doğrudan işlem başlatma alanı.</DialogDescription>
          </DialogHeader>
          {selectedCompany ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-slate-800 bg-slate-950/70">
                  <CardHeader><CardTitle className="text-base text-white">Atama özeti</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm text-slate-300">
                    <div>Durum: <Badge className={assignmentStatusClass[selectedCompany.assignmentStatus]}>{assignmentStatusLabel[selectedCompany.assignmentStatus]}</Badge></div>
                    <div>Gerekli süre: {selectedCompany.requiredMinutes} dk</div>
                    <div>Atanan süre: {selectedCompany.assignedMinutes} dk</div>
                    <div>Aktif personel: {selectedCompany.activeAssignment?.personnelName || "-"}</div>
                    <div>Rol: {selectedCompany.activeAssignment?.role || "-"}</div>
                  </CardContent>
                </Card>
                <Card className="border-slate-800 bg-slate-950/70">
                  <CardHeader><CardTitle className="text-base text-white">Evrak özeti</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm text-slate-300">
                    <div>Aktif evrak: {selectedCompany.documentSummary.active}</div>
                    <div>Yaklaşan evrak: {selectedCompany.documentSummary.warning}</div>
                    <div>Süresi dolmuş evrak: {selectedCompany.documentSummary.expired}</div>
                  </CardContent>
                </Card>
                <Card className="border-slate-800 bg-slate-950/70">
                  <CardHeader><CardTitle className="text-base text-white">Finans özeti</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm text-slate-300">
                    <div>Bekleyen tutar: {money(selectedCompany.financeSummary.pendingAmount)}</div>
                    <div>Geciken tutar: {money(selectedCompany.financeSummary.overdueAmount)}</div>
                  </CardContent>
                </Card>
                <Card className="border-slate-800 bg-slate-950/70">
                  <CardHeader><CardTitle className="text-base text-white">Operasyon yoğunluğu</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm text-slate-300">
                    <div>Açık görev: {selectedCompany.openTaskCount}</div>
                    <div>Not sayısı: {selectedCompany.noteCount}</div>
                    <div>Tehlike sınıfı: {selectedCompany.hazardClass}</div>
                    <div>Çalışan sayısı: {selectedCompany.employeeCount}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={openQuickAssignment}>
                  <Plus className="mr-2 h-4 w-4" />
                  {selectedCompanyAssignments[0] ? "Assignment düzenle" : "Assignment ekle"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingFinanceId(selectedFinanceRecord?.id || null);
                    setFinanceForm(selectedFinanceRecord ? {
                      invoiceNo: selectedFinanceRecord.invoice_no || "",
                      servicePeriod: selectedFinanceRecord.service_period || "",
                      dueDate: selectedFinanceRecord.due_date || "",
                      amount: String(selectedFinanceRecord.amount || ""),
                      status: selectedFinanceRecord.status,
                      paymentNote: selectedFinanceRecord.payment_note || "",
                    } : emptyFinanceForm);
                    setFinanceOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {selectedFinanceRecord ? "Finans düzenle" : "Finans kaydı ekle"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingDocumentId(selectedDocumentRecord?.id || null);
                    setDocumentForm(selectedDocumentRecord ? {
                      documentType: selectedDocumentRecord.document_type,
                      documentName: selectedDocumentRecord.document_name,
                      expiryDate: selectedDocumentRecord.expiry_date || "",
                      status: selectedDocumentRecord.status,
                      notes: selectedDocumentRecord.notes || "",
                    } : emptyDocumentForm);
                    setDocumentOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {selectedDocumentRecord ? "Evrak düzenle" : "Evrak kaydı ekle"}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={assignmentOpen} onOpenChange={setAssignmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAssignmentId ? "Assignment düzenle" : "Hızlı assignment oluştur"}</DialogTitle>
            <DialogDescription>{selectedCompany?.companyName} için drawer içinden assignment kaydını yönetin.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Personel</Label>
              <Select value={assignmentForm.personnelId} onValueChange={(value) => setAssignmentForm((prev) => ({ ...prev, personnelId: value }))}>
                <SelectTrigger><SelectValue placeholder="Personel seçin" /></SelectTrigger>
                <SelectContent>
                  {personnel.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.full_name} • {item.role.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={assignmentForm.assignedRole} onValueChange={(value) => setAssignmentForm((prev) => ({ ...prev, assignedRole: value as AssignmentQuickForm["assignedRole"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="igu">İGU</SelectItem>
                    <SelectItem value="hekim">İşyeri Hekimi</SelectItem>
                    <SelectItem value="dsp">DSP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Atanan süre (dk)</Label>
                <Input type="number" value={assignmentForm.assignedMinutes} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, assignedMinutes: e.target.value }))} />
              </div>
            </div>
            {selectedCompany ? (
              <Alert>
                <AlertTitle>Firma gereksinimi</AlertTitle>
                <AlertDescription>
                  Gerekli süre: {selectedCompany.requiredMinutes} dk • Mevcut aktif assignment: {selectedCompanyAssignments.reduce((sum, item) => sum + item.assigned_minutes, 0)} dk
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Başlangıç</Label>
                <Input type="date" value={assignmentForm.startDate} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, startDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Bitiş</Label>
                <Input type="date" value={assignmentForm.endDate} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Not</Label>
              <Textarea value={assignmentForm.notes} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, notes: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignmentOpen(false)}>Vazgeç</Button>
            <Button onClick={() => void handleQuickAssignmentSave()} disabled={saving}>{editingAssignmentId ? "Güncelle" : "Kaydet"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={financeOpen} onOpenChange={setFinanceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFinanceId ? "Finans kaydını düzenle" : "Hızlı finans kaydı"}</DialogTitle>
            <DialogDescription>{selectedCompany?.companyName} için finans kaydını yönetin.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Fatura No</Label>
                <Input value={financeForm.invoiceNo} onChange={(e) => setFinanceForm((prev) => ({ ...prev, invoiceNo: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Hizmet dönemi</Label>
                <Input value={financeForm.servicePeriod} onChange={(e) => setFinanceForm((prev) => ({ ...prev, servicePeriod: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Son ödeme</Label>
                <Input type="date" value={financeForm.dueDate} onChange={(e) => setFinanceForm((prev) => ({ ...prev, dueDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Tutar</Label>
                <Input type="number" value={financeForm.amount} onChange={(e) => setFinanceForm((prev) => ({ ...prev, amount: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Durum</Label>
              <Select value={financeForm.status} onValueChange={(value) => setFinanceForm((prev) => ({ ...prev, status: value as FinanceQuickForm["status"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Bekliyor</SelectItem>
                  <SelectItem value="paid">Ödendi</SelectItem>
                  <SelectItem value="overdue">Gecikmiş</SelectItem>
                  <SelectItem value="cancelled">İptal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Not</Label>
              <Textarea value={financeForm.paymentNote} onChange={(e) => setFinanceForm((prev) => ({ ...prev, paymentNote: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinanceOpen(false)}>Vazgeç</Button>
            <Button onClick={() => void handleQuickFinanceSave()} disabled={saving}>{editingFinanceId ? "Güncelle" : "Kaydet"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={documentOpen} onOpenChange={setDocumentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDocumentId ? "Evrak kaydını düzenle" : "Hızlı evrak kaydı"}</DialogTitle>
            <DialogDescription>{selectedCompany?.companyName} için evrak kaydını yönetin.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Doküman tipi</Label>
              <Input value={documentForm.documentType} onChange={(e) => setDocumentForm((prev) => ({ ...prev, documentType: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Doküman adı</Label>
              <Input value={documentForm.documentName} onChange={(e) => setDocumentForm((prev) => ({ ...prev, documentName: e.target.value }))} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Geçerlilik tarihi</Label>
                <Input type="date" value={documentForm.expiryDate} onChange={(e) => setDocumentForm((prev) => ({ ...prev, expiryDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Durum</Label>
                <Select value={documentForm.status} onValueChange={(value) => setDocumentForm((prev) => ({ ...prev, status: value as DocumentQuickForm["status"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="warning">Yaklaşan</SelectItem>
                    <SelectItem value="expired">Süresi dolmuş</SelectItem>
                    <SelectItem value="archived">Arşiv</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Not</Label>
              <Textarea value={documentForm.notes} onChange={(e) => setDocumentForm((prev) => ({ ...prev, notes: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocumentOpen(false)}>Vazgeç</Button>
            <Button onClick={() => void handleQuickDocumentSave()} disabled={saving}>{editingDocumentId ? "Güncelle" : "Kaydet"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
