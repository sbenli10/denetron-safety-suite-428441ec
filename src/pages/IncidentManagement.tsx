import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ClipboardPlus,
  Download,
  Eye,
  FileUp,
  Plus,
  RefreshCcw,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useAccessRole } from "@/hooks/useAccessRole";
import { downloadCsv } from "@/lib/csvExport";
import { readOsgbPageCache, writeOsgbPageCache } from "@/lib/osgbPageCache";
import {
  createIncidentTask,
  deleteIncidentAction,
  deleteIncidentAttachment,
  deleteIncidentReport,
  getIncidentAttachmentDownloadUrl,
  getIncidentCompanyOptions,
  listIncidentActions,
  listIncidentAttachments,
  listIncidentReports,
  type IncidentActionInput,
  type IncidentActionRecord,
  type IncidentFormInput,
  type IncidentReportRecord,
  type IncidentSeverity,
  type IncidentStatus,
  type IncidentType,
  upsertIncidentAction,
  upsertIncidentReport,
  uploadIncidentAttachment,
} from "@/lib/incidentOperations";
import type { OsgbCompanyOption } from "@/lib/osgbOperations";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";

type IncidentFormState = {
  companyId: string;
  incidentType: IncidentType;
  title: string;
  description: string;
  incidentDate: string;
  location: string;
  affectedPerson: string;
  severity: IncidentSeverity;
  rootCause: string;
  immediateAction: string;
  correctiveAction: string;
  status: IncidentStatus;
  reportedBy: string;
  witnessInfo: string;
  accidentCategory: string;
  lostTimeDays: string;
  requiresNotification: boolean;
};

type IncidentActionFormState = {
  actionTitle: string;
  ownerName: string;
  dueDate: string;
  notes: string;
};

const emptyIncidentForm: IncidentFormState = {
  companyId: "",
  incidentType: "near_miss",
  title: "",
  description: "",
  incidentDate: new Date().toISOString().slice(0, 16),
  location: "",
  affectedPerson: "",
  severity: "medium",
  rootCause: "",
  immediateAction: "",
  correctiveAction: "",
  status: "open",
  reportedBy: "",
  witnessInfo: "",
  accidentCategory: "",
  lostTimeDays: "0",
  requiresNotification: false,
};

const emptyActionForm: IncidentActionFormState = {
  actionTitle: "",
  ownerName: "",
  dueDate: "",
  notes: "",
};

const CACHE_TTL_MS = 5 * 60 * 1000;

const typeLabel: Record<IncidentType, string> = {
  work_accident: "İş Kazası",
  near_miss: "Ramak Kala",
};

const severityLabel: Record<IncidentSeverity, string> = {
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
  critical: "Kritik",
};

const statusLabel: Record<IncidentStatus, string> = {
  open: "Açık",
  investigating: "İnceleniyor",
  action_required: "Aksiyon Bekliyor",
  closed: "Kapatıldı",
};

const severityClass: Record<IncidentSeverity, string> = {
  low: "border-slate-400/20 bg-slate-500/15 text-slate-200",
  medium: "border-sky-400/20 bg-sky-500/15 text-sky-200",
  high: "border-orange-400/20 bg-orange-500/15 text-orange-200",
  critical: "border-red-400/20 bg-red-500/15 text-red-200",
};

const getCacheKey = (userId: string) => `incident-management:${userId}`;

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleString("tr-TR") : "-";

