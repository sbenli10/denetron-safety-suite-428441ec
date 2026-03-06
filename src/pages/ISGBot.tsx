// src/pages/ISGBot.tsx

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Shield,
  BarChart3,
  FileCheck,
  TrendingUp,
  Bot,
  Zap,
  Building2,
  Users,
  CheckCircle,
  AlertTriangle,
  Clock,
  MoreVertical,
  Trash2,
  History,
  RefreshCw,
  Settings,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

// ====================================================
// TYPES
// ====================================================

interface ISGKatipCompany {
  id: string;
  org_id: string;
  sgk_no: string;
  company_name: string;
  employee_count: number;
  hazard_class: string;
  nace_code: string | null;
  assigned_minutes: number;
  required_minutes: number;
  compliance_status: string;
  risk_score: number;
  contract_start: string | null;
  contract_end: string | null;
  last_synced_at: string;
  contract_id?: string;
  contract_type?: string;
  assigned_person_name?: string;
}

interface Stats {
  totalCompanies: number;
  compliant: number;
  warning: number;
  critical: number;
  totalEmployees: number;
  avgRiskScore: number;
}

// ====================================================
// MAIN COMPONENT
// ====================================================

export default function ISGBot() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<ISGKatipCompany[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCompanies: 0,
    compliant: 0,
    warning: 0,
    critical: 0,
    totalEmployees: 0,
    avgRiskScore: 0,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Get user
  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    }
    getUser();
  }, []);

  // Load data
  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  async function loadData() {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", userId!)
        .single();

      if (!profile?.organization_id) {
        throw new Error("Organization not found");
      }

      const { data: companiesData, error } = await supabase
        .from("isgkatip_companies")
        .select("*")
        .eq("org_id", profile.organization_id)
        .eq("is_deleted", false)
        .order("company_name", { ascending: true });

      if (error) throw error;

      setCompanies(companiesData || []);

      const totalEmployees =
        companiesData?.reduce((sum, c) => sum + c.employee_count, 0) || 0;

      const avgRiskScore = companiesData?.length
        ? Math.round(
            companiesData.reduce((sum, c) => sum + c.risk_score, 0) /
              companiesData.length
          )
        : 0;

      setStats({
        totalCompanies: companiesData?.length || 0,
        compliant:
          companiesData?.filter((c) => c.compliance_status === "COMPLIANT")
            .length || 0,
        warning:
          companiesData?.filter((c) => c.compliance_status === "WARNING")
            .length || 0,
        critical:
          companiesData?.filter((c) => c.compliance_status === "CRITICAL")
            .length || 0,
        totalEmployees,
        avgRiskScore,
      });
    } catch (error: any) {
      console.error("Load data error:", error);
      toast({
        title: "Hata",
        description: error.message || "Veriler yüklenemedi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(companyId: string, companyName: string) {
    if (
      !confirm(
        `"${companyName}" firmasını silmek istediğinizden emin misiniz?\n\nFirma "Silme Geçmişi" bölümünden geri getirilebilir.`
      )
    ) {
      return;
    }

    try {
      const supabase = createClient();

      const { data, error } = await supabase.rpc(
        "soft_delete_isgkatip_company",
        {
          p_company_id: companyId,
          p_deletion_reason: "Kullanıcı tarafından silindi",
        }
      );

      if (error) throw error;

      toast({
        title: "Başarılı",
        description: `${companyName} silindi`,
      });

      loadData();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Hata",
        description: error.message || "Firma silinemedi",
        variant: "destructive",
      });
    }
  }

  async function handleSync() {
    setSyncing(true);

    toast({
      title: "Senkronizasyon Başlatıldı",
      description: "Veriler yenileniyor...",
    });

    if (typeof window !== "undefined" && (window as any).chrome?.runtime) {
      try {
        (window as any).chrome.runtime.sendMessage(
          { type: "SYNC_NOW" },
          (response: any) => {
            if (response?.success) {
              toast({
                title: "Başarılı",
                description: "Veriler güncellendi",
              });
              loadData();
            }
          }
        );
      } catch (error) {
        console.error("Extension message error:", error);
      }
    }

    setTimeout(() => {
      setSyncing(false);
      loadData();
    }, 3000);
  }

  function getComplianceBadge(status: string) {
    const variants: Record<
      string,
      { variant: any; icon: any; label: string }
    > = {
      COMPLIANT: {
        variant: "default",
        icon: CheckCircle,
        label: "Uyumlu",
      },
      WARNING: {
        variant: "secondary",
        icon: Clock,
        label: "Uyarı",
      },
      CRITICAL: {
        variant: "destructive",
        icon: AlertTriangle,
        label: "Kritik",
      },
      UNKNOWN: {
        variant: "outline",
        icon: Clock,
        label: "Bilinmiyor",
      },
    };

    const config = variants[status] || variants.UNKNOWN;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bot className="h-8 w-8 text-primary" />
            Akıllı İSG Operasyon Botu
          </h1>
          <p className="text-muted-foreground">
            İSG-KATİP entegrasyonu, compliance kontrolü ve risk analizi
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSync} disabled={syncing} variant="outline">
            <RefreshCw
              className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`}
            />
            Senkronize Et
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/isg-bot-deleted")}
          >
            <History className="h-4 w-4 mr-2" />
            Silme Geçmişi
          </Button>
        </div>
      </div>

      {/* INFO ALERT */}
      {companies.length === 0 && (
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong>Chrome Extension kurulumu gerekli:</strong> İSG-KATİP
                ile entegrasyon için Chrome uzantısını yükleyin.
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Firma</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompanies}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalEmployees} toplam çalışan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uyumlu</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.compliant}
            </div>
            <p className="text-xs text-muted-foreground">
              %
              {stats.totalCompanies
                ? Math.round((stats.compliant / stats.totalCompanies) * 100)
                : 0}{" "}
              uyum oranı
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uyarı</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.warning}
            </div>
            <p className="text-xs text-muted-foreground">Dikkat gerekiyor</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kritik</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.critical}
            </div>
            <p className="text-xs text-muted-foreground">Acil müdahale</p>
          </CardContent>
        </Card>
      </div>

      {/* TABS */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>

          <TabsTrigger value="audit" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Denetime Hazır mıyım?</span>
          </TabsTrigger>

          <TabsTrigger value="compliance" className="gap-2">
            <FileCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Compliance</span>
          </TabsTrigger>

          <TabsTrigger value="risk" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Risk Analizi</span>
          </TabsTrigger>
        </TabsList>

        {/* DASHBOARD TAB */}
        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>İşyerleri ({companies.length})</CardTitle>
              <CardDescription>
                İSG-KATİP'ten senkronize edilen tüm firmalar
              </CardDescription>
            </CardHeader>
            <CardContent>
              {companies.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Henüz işyeri verisi yok
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Firma</TableHead>
                        <TableHead>SGK No</TableHead>
                        <TableHead>Sözleşme ID</TableHead>
                        <TableHead>Çalışan</TableHead>
                        <TableHead>Tehlike</TableHead>
                        <TableHead>Atanan/Gerekli</TableHead>
                        <TableHead>Uyum</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead className="text-right">İşlem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companies.map((company) => (
                        <TableRow key={company.id}>
                          <TableCell className="font-medium">
                            {company.company_name}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {company.sgk_no}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {company.contract_id || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              {company.employee_count}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                company.hazard_class === "Çok Tehlikeli"
                                  ? "destructive"
                                  : company.hazard_class === "Tehlikeli"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {company.hazard_class}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">
                                {company.assigned_minutes} dk
                              </div>
                              <div className="text-xs text-muted-foreground">
                                / {company.required_minutes} dk
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getComplianceBadge(company.compliance_status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-12 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    company.risk_score >= 70
                                      ? "bg-red-500"
                                      : company.risk_score >= 50
                                      ? "bg-yellow-500"
                                      : "bg-green-500"
                                  }`}
                                  style={{ width: `${company.risk_score}%` }}
                                />
                              </div>
                              <span className="text-xs">
                                {company.risk_score}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() =>
                                    handleDelete(
                                      company.id,
                                      company.company_name
                                    )
                                  }
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Sil
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* OTHER TABS */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Denetime Hazır mıyım?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                Yakında...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Raporu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                Yakında...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk">
          <Card>
            <CardHeader>
              <CardTitle>Risk Analizi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                Yakında...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}