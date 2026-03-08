//src\pages\EmailHistory.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Calendar, User, FileText, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function EmailHistory() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmailLogs();
  }, [user?.id]);

  const loadEmailLogs = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

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
      .limit(50);

    if (!error) setLogs(data || []);
    setLoading(false);
  };

  const reportTypeLabels = {
    risk_assessment: "Risk Raporu",
    dof: "DÖF Raporu",
    adep: "ADEP Planı",
    inspection: "Denetim Raporu",
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gönderilen E-postalar
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Yükleniyor...</p>
          ) : logs.length === 0 ? (
            <p className="text-muted-foreground">Henüz e-posta gönderilmemiş</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 hover:bg-muted/50 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span className="font-semibold">{log.subject}</span>
                        <Badge variant="outline">{reportTypeLabels[log.report_type as keyof typeof reportTypeLabels]}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
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
                      className="text-blue-500 hover:text-blue-700"
                    >
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