export default function IncidentManagement() {
  const { user } = useAuth();
  const { canManage } = useAccessRole();

  const [records, setRecords] = useState<IncidentReportRecord[]>([]);
  const [companies, setCompanies] = useState<OsgbCompanyOption[]>([]);
  const [attachments, setAttachments] = useState<
    Awaited<ReturnType<typeof listIncidentAttachments>>
  >([]);
  const [actions, setActions] = useState<IncidentActionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [taskCreating, setTaskCreating] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState<IncidentReportRecord | null>(null);
  const [selected, setSelected] = useState<IncidentReportRecord | null>(null);
  const [form, setForm] = useState<IncidentFormState>(emptyIncidentForm);
  const [actionForm, setActionForm] =
    useState<IncidentActionFormState>(emptyActionForm);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<IncidentType | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | "ALL">(
    "ALL",
  );

  const loadData = async (silent = false) => {
    if (!user?.id) return;
    if (!silent) setLoading(true);

    try {
      const [incidentRows, companyRows] = await Promise.all([
        listIncidentReports(user.id),
        getIncidentCompanyOptions(user.id),
      ]);

      setRecords(incidentRows);
      setCompanies(companyRows);
      writeOsgbPageCache(getCacheKey(user.id), { incidentRows, companyRows });
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "İş kazası ve ramak kala kayıtları yüklenemedi.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    const cached = readOsgbPageCache<{
      incidentRows: IncidentReportRecord[];
      companyRows: OsgbCompanyOption[];
    }>(getCacheKey(user.id), CACHE_TTL_MS);

    if (cached) {
      setRecords(cached.incidentRows);
      setCompanies(cached.companyRows);
      setLoading(false);
      void loadData(true);
      return;
    }

    void loadData();
  }, [user?.id]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");

    return records.filter((record) => {
      const matchesType =
        typeFilter === "ALL" || record.incident_type === typeFilter;
      const matchesStatus =
        statusFilter === "ALL" || record.status === statusFilter;
      const matchesQuery =
        !query ||
        [
          record.title,
          record.description,
          record.location || "",
          record.company?.company_name || "",
        ].some((value) => value.toLocaleLowerCase("tr-TR").includes(query));

      return matchesType && matchesStatus && matchesQuery;
    });
  }, [records, search, statusFilter, typeFilter]);

  const summary = useMemo(
    () => ({
      total: records.length,
      workAccident: records.filter(
        (item) => item.incident_type === "work_accident",
      ).length,
      nearMiss: records.filter((item) => item.incident_type === "near_miss")
        .length,
      criticalOpen: records.filter(
        (item) => item.severity === "critical" && item.status !== "closed",
      ).length,
    }),
    [records],
  );

  const resetIncidentForm = () => {
    setForm(emptyIncidentForm);
    setEditing(null);
  };

  const resetActionForm = () => {
    setActionForm(emptyActionForm);
  };

  const openCreate = () => {
    if (!canManage) {
      toast.error("Bu işlem için düzenleme yetkisi gerekiyor.");
      return;
    }

    resetIncidentForm();
    setDialogOpen(true);
  };

  const openEdit = (record: IncidentReportRecord) => {
    if (!canManage) {
      toast.error("Bu işlem için düzenleme yetkisi gerekiyor.");
      return;
    }

    setEditing(record);
    setForm({
      companyId: record.company_id || "",
      incidentType: record.incident_type,
      title: record.title,
      description: record.description,
      incidentDate: record.incident_date.slice(0, 16),
      location: record.location || "",
      affectedPerson: record.affected_person || "",
      severity: record.severity,
      rootCause: record.root_cause || "",
      immediateAction: record.immediate_action || "",
      correctiveAction: record.corrective_action || "",
      status: record.status,
      reportedBy: record.reported_by || "",
      witnessInfo: record.witness_info || "",
      accidentCategory: record.accident_category || "",
      lostTimeDays: String(record.lost_time_days ?? 0),
      requiresNotification: record.requires_notification,
    });
    setDialogOpen(true);
  };

  const openDetail = async (record: IncidentReportRecord) => {
    setSelected(record);
    setDetailOpen(true);
    setDetailLoading(true);
    resetActionForm();

    try {
      const [attachmentRows, actionRows] = await Promise.all([
        listIncidentAttachments(record.id),
        listIncidentActions(record.id),
      ]);

      setAttachments(attachmentRows);
      setActions(actionRows);
    } catch (detailError) {
      toast.error(
        detailError instanceof Error
          ? detailError.message
          : "Detaylar yüklenemedi.",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSave = async () => {
    if (!canManage) {
      toast.error("Bu işlem için düzenleme yetkisi gerekiyor.");
      return;
    }

    if (!user?.id || !form.title.trim() || !form.description.trim()) {
      toast.error("Başlık ve açıklama zorunludur.");
      return;
    }

    const lostTimeDays = Number(form.lostTimeDays || "0");
    if (!Number.isFinite(lostTimeDays) || lostTimeDays < 0) {
      toast.error("İş günü kaybı alanı 0 veya daha büyük olmalıdır.");
      return;
    }

    setSaving(true);

    try {
      const payload: IncidentFormInput = {
        companyId: form.companyId || null,
        incidentType: form.incidentType,
        title: form.title,
        description: form.description,
        incidentDate: form.incidentDate,
        location: form.location,
        affectedPerson: form.affectedPerson,
        severity: form.severity,
        rootCause: form.rootCause,
        immediateAction: form.immediateAction,
        correctiveAction: form.correctiveAction,
        status: form.status,
        reportedBy: form.reportedBy,
        witnessInfo: form.witnessInfo,
        accidentCategory: form.accidentCategory,
        lostTimeDays,
        requiresNotification: form.requiresNotification,
      };

      const saved = await upsertIncidentReport(user.id, payload, editing?.id);

      setRecords((prev) =>
        editing
          ? prev.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...prev],
      );

      setDialogOpen(false);
      resetIncidentForm();
      toast.success(
        editing ? "Olay kaydı güncellendi." : "Olay kaydı oluşturuldu.",
      );
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : "Olay kaydı kaydedilemedi.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record: IncidentReportRecord) => {
    if (!canManage) {
      toast.error("Bu işlem için düzenleme yetkisi gerekiyor.");
      return;
    }

    if (!confirm(`"${record.title}" kaydını silmek istiyor musunuz?`)) return;

    try {
      await deleteIncidentReport(record.id);
      setRecords((prev) => prev.filter((item) => item.id !== record.id));
      if (selected?.id === record.id) {
        setSelected(null);
        setDetailOpen(false);
      }
      toast.success("Olay kaydı silindi.");
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "Olay kaydı silinemedi.",
      );
    }
  };

  const handleAttachmentDownload = async (filePath: string) => {
    try {
      const signedUrl = await getIncidentAttachmentDownloadUrl(filePath);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (downloadError) {
      toast.error(
        downloadError instanceof Error
          ? downloadError.message
          : "Dosya indirilemedi.",
      );
    }
  };

  const handleAttachmentUpload = async (file: File) => {
    if (!user?.id || !selected) return;

    setUploadingFile(true);
    try {
      const saved = await uploadIncidentAttachment(user.id, selected.id, file);
      setAttachments((prev) => [saved, ...prev]);
      toast.success("Dosya eklendi.");
    } catch (uploadError) {
      toast.error(
        uploadError instanceof Error
          ? uploadError.message
          : "Dosya yüklenemedi.",
      );
    } finally {
      setUploadingFile(false);
    }
  };

  const handleAttachmentDelete = async (attachmentId: string) => {
    const attachment = attachments.find((item) => item.id === attachmentId);
    if (!attachment) return;

    try {
      await deleteIncidentAttachment(attachment);
      setAttachments((prev) => prev.filter((item) => item.id !== attachmentId));
      toast.success("Dosya silindi.");
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "Dosya silinemedi.",
      );
    }
  };

  const handleCreateTask = async () => {
    if (!user?.id || !selected) return;

    setTaskCreating(true);
    try {
      await createIncidentTask(user.id, selected);
      toast.success("OSGB görevi oluşturuldu.");
    } catch (taskError) {
      toast.error(
        taskError instanceof Error
          ? taskError.message
          : "Görev oluşturulamadı.",
      );
    } finally {
      setTaskCreating(false);
    }
  };

  const handleActionSave = async () => {
    if (!user?.id || !selected) return;
    if (!canManage) {
      toast.error("Bu işlem için düzenleme yetkisi gerekiyor.");
      return;
    }
    if (!actionForm.actionTitle.trim()) {
      toast.error("Aksiyon başlığı zorunludur.");
      return;
    }

    setActionSaving(true);
    try {
      const payload: IncidentActionInput = {
        actionTitle: actionForm.actionTitle,
        ownerName: actionForm.ownerName,
        dueDate: actionForm.dueDate || null,
        notes: actionForm.notes,
        status: "open",
      };

      const saved = await upsertIncidentAction(user.id, selected.id, payload);
      setActions((prev) => [saved, ...prev]);
      resetActionForm();
      toast.success("Aksiyon eklendi.");
    } catch (actionError) {
      toast.error(
        actionError instanceof Error
          ? actionError.message
          : "Aksiyon eklenemedi.",
      );
    } finally {
      setActionSaving(false);
    }
  };

  const handleActionDelete = async (actionId: string) => {
    if (!canManage) {
      toast.error("Bu işlem için düzenleme yetkisi gerekiyor.");
      return;
    }

    try {
      await deleteIncidentAction(actionId);
      setActions((prev) => prev.filter((item) => item.id !== actionId));
      toast.success("Aksiyon silindi.");
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "Aksiyon silinemedi.",
      );
    }
  };

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10 text-orange-200">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">
                İş Kazası / Ramak Kala Merkezi
              </h1>
              <p className="text-sm text-slate-400">
                Olay kaydı, kök neden, aksiyon takibi ve görev üretimi tek
                ekranda yönetilir.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() =>
              downloadCsv(
                "is-kazasi-ramak-kala.csv",
                ["Tür", "Başlık", "Firma", "Şiddet", "Durum", "Tarih"],
                filteredRecords.map((record) => [
                  typeLabel[record.incident_type],
                  record.title,
                  record.company?.company_name || "",
                  severityLabel[record.severity],
                  statusLabel[record.status],
                  formatDate(record.incident_date),
                ]),
              )
            }
          >
            <Download className="h-4 w-4" />
            Dışa Aktar
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => void loadData()}
          >
            <RefreshCcw className="h-4 w-4" />
            Yenile
          </Button>
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Yeni Kayıt
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-slate-800 bg-slate-950/60">
          <CardHeader className="pb-2">
            <CardDescription>Toplam kayıt</CardDescription>
            <CardTitle className="text-3xl text-white">
              {summary.total}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-slate-800 bg-slate-950/60">
          <CardHeader className="pb-2">
            <CardDescription>İş kazası</CardDescription>
            <CardTitle className="text-3xl text-white">
              {summary.workAccident}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-slate-800 bg-slate-950/60">
          <CardHeader className="pb-2">
            <CardDescription>Ramak kala</CardDescription>
            <CardTitle className="text-3xl text-white">
              {summary.nearMiss}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardDescription>Kritik açık olay</CardDescription>
            <CardTitle className="text-3xl text-white">
              {summary.criticalOpen}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {error && (
        <Alert className="border-red-500/20 bg-red-500/10 text-red-100">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Veri yüklenemedi</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="border-slate-800 bg-slate-950/60">
        <CardHeader>
          <CardTitle className="text-white">Kayıtlar</CardTitle>
          <CardDescription>
            İş kazası ve ramak kala olaylarını filtreleyin, detayını açın veya
            düzenleyin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-4">
            <div className="relative lg:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="Başlık, firma veya lokasyon ile ara"
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(value) =>
                setTypeFilter(value as IncidentType | "ALL")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tür" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tüm türler</SelectItem>
                <SelectItem value="work_accident">İş Kazası</SelectItem>
                <SelectItem value="near_miss">Ramak Kala</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as IncidentStatus | "ALL")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tüm durumlar</SelectItem>
                {Object.entries(statusLabel).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-sm text-slate-400">
              Olay kayıtları yükleniyor...
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tür</TableHead>
                    <TableHead>Başlık</TableHead>
                    <TableHead>Firma</TableHead>
                    <TableHead>Şiddet</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Olay Tarihi</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-12 text-center text-sm text-slate-400"
                      >
                        Kayıt bulunamadı.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{typeLabel[record.incident_type]}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-white">
                              {record.title}
                            </p>
                            <p className="text-xs text-slate-400">
                              {record.location || "Lokasyon belirtilmedi"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {record.company?.company_name || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className={severityClass[record.severity]}>
                            {severityLabel[record.severity]}
                          </Badge>
                        </TableCell>
                        <TableCell>{statusLabel[record.status]}</TableCell>
                        <TableCell>{formatDate(record.incident_date)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => void openDetail(record)}
                            >
                              <Eye className="h-4 w-4" />
                              Detay
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => openEdit(record)}
                            >
                              <ClipboardPlus className="h-4 w-4" />
                              Düzenle
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 text-red-300"
                              onClick={() => void handleDelete(record)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Sil
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetIncidentForm();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? "Olay Kaydını Düzenle"
                : "Yeni İş Kazası / Ramak Kala Kaydı"}
            </DialogTitle>
            <DialogDescription>
              Olayın detayını, kök nedenini ve düzeltici aksiyonlarını kayıt
              altına alın.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto pr-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
              <Label>Olay türü</Label>
              <Select
                value={form.incidentType}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    incidentType: value as IncidentType,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="work_accident">İş Kazası</SelectItem>
                  <SelectItem value="near_miss">Ramak Kala</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Firma</Label>
              <Select
                value={form.companyId || "NONE"}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    companyId: value === "NONE" ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Firma seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Firma seçilmedi</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Başlık</Label>
              <Input
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Olay açıklaması</Label>
              <Textarea
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                className="min-h-24"
              />
            </div>

            <div className="space-y-2">
              <Label>Olay tarihi</Label>
              <Input
                type="datetime-local"
                value={form.incidentDate}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    incidentDate: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Şiddet</Label>
              <Select
                value={form.severity}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    severity: value as IncidentSeverity,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(severityLabel).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Durum</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    status: value as IncidentStatus,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabel).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>İş günü kaybı</Label>
              <Input
                type="number"
                min="0"
                value={form.lostTimeDays}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    lostTimeDays: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Lokasyon</Label>
              <Input
                value={form.location}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, location: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Etkilenen kişi</Label>
              <Input
                value={form.affectedPerson}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    affectedPerson: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Bildirimi yapan</Label>
              <Input
                value={form.reportedBy}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    reportedBy: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Tanık / görgü bilgisi</Label>
              <Input
                value={form.witnessInfo}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    witnessInfo: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Kaza kategorisi</Label>
              <Input
                value={form.accidentCategory}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    accidentCategory: event.target.value,
                  }))
                }
                placeholder="Düşme, kesilme, çarpma, malzeme düşmesi vb."
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>İlk / acil müdahale</Label>
              <Textarea
                value={form.immediateAction}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    immediateAction: event.target.value,
                  }))
                }
                className="min-h-20"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Kök neden</Label>
              <Textarea
                value={form.rootCause}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    rootCause: event.target.value,
                  }))
                }
                className="min-h-20"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Düzeltici / önleyici aksiyon</Label>
              <Textarea
                value={form.correctiveAction}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    correctiveAction: event.target.value,
                  }))
                }
                className="min-h-20"
              />
            </div>

              <label className="flex items-center gap-3 rounded-xl border border-slate-800 px-4 py-3 text-sm text-slate-300 md:col-span-2">
                <input
                  type="checkbox"
                  checked={form.requiresNotification}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      requiresNotification: event.target.checked,
                    }))
                  }
                />
                Resmi bildirim veya ilave takip gerektiriyor
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Vazgeç
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Kaydediliyor..." : editing ? "Güncelle" : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setSelected(null);
            setAttachments([]);
            setActions([]);
            resetActionForm();
          }
        }}
      >
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>{selected?.title || "Olay detayı"}</DialogTitle>
            <DialogDescription>
              Dosya, aksiyon ve görev bağlantıları bu ekrandan yönetilir.
            </DialogDescription>
          </DialogHeader>

          {!selected || detailLoading ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-8 text-sm text-slate-400">
              Detaylar yükleniyor...
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-6">
                <Card className="border-slate-800 bg-slate-950/40">
                  <CardHeader>
                    <CardTitle className="text-white">Olay Özeti</CardTitle>
                    <CardDescription>
                      {formatDate(selected.incident_date)} •{" "}
                      {selected.company?.company_name || "Firma seçilmedi"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 text-sm text-slate-300 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Tür
                      </p>
                      <p className="mt-1">{typeLabel[selected.incident_type]}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Şiddet
                      </p>
                      <div className="mt-1">
                        <Badge className={severityClass[selected.severity]}>
                          {severityLabel[selected.severity]}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Durum
                      </p>
                      <p className="mt-1">{statusLabel[selected.status]}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        İş günü kaybı
                      </p>
                      <p className="mt-1">{selected.lost_time_days}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Lokasyon
                      </p>
                      <p className="mt-1">{selected.location || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Etkilenen kişi
                      </p>
                      <p className="mt-1">{selected.affected_person || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Bildirimi yapan
                      </p>
                      <p className="mt-1">{selected.reported_by || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Kategori
                      </p>
                      <p className="mt-1">{selected.accident_category || "-"}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Olay açıklaması
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">
                        {selected.description}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        İlk / acil müdahale
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">
                        {selected.immediate_action || "-"}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Kök neden
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">
                        {selected.root_cause || "-"}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Düzeltici / önleyici aksiyon
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">
                        {selected.corrective_action || "-"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-950/40">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <FileUp className="h-4 w-4" />
                      Dosyalar
                    </CardTitle>
                    <CardDescription>
                      Fotoğraf, tutanak veya destekleyici evrak yükleyin.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <label className="inline-flex">
                      <input
                        type="file"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          void handleAttachmentUpload(file);
                          event.target.value = "";
                        }}
                      />
                      <Button type="button" variant="outline" className="gap-2" asChild>
                        <span>{uploadingFile ? "Yükleniyor..." : "Dosya Ekle"}</span>
                      </Button>
                    </label>

                    <div className="space-y-3">
                      {attachments.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-400">
                          Henüz dosya eklenmedi.
                        </div>
                      ) : (
                        attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="flex items-center justify-between rounded-xl border border-slate-800 px-4 py-3"
                          >
                            <div>
                              <p className="font-medium text-white">
                                {attachment.file_name}
                              </p>
                              <p className="text-xs text-slate-400">
                                {formatDate(attachment.created_at)}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  void handleAttachmentDownload(
                                    attachment.file_path,
                                  )
                                }
                              >
                                İndir
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-300"
                                onClick={() =>
                                  void handleAttachmentDelete(attachment.id)
                                }
                              >
                                Sil
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="border-slate-800 bg-slate-950/40">
                  <CardHeader>
                    <CardTitle className="text-white">Hızlı Aksiyonlar</CardTitle>
                    <CardDescription>
                      Olayı görev motoruna aktarın veya düzenleme ekranına geçin.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      className="w-full gap-2"
                      onClick={() => void handleCreateTask()}
                      disabled={taskCreating}
                    >
                      <ClipboardPlus className="h-4 w-4" />
                      {taskCreating ? "Görev oluşturuluyor..." : "OSGB görevi oluştur"}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => {
                        setDetailOpen(false);
                        openEdit(selected);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                      Kaydı düzenle
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-950/40">
                  <CardHeader>
                    <CardTitle className="text-white">Aksiyon Planı</CardTitle>
                    <CardDescription>
                      Olay bazlı takip adımlarını kayıt altına alın.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3">
                      <Input
                        placeholder="Aksiyon başlığı"
                        value={actionForm.actionTitle}
                        onChange={(event) =>
                          setActionForm((prev) => ({
                            ...prev,
                            actionTitle: event.target.value,
                          }))
                        }
                      />
                      <Input
                        placeholder="Sorumlu kişi"
                        value={actionForm.ownerName}
                        onChange={(event) =>
                          setActionForm((prev) => ({
                            ...prev,
                            ownerName: event.target.value,
                          }))
                        }
                      />
                      <Input
                        type="date"
                        value={actionForm.dueDate}
                        onChange={(event) =>
                          setActionForm((prev) => ({
                            ...prev,
                            dueDate: event.target.value,
                          }))
                        }
                      />
                      <Textarea
                        placeholder="Aksiyon notu"
                        value={actionForm.notes}
                        onChange={(event) =>
                          setActionForm((prev) => ({
                            ...prev,
                            notes: event.target.value,
                          }))
                        }
                        className="min-h-20"
                      />
                      <Button
                        onClick={() => void handleActionSave()}
                        disabled={actionSaving}
                      >
                        {actionSaving ? "Ekleniyor..." : "Aksiyon ekle"}
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {actions.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-400">
                          Henüz aksiyon eklenmedi.
                        </div>
                      ) : (
                        actions.map((action) => (
                          <div
                            key={action.id}
                            className="rounded-xl border border-slate-800 px-4 py-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <p className="font-medium text-white">
                                  {action.action_title}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {action.owner_name || "Sorumlu atanmamış"} •{" "}
                                  {action.due_date
                                    ? new Date(action.due_date).toLocaleDateString(
                                        "tr-TR",
                                      )
                                    : "Termin yok"}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {action.notes || "Açıklama yok"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{action.status}</Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-300"
                                  onClick={() =>
                                    void handleActionDelete(action.id)
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
