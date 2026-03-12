import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Download,
  Eye,
  FileArchive,
  FileSpreadsheet,
  History,
  ImagePlus,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { createCertificate, generateCertificateJob, getCertificateDownload, getCertificateStatus } from "@/lib/certificateApi";
import { createCertificateExcelTemplate, parseCertificateParticipantsExcel } from "@/lib/certificateExcel";
import { CertificatePreviewCard } from "@/components/certificates/CertificatePreviewCard";
import type { CertificateFormValues, CertificateJobItem, CertificateJobRecord, CertificateParticipantInput, CertificateRecord } from "@/types/certificates";
import type { Company } from "@/types/companies";

const defaultForm: CertificateFormValues = {
  company_id: null,
  company_name: "",
  company_address: "",
  company_phone: "",
  training_name: "Temel İş Sağlığı ve Güvenliği Eğitimi",
  training_date: new Date().toISOString().slice(0, 10),
  training_duration: "8 Saat",
  certificate_type: "Katılım",
  validity_date: "",
  logo_url: "",
  template_type: "classic",
  frame_style: "gold",
  trainer_names: [""],
  notes: "",
};

const templateCards = [
  { value: "classic", title: "Prestij Klasik", text: "Resmi, çerçeveli ve geleneksel görünüm" },
  { value: "modern", title: "Kurumsal Neon", text: "Yüksek kontrastlı, premium SaaS estetiği" },
  { value: "minimal", title: "Yönetici Minimal", text: "Temiz çizgiler ve baskı odaklı tasarım" },
] as const;

function getJobStatusMeta(job: CertificateJobRecord | null, participantCount: number) {
  if (!job || job.status === "draft") {
    return {
      label: "Taslak hazır",
      tone: "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-200",
      summary: "Sertifika kaydı hazır, ancak üretim henüz başlatılmadı.",
      detail: participantCount > 0
        ? "Katılımcılar eklendi. Şimdi toplu üretimi başlatabilirsiniz."
        : "Önce katılımcı ekleyin, ardından üretimi başlatın.",
    };
  }

  if (job.status === "queued") {
    return {
      label: "Kuyrukta bekliyor",
      tone: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      summary: "Üretim işi worker kuyruğuna başarıyla alındı.",
      detail: "PDF üretimi kısa süre içinde otomatik başlayacak.",
    };
  }

  if (job.status === "processing") {
    return {
      label: "Üretim sürüyor",
      tone: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
      summary: "Katılımcı sertifikaları şu anda üretiliyor.",
      detail: "İlerleme oranı üretim tamamlandıkça otomatik güncellenir.",
    };
  }

  if (job.status === "processing_with_errors") {
    return {
      label: "Üretim sürüyor, bazı kayıtlar hatalı",
      tone: "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
      summary: "Üretim devam ediyor ancak bazı katılımcılarda veri veya üretim hatası oluştu.",
      detail: "Detay sayfasından hatalı kayıtları inceleyip tekrar basım başlatabilirsiniz.",
    };
  }

  if (job.status === "completed") {
    return {
      label: "Üretim tamamlandı",
      tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      summary: "Tüm sertifikalar başarıyla üretildi.",
      detail: job.zip_path
        ? "ZIP dosyası hazır. Tekli PDF veya toplu ZIP indirebilirsiniz."
        : "PDF üretimi tamamlandı. ZIP paketi hazırlanıyor olabilir.",
    };
  }

  if (job.status === "completed_with_errors") {
    return {
      label: "Kısmen tamamlandı",
      tone: "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
      summary: "Bazı sertifikalar üretildi, bazı katılımcılarda hata kaldı.",
      detail: job.zip_path
        ? "Hazır dosyaları ZIP olarak indirebilir, hatalı kayıtları ayrıca düzeltebilirsiniz."
        : "Başarılı kayıtlar oluştu. ZIP paketi hazırlanırken hatalı kayıtları kontrol edin.",
    };
  }

  if (job.status === "failed") {
    return {
      label: "Üretim başarısız",
      tone: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
      summary: "Hiçbir sertifika başarıyla üretilemedi.",
      detail: job.error_message || "Katılımcı verilerini ve worker loglarını kontrol edin.",
    };
  }

  return {
    label: "İşlem başarısız",
    tone: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
    summary: "Üretim tamamlanamadı.",
    detail: job.error_message || "Lütfen kayıtları kontrol edip tekrar deneyin.",
  };
}

