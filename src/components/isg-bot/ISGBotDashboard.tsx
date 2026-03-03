// ====================================================
// İSG BOT DASHBOARD - REACT COMPONENT
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
  critical_flags_count: number;
  warning_flags_count: number;
  contract_status: string;
  days_until_expiry: number | null;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [complianceFilter, setComplianceFilter] = useState<string>("all");
  const [hazardFilter, setHazardFilter] = useState<string>("all");

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      // Get current org_id (from user context)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Call compliance-check edge function
      const { data, error } = await supabase.functions.invoke("compliance-check", {
        body: {
          action: "GET_DASHBOARD",
          data: {
            orgId: user.id, // or get from user metadata
          },
        },
      });

      if (error) throw error;

      setCompanies(data.companies);
      setStats(data.stats);

      toast.success("Dashboard yüklendi");
    } catch (error: any) {
      console.error("❌ Dashboard load error:", error);
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
      // Trigger sync via extension
      // Or call edge function directly
      await loadDashboard();
    } catch (error: any) {
      toast.error("Senkronizasyon hatası");
    }
  };

  const handleRunComplianceCheck = async () => {
    toast.info("Compliance kontrol ediliyor...");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("compliance-check", {
        body: {
          action: "CHECK_ALL",
          data: {
            orgId: user.id,
          },
        },
      });

      if (error) throw error;

      toast.success(`${data.checkedCount} firma kontrol edildi`);
      await loadDashboard();
    } catch (error: any) {
      toast.error("Compliance kontrol hatası");
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
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
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
            Senkronize Et
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
                value={(stats.compliant / stats.totalCompanies) * 100}
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
          <CardDescription>
            İSG-KATİP'ten senkronize edilen firmalar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCompanies.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Filtre kriterlerine uygun firma bulunamadı</p>
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
                  {filteredCompanies.map((company) => (
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
                              (company.assigned_minutes / company.required_minutes) *
                              100
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
                              {new Date(company.contract_end).toLocaleDateString(
                                "tr-TR"
                              )}
                            </div>
                            {company.days_until_expiry !== null && (
                              <div
                                className={`text-xs ${
                                  company.days_until_expiry < 0
                                    ? "text-red-600 font-semibold"
                                    : company.days_until_expiry <= 30
                                    ? "text-orange-600"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {company.days_until_expiry < 0
                                  ? `${Math.abs(company.days_until_expiry)} gün geçti`
                                  : `${company.days_until_expiry} gün kaldı`}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}