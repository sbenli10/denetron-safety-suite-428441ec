// ====================================================
// İSG BOT DASHBOARD - DÜZELTİLMİŞ VERSİYON
// ====================================================

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
} from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

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
}

interface DashboardStats {
  totalCompanies: number;
  compliant: number;
  warning: number;
  critical: number;
  expiringContracts: number;
  expiredContracts: number;
  criticalFlags: number;
  warningFlags: number;
}

export default function ISGBotDashboard() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [complianceFilter, setComplianceFilter] = useState<string>("all");
  const [hazardFilter, setHazardFilter] = useState<string>("all");

  // ✅ HARDCODED ORG ID (TEST İÇİN)
  // Production'da bu auth.user'dan alınacak
  const TEST_ORG_ID = "b3d557c8-78d1-46f8-a804-273833817f89";

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("🔄 Loading dashboard...");
      console.log("📍 Org ID:", TEST_ORG_ID);

      // ✅ DIRECT SUPABASE QUERY (Edge Function yerine)
      const { data: companiesData, error: companiesError } = await supabase
        .from("isgkatip_companies")
        .select("*")
        .eq("org_id", TEST_ORG_ID)
        .order("risk_score", { ascending: false });

      if (companiesError) {
        console.error("❌ Companies query error:", companiesError);
        throw new Error(companiesError.message);
      }

      console.log("✅ Companies loaded:", companiesData?.length || 0, companiesData);

      if (!companiesData || companiesData.length === 0) {
        toast.warning("Henüz firma verisi yok", {
          description: "İSG-KATİP'ten senkronize edin veya manuel ekleyin",
        });
      }

      setCompanies(companiesData || []);

      // ✅ CALCULATE STATS
      const totalCompanies = companiesData?.length || 0;
      const compliant =
        companiesData?.filter((c) => c.compliance_status === "COMPLIANT").length || 0;
      const warning =
        companiesData?.filter((c) => c.compliance_status === "WARNING").length || 0;
      const critical =
        companiesData?.filter((c) => c.compliance_status === "CRITICAL").length || 0;

      // Get compliance flags
      const { data: flagsData, error: flagsError } = await supabase
        .from("isgkatip_compliance_flags")
        .select("severity, status")
        .eq("org_id", TEST_ORG_ID)
        .eq("status", "OPEN");

      if (flagsError) {
        console.warn("⚠️ Flags query error:", flagsError);
      }

      const criticalFlags =
        flagsData?.filter((f) => f.severity === "CRITICAL").length || 0;
      const warningFlags =
        flagsData?.filter((f) => f.severity === "WARNING").length || 0;

      // Calculate expiring/expired contracts
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

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

      const calculatedStats: DashboardStats = {
        totalCompanies,
        compliant,
        warning,
        critical,
        expiringContracts,
        expiredContracts,
        criticalFlags,
        warningFlags,
      };

      console.log("📊 Calculated stats:", calculatedStats);
      setStats(calculatedStats);

      toast.success(`✅ ${totalCompanies} firma yüklendi`);
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

  const handleSync = async () => {
    toast.info("Senkronizasyon başlatılıyor...");
    try {
      await loadDashboard();
      toast.success("Senkronizasyon tamamlandı");
    } catch (error: any) {
      toast.error("Senkronizasyon hatası", {
        description: error.message,
      });
    }
  };

  const handleRunComplianceCheck = async () => {
    toast.info("Compliance kontrol ediliyor...");

    try {
      // Get all companies
      const { data: companiesData, error: companiesError } = await supabase
        .from("isgkatip_companies")
        .select("*")
        .eq("org_id", TEST_ORG_ID);

      if (companiesError) throw companiesError;

      let checkedCount = 0;

      // Run compliance checks
      for (const company of companiesData || []) {
        // Check duration
        if (company.assigned_minutes < company.required_minutes) {
          await supabase.from("isgkatip_compliance_flags").upsert(
            {
              org_id: TEST_ORG_ID,
              company_id: company.id,
              rule_name: "DURATION_CHECK",
              severity:
                company.assigned_minutes < company.required_minutes * 0.5
                  ? "CRITICAL"
                  : "WARNING",
              message: `Eksik süre: ${
                company.required_minutes - company.assigned_minutes
              } dk/ay`,
              details: {
                required: company.required_minutes,
                assigned: company.assigned_minutes,
              },
              status: "OPEN",
            },
            {
              onConflict: "company_id,rule_name,status",
              ignoreDuplicates: false,
            }
          );
        }

        checkedCount++;
      }

      toast.success(`${checkedCount} firma kontrol edildi`);
      await loadDashboard();
    } catch (error: any) {
      console.error("❌ Compliance check error:", error);
      toast.error("Compliance kontrol hatası", {
        description: error.message,
      });
    }
  };

  const getComplianceColor = (status: string) => {
    const colors: Record<string, string> = {
      COMPLIANT: "bg-green-500",
      WARNING: "bg-yellow-500",
      CRITICAL: "bg-red-500",
      EXCESS: "bg-blue-500",
      UNKNOWN: "bg-gray-500",
    };
    return colors[status] || colors.UNKNOWN;
  };

  const getComplianceLabel = (status: string) => {
    const labels: Record<string, string> = {
      COMPLIANT: "Uyumlu",
      WARNING: "Sınırda",
      CRITICAL: "Kritik",
      EXCESS: "Fazla",
      UNKNOWN: "Bilinmiyor",
    };
    return labels[status] || "Bilinmiyor";
  };

  const calculateDaysUntilExpiry = (contractEnd: string | null): number | null => {
    if (!contractEnd) return null;
    const now = new Date();
    const end = new Date(contractEnd);
    const diff = end.getTime() - now.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const filteredCompanies = companies.filter((company) => {
    const matchesSearch =
      company.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.sgk_no.includes(searchTerm);

    const matchesCompliance =
      complianceFilter === "all" || company.compliance_status === complianceFilter;

    const matchesHazard =
      hazardFilter === "all" || company.hazard_class === hazardFilter;

    return matchesSearch && matchesCompliance && matchesHazard;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Dashboard yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Dashboard Yüklenemedi</h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadDashboard}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tekrar Dene
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">İSG Bot Dashboard</h1>
          <p className="text-muted-foreground">
            İSG-KATİP entegrasyonu ve compliance takibi
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleRunComplianceCheck} variant="outline">
            <Shield className="h-4 w-4 mr-2" />
            Compliance Kontrol
          </Button>
          <Button onClick={handleSync}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Toplam Firma
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats.totalCompanies}</div>
                <Users className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Uyumlu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-green-600">
                  {stats.compliant}
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" />
              </div>
              <Progress
                value={
                  stats.totalCompanies > 0
                    ? (stats.compliant / stats.totalCompanies) * 100
                    : 0
                }
                className="mt-2 h-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Uyarı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-yellow-600">
                  {stats.warning}
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500 opacity-50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats.warningFlags} bayrak
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Kritik
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-red-600">
                  {stats.critical}
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500 opacity-50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats.criticalFlags} bayrak
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Expiring Contracts Alert */}
      {stats && stats.expiringContracts > 0 && (
        <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-900 dark:text-orange-100">
                  {stats.expiringContracts} sözleşme 30 gün içinde dolacak
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  {stats.expiredContracts} sözleşme süresi dolmuş
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
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

            <Select value={complianceFilter} onValueChange={setComplianceFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Uyum Durumu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="COMPLIANT">Uyumlu</SelectItem>
                <SelectItem value="WARNING">Sınırda</SelectItem>
                <SelectItem value="CRITICAL">Kritik</SelectItem>
                <SelectItem value="EXCESS">Fazla</SelectItem>
              </SelectContent>
            </Select>

            <Select value={hazardFilter} onValueChange={setHazardFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tehlike Sınıfı" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
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

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle>İşyerleri ({filteredCompanies.length})</CardTitle>
          <CardDescription>İSG-KATİP'ten senkronize edilen firmalar</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCompanies.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="mb-2">
                {companies.length === 0
                  ? "Henüz firma eklenmemiş"
                  : "Filtre kriterlerine uygun firma bulunamadı"}
              </p>
              {companies.length === 0 && (
                <Button variant="outline" onClick={handleSync} className="mt-4">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  İlk Senkronizasyonu Başlat
                </Button>
              )}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Firma</TableHead>
                    <TableHead>SGK No</TableHead>
                    <TableHead>Çalışan</TableHead>
                    <TableHead>Tehlike</TableHead>
                    <TableHead>Süre</TableHead>
                    <TableHead>Uyum</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Sözleşme</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((company) => {
                    const daysUntilExpiry = calculateDaysUntilExpiry(company.contract_end);

                    return (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">
                          {company.company_name}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {company.sgk_no}
                        </TableCell>
                        <TableCell>{company.employee_count}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{company.hazard_class}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>
                              {company.assigned_minutes} / {company.required_minutes} dk
                            </div>
                            <Progress
                              value={
                                company.required_minutes > 0
                                  ? (company.assigned_minutes / company.required_minutes) *
                                    100
                                  : 0
                              }
                              className="h-1 mt-1"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${getComplianceColor(
                              company.compliance_status
                            )} text-white`}
                          >
                            {getComplianceLabel(company.compliance_status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold">
                              {company.risk_score}
                            </div>
                            <TrendingUp
                              className={`h-4 w-4 ${
                                company.risk_score >= 70
                                  ? "text-red-500"
                                  : company.risk_score >= 40
                                  ? "text-orange-500"
                                  : "text-green-500"
                              }`}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          {company.contract_end ? (
                            <div className="text-sm">
                              <div>
                                {new Date(company.contract_end).toLocaleDateString("tr-TR")}
                              </div>
                              {daysUntilExpiry !== null && (
                                <div
                                  className={`text-xs ${
                                    daysUntilExpiry < 0
                                      ? "text-red-600 font-semibold"
                                      : daysUntilExpiry <= 30
                                      ? "text-orange-600"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {daysUntilExpiry < 0
                                    ? `${Math.abs(daysUntilExpiry)} gün geçti`
                                    : `${daysUntilExpiry} gün kaldı`}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
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
    </div>
  );
}