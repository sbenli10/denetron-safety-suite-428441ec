// src/components/isg-bot/ISGBotDashboard.tsx

"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  FileText,
  Filter,
  Search,
  TrendingUp,
  Shield,
  Loader2,
  AlertCircle,
  Building2,
  Calendar,
  Activity,
  MoreVertical,
  Eye,
  Trash2,
  FileBarChart,
  Zap,
  MinusCircle,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

// ====================================================
// TYPES
// ====================================================

interface Company {
  id: string;
  sgk_no: string;
  company_name: string;
  employee_count: number;
  hazard_class: string;
  assigned_minutes: number;
  required_minutes: number;
  compliance_status: string;
  risk_score: number;
  contract_end: string | null;
  contract_start: string | null;
  last_synced_at: string | null;
  created_at: string;
  nace_code?: string;
  service_provider_name?: string;
  assigned_person_name?: string;
}

interface DashboardStats {
  totalCompanies: number;
  compliant: number;
  warning: number;
  critical: number;
  excess: number;
  unknown: number;
  totalEmployees: number;
  avgRiskScore: number;
  expiringContracts: number;
  expiredContracts: number;
  criticalFlags: number;
  warningFlags: number;
  highRiskCompanies: number;
  complianceRate: number;
}

interface ComplianceFlag {
  id: string;
  company_id: string;
  rule_name: string;
  severity: string;
  message: string;
  created_at: string;
  company?: {
    company_name: string;
  };
}

// ====================================================
// UTILITY FUNCTIONS (OUTSIDE COMPONENT)
// ====================================================

const getComplianceColor = (status: string): string => {
  const colors: Record<string, string> = {
    COMPLIANT: "bg-emerald-500",
    WARNING: "bg-amber-500",
    CRITICAL: "bg-rose-500",
    EXCESS: "bg-sky-500",
    UNKNOWN: "bg-slate-400",
  };
  return colors[status] || colors.UNKNOWN;
};

const getComplianceBadgeVariant = (status: string): any => {
  const variants: Record<string, any> = {
    COMPLIANT: "default",
    WARNING: "secondary",
    CRITICAL: "destructive",
    EXCESS: "outline",
    UNKNOWN: "outline",
  };
  return variants[status] || "outline";
};

const getComplianceLabel = (status: string): string => {
  const labels: Record<string, string> = {
    COMPLIANT: "Uyumlu",
    WARNING: "Sınırda",
    CRITICAL: "Kritik",
    EXCESS: "Fazla",
    UNKNOWN: "Bilinmiyor",
  };
  return labels[status] || "Bilinmiyor";
};

const getComplianceIcon = (status: string) => {
  const icons: Record<string, any> = {
    COMPLIANT: CheckCircle2,
    WARNING: AlertTriangle,
    CRITICAL: AlertCircle,
    EXCESS: ArrowUpRight,
    UNKNOWN: MinusCircle,
  };
  const Icon = icons[status] || MinusCircle;
  return <Icon className="h-4 w-4" />;
};

const getRiskColor = (score: number): string => {
  if (score >= 70) return "text-rose-600";
  if (score >= 50) return "text-amber-600";
  return "text-emerald-600";
};

const getRiskBadge = (score: number) => {
  if (score >= 70)
    return (
      <Badge variant="destructive" className="font-semibold">
        Yüksek Risk
      </Badge>
    );
  if (score >= 50)
    return (
      <Badge variant="secondary" className="font-semibold">
        Orta Risk
      </Badge>
    );
  return (
    <Badge variant="outline" className="font-semibold">
      Düşük Risk
    </Badge>
  );
};