export default function CertificatesDashboard() {
  const [form, setForm] = useState<CertificateFormValues>(defaultForm);
  const [participants, setParticipants] = useState<CertificateParticipantInput[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [recentCertificates, setRecentCertificates] = useState<CertificateRecord[]>([]);
  const [activeCertificate, setActiveCertificate] = useState<CertificateRecord | null>(null);
  const [activeJob, setActiveJob] = useState<CertificateJobRecord | null>(null);
  const [jobItems, setJobItems] = useState<CertificateJobItem[]>([]);
  const [selectedParticipantIndex, setSelectedParticipantIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [employeeLoadState, setEmployeeLoadState] = useState<"idle" | "loaded" | "empty">("idle");
  const [employeeLoadMessage, setEmployeeLoadMessage] = useState("");
  const [trainerNamesInput, setTrainerNamesInput] = useState(defaultForm.trainer_names.join(", "));

  const completedItems = useMemo(() => jobItems.filter((item) => item.status === "completed"), [jobItems]);
  const previewParticipant = participants[0];
  const jobStatusMeta = useMemo(() => getJobStatusMeta(activeJob, participants.length), [activeJob, participants.length]);

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!activeCertificate || !activeJob) return;
    if (!["queued", "processing", "processing_with_errors"].includes(activeJob.status)) return;
    const interval = window.setInterval(() => {
      void refreshJobStatus(activeCertificate.id);
    }, 3000);
    return () => window.clearInterval(interval);
  }, [activeCertificate, activeJob]);

  async function bootstrap() {
    setLoading(true);
    try {
      await Promise.all([loadCompanies(), loadRecentCertificates()]);
    } finally {
      setLoading(false);
    }
  }

  async function loadCompanies() {
    const { data, error } = await (supabase as any).from("companies").select("*").eq("is_active", true).order("created_at", { ascending: false });
    if (error) throw error;
    const mapped = (data || []).map((item: any) => ({ ...item, owner_id: item.user_id, company_name: item.name, nace_code: item.industry || "", hazard_class: item.hazard_class || "Az Tehlikeli" }));
    setCompanies(mapped);
  }

  async function loadRecentCertificates() {
    const { data, error } = await (supabase as any).from("certificates").select("*").order("created_at", { ascending: false }).limit(12);
    if (error) throw error;
    setRecentCertificates(data || []);
  }

  async function refreshJobStatus(certificateId: string) {
    try {
      const statusPayload = await getCertificateStatus(certificateId);
      setActiveJob(statusPayload.job);
      setJobItems(statusPayload.items || []);
    } catch (error: any) {
      console.error("Sertifika durumu alınamadı:", error);
    }
  }

  async function applyCompany(companyId: string) {
    const company = companies.find((item) => item.id === companyId);
    if (!company) return;

    setForm((prev) => ({
      ...prev,
      company_id: company.id,
      company_name: company.company_name,
      company_address: [company.address, company.city].filter(Boolean).join(", "),
      company_phone: company.phone || "",
    }));

    try {
      const { data: employees, error } = await (supabase as any)
        .from("employees")
        .select("id, first_name, last_name, tc_number, job_title")
        .eq("company_id", company.id)
        .eq("is_active", true)
        .order("first_name", { ascending: true });

      if (error) throw error;

      const mappedParticipants = (employees || [])
        .map((employee: any) => ({
          id: employee.id,
          name: `${employee.first_name || ""} ${employee.last_name || ""}`.trim(),
          tc_no: employee.tc_number || "",
          job_title: employee.job_title || "",
        }))
        .filter((participant: CertificateParticipantInput) => participant.name.length > 0);

      if (mappedParticipants.length > 0) {
        setParticipants(mappedParticipants);
        setEmployeeLoadState("loaded");
        setEmployeeLoadMessage(`${mappedParticipants.length} çalışan katılımcı listesine otomatik yüklendi.`);
        toast.success(`${mappedParticipants.length} çalışan otomatik yüklendi`);
      } else {
        setParticipants([]);
        setEmployeeLoadState("empty");
        setEmployeeLoadMessage("Seçilen firmaya ait kayıtlı çalışan bulunamadı. Katılımcıları manuel ekleyebilir veya Excel ile yükleyebilirsiniz.");
        toast.info("Bu firmaya ait kayıtlı çalışan bulunamadı");
      }
    } catch (error: any) {
      setEmployeeLoadState("empty");
      setEmployeeLoadMessage("Çalışanlar otomatik yüklenemedi. Katılımcıları manuel ekleyebilir veya Excel ile yükleyebilirsiniz.");
      toast.error(`Çalışanlar yüklenemedi: ${error.message}`);
    }
  }

  function addParticipant() {
    setParticipants((prev) => [...prev, { name: "", tc_no: "", job_title: "" }]);
  }

  function updateParticipant(index: number, patch: Partial<CertificateParticipantInput>) {
    setParticipants((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function removeParticipant(index: number) {
    setParticipants((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleExcelUpload(file: File) {
    try {
      const parsed = await parseCertificateParticipantsExcel(file);
      setParticipants(parsed);
      toast.success(`${parsed.length} katılımcı yüklendi`);
    } catch (error: any) {
      toast.error(`Excel okunamadı: ${error.message}`);
    }
  }

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true);
    try {
      const fileName = `logos/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from("certificate-files").upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data } = await supabase.storage.from("certificate-files").getPublicUrl(fileName);
      setForm((prev) => ({ ...prev, logo_url: data.publicUrl }));
      toast.success("Logo yüklendi");
    } catch (error: any) {
      toast.error(`Logo yüklenemedi: ${error.message}`);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleCreate() {
    if (!form.company_name.trim() || !form.training_name.trim()) {
      toast.error("Firma ve eğitim bilgileri zorunludur");
      return null;
    }
    if (participants.length === 0) {
      toast.error("En az bir katılımcı ekleyin");
      return null;
    }

    setSubmitting(true);
    try {
      const response = await createCertificate(form, participants);
      setActiveCertificate(response.certificate);
      setActiveJob(response.job);
      await loadRecentCertificates();
      toast.success("Sertifika işi oluşturuldu");
      return response;
    } catch (error: any) {
      toast.error(`Kayıt oluşturulamadı: ${error.message}`);
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGenerate(certificateOverride?: CertificateRecord | null) {
    try {
      let certificate = certificateOverride || activeCertificate;
      if (!certificate) {
        const created = await handleCreate();
        certificate = created?.certificate ?? null;
        if (certificate) {
          setActiveCertificate(certificate);
          setActiveJob(created?.job ?? null);
        }
      }
      if (!certificate) return;

      setSubmitting(true);
      const response = await generateCertificateJob(certificate.id);
      setActiveCertificate(response.certificate);
      setActiveJob(response.job);
      await refreshJobStatus(certificate.id);
      toast.success("Toplu üretim kuyruğa alındı");
    } catch (error: any) {
      toast.error(`Üretim başlatılamadı: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownloadZip() {
    if (!activeCertificate) return;
    try {
      const payload = await getCertificateDownload(activeCertificate.id);
      if (!payload.downloadUrl) {
        toast.error("ZIP henüz hazır değil");
        return;
      }
      window.open(payload.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      toast.error(`ZIP indirilemedi: ${error.message}`);
    }
  }

  async function handleDownloadSinglePdf() {
    const item = completedItems[selectedParticipantIndex];
    if (!item?.pdf_path) {
      toast.error("İndirilebilir PDF bulunamadı");
      return;
    }
    const { data, error } = await supabase.storage.from("certificate-files").createSignedUrl(item.pdf_path, 3600);
    if (error || !data?.signedUrl) {
      toast.error("PDF bağlantısı oluşturulamadı");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function loadCertificate(certificate: CertificateRecord) {
    setActiveCertificate(certificate);
    setForm({
      company_id: certificate.company_id,
      company_name: certificate.company_name || "",
      company_address: certificate.company_address || "",
      company_phone: certificate.company_phone || "",
      training_name: certificate.training_name,
      training_date: certificate.training_date,
      training_duration: certificate.training_duration,
      certificate_type: certificate.certificate_type,
      validity_date: certificate.validity_date || "",
      logo_url: certificate.logo_url || "",
      template_type: (certificate.template_type as any) || "classic",
      frame_style: (certificate.frame_style as any) || "gold",
      trainer_names: certificate.trainer_names || [""],
      notes: certificate.notes || "",
    });

    const { data: participantRows } = await (supabase as any).from("certificate_participants").select("*").eq("certificate_id", certificate.id).order("created_at", { ascending: true });
    setParticipants(participantRows || []);
    setTrainerNamesInput((certificate.trainer_names || [""]).join(", "));
    await refreshJobStatus(certificate.id);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sertifika Üretim Merkezi</h1>
          <p className="text-sm text-muted-foreground mt-1">Toplu sertifika üretimi, premium tema seçimi ve worker tabanlı ZIP teslim akışı.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="px-3 py-1">10.000 kayıt hedefi</Badge>
          <Badge variant="secondary" className="px-3 py-1">3 premium tema</Badge>
          <Badge variant="secondary" className="px-3 py-1">Paralel worker</Badge>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/dashboard/certificates/history"><History className="h-4 w-4" /> Geçmiş İşler</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1.25fr]">
        <div className="space-y-6">
          <Card className="border-primary/20 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> Eğitim ve Firma Bilgileri</CardTitle>
              <CardDescription>Firma bilgilerini şirket yönetiminden çekebilir veya manuel düzenleyebilirsiniz.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Firma Seçimi</Label>
                  <Select value={form.company_id || "manual"} onValueChange={(value) => value !== "manual" ? void applyCompany(value) : (setForm((prev) => ({ ...prev, company_id: null })), setEmployeeLoadState("idle"), setEmployeeLoadMessage(""))}>
                    <SelectTrigger><SelectValue placeholder="Firma seçin" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manuel giriş</SelectItem>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>{company.company_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Firma Adı</Label><Input value={form.company_name} onChange={(e) => setForm((prev) => ({ ...prev, company_name: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Telefon</Label><Input value={form.company_phone} onChange={(e) => setForm((prev) => ({ ...prev, company_phone: e.target.value }))} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Adres</Label><Textarea value={form.company_address} onChange={(e) => setForm((prev) => ({ ...prev, company_address: e.target.value }))} className="min-h-20" /></div>
                <div className="space-y-2"><Label>Eğitim Adı</Label><Input value={form.training_name} onChange={(e) => setForm((prev) => ({ ...prev, training_name: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Eğitim Tarihi</Label><Input type="date" value={form.training_date} onChange={(e) => setForm((prev) => ({ ...prev, training_date: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Eğitim Süresi</Label><Input value={form.training_duration} onChange={(e) => setForm((prev) => ({ ...prev, training_duration: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Geçerlilik Tarihi</Label><Input type="date" value={form.validity_date} onChange={(e) => setForm((prev) => ({ ...prev, validity_date: e.target.value }))} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Eğitmenler</Label><Input value={trainerNamesInput} onChange={(e) => { const nextValue = e.target.value; setTrainerNamesInput(nextValue); setForm((prev) => ({ ...prev, trainer_names: nextValue.split(",").map((item) => item.trim()).filter(Boolean) })); }} placeholder="Uzman adlarını virgül ile ayırın" /></div>
                <div className="space-y-2 md:col-span-2"><Label>Notlar</Label><Textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} className="min-h-24" /></div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Logo</Label>
                  <div className="flex gap-2">
                    <Input value={form.logo_url} onChange={(e) => setForm((prev) => ({ ...prev, logo_url: e.target.value }))} placeholder="Logo URL veya yükleme kullanın" />
                    <label className="inline-flex">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && void handleLogoUpload(e.target.files[0])} />
                      <Button type="button" variant="outline" className="gap-2" asChild>
                        <span>{uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} Logo</span>
                      </Button>
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Premium Tema Seçimi</CardTitle>
              <CardDescription>Kurumsal baskı ihtiyacına uygun üç farklı sertifika görünümünden birini seçin.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {templateCards.map((template) => (
                <button
                  key={template.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, template_type: template.value }))}
                  className={`rounded-2xl border p-4 text-left transition-all ${form.template_type === template.value ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : "border-border hover:border-primary/40 hover:bg-secondary/40"}`}
                >
                  <p className="text-sm font-semibold">{template.title}</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{template.text}</p>
                  <Badge variant="secondary" className="mt-4">{template.value}</Badge>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Üretim Durumu</CardTitle>
              <CardDescription>Queue, worker ve ZIP üretim akışını gerçek zamanlı izleyin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`rounded-2xl border px-4 py-4 ${jobStatusMeta.tone}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{jobStatusMeta.label}</p>
                    <p className="mt-1 text-sm">{jobStatusMeta.summary}</p>
                  </div>
                  <Badge variant="secondary" className="bg-background/70">%{Math.round(activeJob?.progress || 0)}</Badge>
                </div>
                <p className="mt-3 text-xs opacity-90">{jobStatusMeta.detail}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">Durum</p><p className="text-lg font-semibold mt-1">{jobStatusMeta.label}</p></div>
                <div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">Tamamlanan</p><p className="text-lg font-semibold mt-1">{activeJob?.completed_files || 0} / {activeJob?.total_files || participants.length}</p></div>
                <div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">İlerleme</p><p className="text-lg font-semibold mt-1">%{Math.round(activeJob?.progress || 0)}</p></div>
              </div>
              <Progress value={activeJob?.progress || 0} className="h-3" />
              {activeJob?.error_message && (
                <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-sm text-orange-800 dark:text-orange-200">
                  <p className="font-medium">Son hata özeti</p>
                  <p className="mt-1 break-words text-xs">{activeJob.error_message}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => void handleCreate()} disabled={submitting} variant="outline" className="gap-2"><Plus className="h-4 w-4" /> İşi Kaydet</Button>
                <Button onClick={() => void handleGenerate()} disabled={submitting} className="gap-2"><RefreshCw className="h-4 w-4" /> Generate Certificates</Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2"><Eye className="h-4 w-4" /> Preview Certificate</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-6xl border-border/70 bg-background/95">
                    <DialogHeader>
                      <DialogTitle>Sertifika Önizleme</DialogTitle>
                      <DialogDescription>
                        Seçilen tema, firma bilgileri ve ilk katılımcı ile oluşturulan örnek sertifika görünümü.
                      </DialogDescription>
                    </DialogHeader>
                    <CertificatePreviewCard form={form} participant={previewParticipant} className="min-h-[540px]" />
                  </DialogContent>
                </Dialog>
                <Button onClick={() => void handleDownloadSinglePdf()} disabled={completedItems.length === 0} variant="outline" className="gap-2"><Download className="h-4 w-4" /> Download PDF</Button>
                <Button onClick={() => void handleDownloadZip()} disabled={!activeJob?.zip_path} variant="outline" className="gap-2"><FileArchive className="h-4 w-4" /> Download ZIP</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-white">Canlı Önizleme</CardTitle>
              <CardDescription className="text-slate-300">Seçilen tema ve firma bilgileriyle gerçek baskı hissine yakın önizleme.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <CertificatePreviewCard form={form} participant={previewParticipant} className="min-h-[540px]" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Katılımcı Listesi</CardTitle>
              <CardDescription>Excel ile yükleyin veya manuel ekleyin. Worker kuyruğu her katılımcı için ayrı PDF üretir.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {employeeLoadState !== "idle" && (
                <div className={`rounded-xl border px-4 py-3 text-sm ${employeeLoadState === "loaded" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
                  {employeeLoadMessage}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="gap-2" onClick={() => createCertificateExcelTemplate()}><FileSpreadsheet className="h-4 w-4" /> Excel Şablonu</Button>
                <label>
                  <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && void handleExcelUpload(e.target.files[0])} />
                  <Button type="button" variant="outline" className="gap-2" asChild><span><Upload className="h-4 w-4" /> Excel Yükle</span></Button>
                </label>
                <Button type="button" variant="outline" className="gap-2" onClick={addParticipant}><Plus className="h-4 w-4" /> Katılımcı Ekle</Button>
              </div>
              <div className="max-h-[520px] overflow-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ad Soyad</TableHead>
                      <TableHead>T.C. No</TableHead>
                      <TableHead>Görev</TableHead>
                      <TableHead className="w-[80px]">İşlem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participants.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-10">Henüz katılımcı eklenmedi.</TableCell></TableRow>
                    ) : participants.map((participant, index) => (
                      <TableRow key={participant.id || `participant-${index}`}>
                        <TableCell><Input value={participant.name} onChange={(e) => updateParticipant(index, { name: e.target.value })} /></TableCell>
                        <TableCell><Input value={participant.tc_no || ""} onChange={(e) => updateParticipant(index, { tc_no: e.target.value })} /></TableCell>
                        <TableCell><Input value={participant.job_title || ""} onChange={(e) => updateParticipant(index, { job_title: e.target.value })} /></TableCell>
                        <TableCell><Button type="button" variant="ghost" size="sm" onClick={() => removeParticipant(index)}>Sil</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Geçmiş İşler ve Tekrar Basım</CardTitle>
              <CardDescription>Önceki sertifika kayıtlarını seçip yeniden üretim başlatabilirsiniz.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentCertificates.length === 0 ? (
                <p className="text-sm text-muted-foreground">Henüz sertifika işi bulunmuyor.</p>
              ) : recentCertificates.map((certificate) => (
                <div key={certificate.id} className="rounded-xl border p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-semibold">{certificate.training_name}</p>
                    <p className="text-sm text-muted-foreground">{certificate.company_name || "Firma yok"} • {certificate.training_date}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => void loadCertificate(certificate)}>Yükle</Button>
                    <Button variant="outline" size="sm" asChild><Link to={`/dashboard/certificates/${certificate.id}`}>Detay</Link></Button>
                    <Button size="sm" onClick={() => void handleGenerate(certificate)}>Tekrar Bas</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


