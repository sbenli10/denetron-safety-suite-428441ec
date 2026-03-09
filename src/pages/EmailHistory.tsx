import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Mail,
  Calendar,
  User,
  FileText,
  ExternalLink,
  Search,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type ReportType = "risk_assessment" | "dof" | "adep" | "inspection";
type EmailStatus = "sent" | "failed" | "bounced";

interface EmailLog {
  id: string;
  recipient_email: string;
  subject: string;
  report_type: ReportType;
  report_url: string;
  status: EmailStatus;
  created_at: string;
}

const reportTypeLabels: Record<ReportType, string> = {
  risk_assessment: "Risk Raporu",
  dof: "DÖF Raporu",
  adep: "ADEP Planı",
  inspection: "Denetim Raporu",
};

const statusLabels: Record<EmailStatus, string> = {
  sent: "Gönderildi",
  failed: "Başarısız",
  bounced: "Teslim Edilemedi",
};

const statusClasses: Record<EmailStatus, string> = {
  sent: "bg-emerald-500",
  failed: "bg-destructive",
  bounced: "bg-amber-500",
};

export default function EmailHistory() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    void loadEmailLogs();
  }, [user?.id]);

  const loadEmailLogs = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profileData?.organization_id) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("email_logs")
      .select("*")
      .eq("org_id", profileData.organization_id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      toast.error("E-posta geçmişi yüklenemedi");
      setLoading(false);
      return;
    }

    setLogs((data || []) as EmailLog[]);
    setLoading(false);
  };

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return logs;

    return logs.filter((log) => {
      const reportLabel = reportTypeLabels[log.report_type].toLowerCase();
      return (
        log.recipient_email.toLowerCase().includes(query) ||
        log.subject.toLowerCase().includes(query) ||
        reportLabel.includes(query)
      );
    });
  }, [logs, search]);

  const sentCount = useMemo(
    () => logs.filter((l) => l.status === "sent").length,
    [logs]
  );

  const failedCount = useMemo(
    () => logs.filter((l) => l.status !== "sent").length,
    [logs]
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Mail className="h-7 w-7 text-primary" />
            E-posta Geçmişi
          </h1>
          <p className="text-sm text-muted-foreground">
            Firmalara gönderilen raporları ve teslim durumlarını takip edin.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => void loadEmailLogs()}
        >
          <RefreshCw className="h-4 w-4" />
          Yenile
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardDescription>Toplam Kayıt</CardDescription>
            <CardTitle className="text-3xl">{logs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardDescription>Başarılı Gönderim</CardDescription>
            <CardTitle className="text-3xl text-emerald-600">{sentCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardDescription>Hata / Teslim Edilemedi</CardDescription>
            <CardTitle className="text-3xl text-amber-600">{failedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Gönderim Listesi</CardTitle>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Alıcı, konu veya rapor türü ara..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Yükleniyor...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Henüz e-posta kaydı bulunamadı.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-border/70 p-4 hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <p className="font-semibold truncate">{log.subject}</p>
                        <Badge variant="outline">
                          {reportTypeLabels[log.report_type]}
                        </Badge>
                        <Badge className={`${statusClasses[log.status]} text-white`}>
                          {statusLabels[log.status]}
                        </Badge>
                      </div>

                      <div className="text-sm text-muted-foreground grid gap-1">
                        <p className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          {log.recipient_email}
                        </p>
                        <p className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {new Date(log.created_at).toLocaleString("tr-TR")}
                        </p>
                      </div>
                    </div>

                    <a
                      href={log.report_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline shrink-0"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Görüntüle
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