const calculateDaysUntilExpiry = (contractEnd: string | null): number | null => {
  if (!contractEnd) return null;
  const now = new Date();
  const end = new Date(contractEnd);
  const diff = end.getTime() - now.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

// ====================================================
// COMPONENT
// ====================================================

export default function ISGBotDashboard() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [flags, setFlags] = useState<ComplianceFlag[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [complianceFilter, setComplianceFilter] = useState<string>("all");
  const [hazardFilter, setHazardFilter] = useState<string>("all");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // ====================================================
  // EFFECTS
  // ====================================================

  useEffect(() => {
    if (user) {
      loadDashboard();
    }
  }, [user]);

  // ====================================================
  // LOAD DASHBOARD
  // ====================================================

  const loadDashboard = async () => {
    if (!user) {
      setError("Lütfen giriş yapın");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const orgId = user.id;

      // Fetch companies
      const { data: companiesData, error: companiesError } = await supabase
        .from("isgkatip_companies")
        .select("*")
        .eq("org_id", orgId)
        .eq("is_deleted", false)
        .order("risk_score", { ascending: false });

      if (companiesError) throw companiesError;

      setCompanies(companiesData || []);

      // Fetch flags
      const { data: flagsData } = await supabase
        .from("isgkatip_compliance_flags")
        .select(`
          *,
          company:isgkatip_companies!inner(company_name)
        `)
        .eq("org_id", orgId)
        .eq("status", "OPEN")
        .order("created_at", { ascending: false })
        .limit(10);

      setFlags(flagsData || []);

      // Calculate stats
      const totalCompanies = companiesData?.length || 0;
      const compliant =
        companiesData?.filter((c) => c.compliance_status === "COMPLIANT")
          .length || 0;
      const warning =
        companiesData?.filter((c) => c.compliance_status === "WARNING").length ||
        0;
      const critical =
        companiesData?.filter((c) => c.compliance_status === "CRITICAL")
          .length || 0;
      const excess =
        companiesData?.filter((c) => c.compliance_status === "EXCESS").length ||
        0;
      const unknown =
        companiesData?.filter((c) => c.compliance_status === "UNKNOWN").length ||
        0;

      const totalEmployees =
        companiesData?.reduce((sum, c) => sum + (c.employee_count || 0), 0) || 0;

      const avgRiskScore = totalCompanies
        ? Math.round(
            companiesData.reduce((sum, c) => sum + (c.risk_score || 0), 0) /
              totalCompanies
          )
        : 0;

      const highRiskCompanies =
        companiesData?.filter((c) => c.risk_score >= 70).length || 0;

      const complianceRate = totalCompanies
        ? Math.round((compliant / totalCompanies) * 100)
        : 0;

      const now = new Date();
      const thirtyDaysFromNow = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000
      );

      const expiringContracts =
        companiesData?.filter((c) => {
          if (!c.contract_end) return false;
          const contractEnd = new Date(c.contract_end);
          return contractEnd >= now && contractEnd <= thirtyDaysFromNow;
        }).length || 0;

      const expiredContracts =
        companiesData?.filter((c) => {
          if (!c.contract_end) return false;
          return new Date(c.contract_end) < now;
        }).length || 0;

      const criticalFlags =
        flagsData?.filter((f) => f.severity === "CRITICAL").length || 0;
      const warningFlags =
        flagsData?.filter((f) => f.severity === "WARNING").length || 0;

      setStats({
        totalCompanies,
        compliant,
        warning,
        critical,
        excess,
        unknown,
        totalEmployees,
        avgRiskScore,
        expiringContracts,
        expiredContracts,
        criticalFlags,
        warningFlags,
        highRiskCompanies,
        complianceRate,
      });

      if (totalCompanies === 0) {
        setError("Henüz firma verisi yok. İSG-KATİP'ten senkronize edin.");
      }
    } catch (error: any) {
      console.error("❌ Dashboard load error:", error);
      setError(error.message || "Dashboard yüklenemedi");
      toast.error("Dashboard yüklenemedi", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // ====================================================
  // HANDLERS
  // ====================================================

  const handleSync = async () => {
    setSyncing(true);
    toast.info("Veriler yenileniyor...");

    try {
      await loadDashboard();
      toast.success("Senkronizasyon tamamlandı");
    } catch (error: any) {
      toast.error("Senkronizasyon hatası");
    } finally {
      setSyncing(false);
    }
  };

  const handleRunComplianceCheck = async () => {
    setSyncing(true);
    toast.info("Compliance kontrol ediliyor...");

    try {
      const orgId = user!.id;
      let flagsCreated = 0;

      for (const company of companies) {
        if (company.assigned_minutes < company.required_minutes) {
          const shortage = company.required_minutes - company.assigned_minutes;
          const isCritical =
            company.assigned_minutes < company.required_minutes * 0.5;

          await supabase.from("isgkatip_compliance_flags").insert({
            org_id: orgId,
            company_id: company.id,
            rule_name: "DURATION_CHECK",
            severity: isCritical ? "CRITICAL" : "WARNING",
            message: `Eksik süre: ${shortage} dk/ay`,
            details: {
              required: company.required_minutes,
              assigned: company.assigned_minutes,
              shortage,
            },
            status: "OPEN",
          });
          flagsCreated++;
        }

        if (company.contract_end) {
          const now = new Date();
          const contractEnd = new Date(company.contract_end);
          const daysUntilExpiry = Math.floor(
            (contractEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysUntilExpiry < 0) {
            await supabase.from("isgkatip_compliance_flags").insert({
              org_id: orgId,
              company_id: company.id,
              rule_name: "CONTRACT_EXPIRED",
              severity: "CRITICAL",
              message: `Sözleşme ${Math.abs(daysUntilExpiry)} gün önce doldu`,
              status: "OPEN",
            });
            flagsCreated++;
          } else if (daysUntilExpiry <= 30) {
            await supabase.from("isgkatip_compliance_flags").insert({
              org_id: orgId,
              company_id: company.id,
              rule_name: "CONTRACT_EXPIRING",
              severity: "WARNING",
              message: `Sözleşme ${daysUntilExpiry} gün içinde dolacak`,
              status: "OPEN",
            });
            flagsCreated++;
          }
        }
      }

      toast.success(`${flagsCreated} yeni bayrak oluşturuldu`);
      await loadDashboard();
    } catch (error: any) {
      toast.error("Compliance kontrol hatası");
    } finally {
      setSyncing(false);
    }
  };

  // ====================================================
  // FILTERED COMPANIES
  // ====================================================

  const filteredCompanies = companies.filter((company) => {
    const matchesSearch =
      company.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.sgk_no.includes(searchTerm);

    const matchesCompliance =
      complianceFilter === "all" ||
      company.compliance_status === complianceFilter;

    const matchesHazard =
      hazardFilter === "all" || company.hazard_class === hazardFilter;

    return matchesSearch && matchesCompliance && matchesHazard;
  });

  // ====================================================
  // LOADING STATE
  // ====================================================

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <div className="relative">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold">Dashboard Yükleniyor</p>
          <p className="text-sm text-muted-foreground">
            Veriler hazırlanıyor...
          </p>
        </div>
      </div>
    );
  }

  // ====================================================
  // ERROR STATE
  // ====================================================

  if (error && companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-6 p-6">
        <div className="relative">
          <div className="absolute inset-0 blur-3xl bg-orange-500/20 animate-pulse" />
          <AlertTriangle className="relative h-20 w-20 text-orange-500" />
        </div>
        <div className="text-center max-w-md space-y-2">
          <h2 className="text-2xl font-bold">Henüz Firma Verisi Yok</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={loadDashboard} variant="outline" size="lg">
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
          <Button onClick={handleSync} size="lg">
            <Shield className="h-4 w-4 mr-2" />
            İlk Senkronizasyonu Başlat
          </Button>
        </div>
      </div>
    );
  }

  // ====================================================
  // MAIN RENDER
  // ====================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            İSG Bot Dashboard
          </h1>
          <p className="text-muted-foreground">
            İSG-KATİP entegrasyonu ve gerçek zamanlı compliance takibi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleRunComplianceCheck}
                  variant="outline"
                  disabled={syncing || companies.length === 0}
                >
                  {syncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Compliance Kontrol Çalıştır</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button onClick={handleSync} disabled={syncing}>
            {syncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Yenileniyor...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Yenile
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {stats && (stats.expiredContracts > 0 || stats.criticalFlags > 0) && (
        <Alert variant="destructive" className="border-2">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="font-bold text-lg">
            Acil Dikkat Gerektiren Durumlar
          </AlertTitle>
          <AlertDescription className="mt-2 space-y-1">
            {stats.expiredContracts > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="font-semibold">
                  {stats.expiredContracts} sözleşme süresi dolmuş
                </span>
              </div>
            )}
            {stats.criticalFlags > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-semibold">
                  {stats.criticalFlags} kritik compliance bayrağı açık
                </span>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Companies */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-16 translate-x-16" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Toplam Firma
                </CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalCompanies}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalEmployees.toLocaleString("tr-TR")} toplam çalışan
              </p>
              <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600">
                <TrendingUp className="h-3 w-3" />
                <span>Aktif</span>
              </div>
            </CardContent>
          </Card>

          {/* Compliant */}
          <Card className="relative overflow-hidden border-emerald-200 dark:border-emerald-900">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -translate-y-16 translate-x-16" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Uyumlu Firmalar
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">
                {stats.compliant}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                %{stats.complianceRate} uyum oranı
              </p>
              <Progress value={stats.complianceRate} className="h-2 mt-2" />
            </CardContent>
          </Card>

          {/* Warning */}
          <Card className="relative overflow-hidden border-amber-200 dark:border-amber-900">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -translate-y-16 translate-x-16" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Uyarı Durumu
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">
                {stats.warning}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.warningFlags} açık bayrak
              </p>
              <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                <Clock className="h-3 w-3" />
                <span>Dikkat gerekiyor</span>
              </div>
            </CardContent>
          </Card>

          {/* Critical */}
          <Card className="relative overflow-hidden border-rose-200 dark:border-rose-900">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full -translate-y-16 translate-x-16" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Kritik Durumlar
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-rose-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-rose-600">
                {stats.critical}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.criticalFlags} kritik bayrak
              </p>
              <div className="flex items-center gap-1 mt-2 text-xs text-rose-600">
                <Zap className="h-3 w-3" />
                <span>Acil müdahale</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Flags */}
      {flags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Son Compliance Bayrakları
            </CardTitle>
            <CardDescription>
              Sistemin tespit ettiği son uyumsuzluklar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {flags.map((flag) => (
                  <div
                    key={flag.id}
                    className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div
                      className={`p-2 rounded-full ${
                        flag.severity === "CRITICAL"
                          ? "bg-rose-100 text-rose-600 dark:bg-rose-900/20"
                          : "bg-amber-100 text-amber-600 dark:bg-amber-900/20"
                      }`}
                    >
                      {flag.severity === "CRITICAL" ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={
                            flag.severity === "CRITICAL"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {flag.severity}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(flag.created_at).toLocaleDateString("tr-TR")}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{flag.message}</p>
                      {flag.company && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {(flag.company as any).company_name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      {companies.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Firma adı veya SGK sicil no ara..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <Select
                value={complianceFilter}
                onValueChange={setComplianceFilter}
              >
                <SelectTrigger className="w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Uyum Durumu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  <SelectItem value="COMPLIANT">✅ Uyumlu</SelectItem>
                  <SelectItem value="WARNING">⚠️ Sınırda</SelectItem>
                  <SelectItem value="CRITICAL">🔴 Kritik</SelectItem>
                  <SelectItem value="EXCESS">📊 Fazla</SelectItem>
                </SelectContent>
              </Select>

              <Select value={hazardFilter} onValueChange={setHazardFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Tehlike Sınıfı" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Sınıflar</SelectItem>
                  <SelectItem value="Az Tehlikeli">Az Tehlikeli</SelectItem>
                  <SelectItem value="Tehlikeli">Tehlikeli</SelectItem>
                  <SelectItem value="Çok Tehlikeli">Çok Tehlikeli</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Companies Table */}
      {companies.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>İşyerleri ({filteredCompanies.length})</CardTitle>
                <CardDescription>
                  İSG-KATİP'ten senkronize edilen tüm firmalar
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredCompanies.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                <p className="text-muted-foreground">
                  Filtre kriterlerine uygun firma bulunamadı
                </p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Firma</TableHead>
                      <TableHead className="font-semibold">SGK No</TableHead>
                      <TableHead className="font-semibold">Çalışan</TableHead>
                      <TableHead className="font-semibold">Tehlike</TableHead>
                      <TableHead className="font-semibold">Süre</TableHead>
                      <TableHead className="font-semibold">Uyum</TableHead>
                      <TableHead className="font-semibold">Risk</TableHead>
                      <TableHead className="font-semibold">Sözleşme</TableHead>
                      <TableHead className="text-right font-semibold">
                        İşlem
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanies.map((company) => {
                      const daysUntilExpiry = calculateDaysUntilExpiry(
                        company.contract_end
                      );
                      const compliancePercentage =
                        company.required_minutes > 0
                          ? Math.round(
                              (company.assigned_minutes /
                                company.required_minutes) *
                                100
                            )
                          : 0;

                      return (
                        <TableRow
                          key={company.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {company.company_name}
                              </div>
                              {company.service_provider_name && (
                                <div className="text-xs text-muted-foreground">
                                  {company.service_provider_name}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {company.sgk_no}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {company.employee_count}
                              </span>
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
                            <div className="space-y-1">
                              <div className="text-sm font-medium">
                                {company.assigned_minutes} /{" "}
                                {company.required_minutes} dk
                              </div>
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={compliancePercentage}
                                  className="h-1.5 flex-1"
                                />
                                <span className="text-xs text-muted-foreground">
                                  %{compliancePercentage}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getComplianceIcon(company.compliance_status)}
                              <Badge
                                variant={getComplianceBadgeVariant(
                                  company.compliance_status
                                )}
                              >
                                {getComplianceLabel(company.compliance_status)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-lg font-bold ${getRiskColor(
                                  company.risk_score
                                )}`}
                              >
                                {company.risk_score}
                              </span>
                              {getRiskBadge(company.risk_score)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {company.contract_end ? (
                              <div>
                                <div className="text-sm font-medium">
                                  {new Date(
                                    company.contract_end
                                  ).toLocaleDateString("tr-TR")}
                                </div>
                                {daysUntilExpiry !== null && (
                                  <Badge
                                    variant={
                                      daysUntilExpiry < 0
                                        ? "destructive"
                                        : daysUntilExpiry <= 30
                                        ? "secondary"
                                        : "outline"
                                    }
                                    className="text-xs mt-1"
                                  >
                                    {daysUntilExpiry < 0
                                      ? `${Math.abs(daysUntilExpiry)} gün geçti`
                                      : `${daysUntilExpiry} gün kaldı`}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setSelectedCompany(company)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Detayları Gör
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <FileBarChart className="h-4 w-4 mr-2" />
                                  Rapor Oluştur
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Sil
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Company Details Dialog */}
      {selectedCompany && (
        <Dialog
          open={!!selectedCompany}
          onOpenChange={() => setSelectedCompany(null)}
        >
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {selectedCompany.company_name}
              </DialogTitle>
              <DialogDescription>
                Firma detayları ve compliance bilgileri
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant={getComplianceBadgeVariant(selectedCompany.compliance_status)}>
                  {getComplianceLabel(selectedCompany.compliance_status)}
                </Badge>
                {getRiskBadge(selectedCompany.risk_score)}
                <Badge variant="outline">
                  {selectedCompany.employee_count} Çalışan
                </Badge>
                <Badge variant="outline">{selectedCompany.hazard_class}</Badge>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Firma Bilgileri
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-muted-foreground">SGK Sicil No</dt>
                      <dd className="font-mono">{selectedCompany.sgk_no}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">NACE Kodu</dt>
                      <dd>{selectedCompany.nace_code || "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Çalışan Sayısı</dt>
                      <dd>{selectedCompany.employee_count}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Tehlike Sınıfı</dt>
                      <dd>{selectedCompany.hazard_class}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Süre Bilgileri
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Atanan Süre</dt>
                      <dd className="font-semibold">
                        {selectedCompany.assigned_minutes} dk/ay
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Gerekli Süre</dt>
                      <dd className="font-semibold">
                        {selectedCompany.required_minutes} dk/ay
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Uyum Oranı</dt>
                      <dd>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={
                              selectedCompany.required_minutes > 0
                                ? (selectedCompany.assigned_minutes /
                                    selectedCompany.required_minutes) *
                                  100
                                : 0
                            }
                            className="flex-1"
                          />
                          <span className="font-semibold">
                            %
                            {selectedCompany.required_minutes > 0
                              ? Math.round(
                                  (selectedCompany.assigned_minutes /
                                    selectedCompany.required_minutes) *
                                    100
                                )
                              : 0}
                          </span>
                        </div>
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {selectedCompany.contract_end && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Sözleşme Bilgileri
                    </h3>
                    <dl className="space-y-2 text-sm">
                      {selectedCompany.contract_start && (
                        <div>
                          <dt className="text-muted-foreground">
                            Başlangıç Tarihi
                          </dt>
                          <dd>
                            {new Date(
                              selectedCompany.contract_start
                            ).toLocaleDateString("tr-TR")}
                          </dd>
                        </div>
                      )}
                      <div>
                        <dt className="text-muted-foreground">Bitiş Tarihi</dt>
                        <dd>
                          {new Date(
                            selectedCompany.contract_end
                          ).toLocaleDateString("tr-TR")}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Kalan Süre</dt>
                        <dd>
                          {(() => {
                            const days = calculateDaysUntilExpiry(
                              selectedCompany.contract_end
                            );
                            return days !== null
                              ? days < 0
                                ? `${Math.abs(days)} gün önce doldu`
                                : `${days} gün kaldı`
                              : "-";
                          })()}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}