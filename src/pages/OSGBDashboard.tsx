import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BadgeAlert,
  Briefcase,
  Building2,
  CalendarClock,
  Clock3,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  Siren,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  getOsgbDashboardData,
  type OsgbAlertRecord,
  type OsgbCompanyRecord,
  type OsgbDashboardData,
  type OsgbExpertLoad,
  type OsgbFlagRecord,
} from "@/lib/osgbData";

const CACHE_TTL_MS = 5 * 60 * 1000;

const getCacheKey = (userId: string) => `osgb:dashboard:${userId}`;

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("tr-TR");
};

const getDaysUntil = (value: string | null) => {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  return Math.floor((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
};

const normalizeSeverityClass = (severity: string) => {
  const value = severity.toUpperCase();
  if (value === "CRITICAL") return "bg-red-500/15 text-red-200 border-red-400/20";
  if (value === "HIGH") return "bg-orange-500/15 text-orange-200 border-orange-400/20";
  return "bg-yellow-500/15 text-yellow-200 border-yellow-400/20";
};

const complianceBadge = (status: string) => {
  const value = status.toUpperCase();
  if (value === "CRITICAL") return { label: "Kritik", className: "bg-red-500/15 text-red-200 border-red-400/20" };
  if (value === "WARNING") return { label: "İzlenmeli", className: "bg-yellow-500/15 text-yellow-200 border-yellow-400/20" };
  if (value === "COMPLIANT") return { label: "Uyumlu", className: "bg-emerald-500/15 text-emerald-200 border-emerald-400/20" };
  return { label: "Bilinmiyor", className: "bg-slate-500/15 text-slate-200 border-slate-400/20" };
};

const summaryCards = (summary: OsgbDashboardData["summary"]) => [
  {
    title: "Toplam firma",
    value: summary.totalCompanies.toString(),
    description: `${summary.totalEmployees.toLocaleString("tr-TR")} çalışan kapsanıyor`,
    icon: Building2,
  },
  {
    title: "Uyum kapsamı",
    value: `%${summary.coverageRate}`,
    description: `${summary.criticalCompanies} kritik firma`,
    icon: ShieldCheck,
  },
  {
    title: "Açık uygunsuzluk",
    value: summary.openFlags.toString(),
    description: `${summary.openAlerts} öngörüsel uyarı`,
    icon: ShieldAlert,
  },
  {
    title: "Sözleşme baskısı",
    value: summary.expiringContracts.toString(),
    description: `${summary.expiredContracts} süresi dolmuş kayıt`,
    icon: CalendarClock,
  },
];

function CompanyRiskList({ companies }: { companies: OsgbCompanyRecord[] }) {
  const navigate = useNavigate();
  const topCompanies = useMemo(() => companies.slice(0, 6), [companies]);

  return (
    <Card className="border-slate-800 bg-slate-900/70">
      <CardHeader>
        <CardTitle className="text-white">Riskli firma görünümü</CardTitle>
        <CardDescription>Risk skoru, sözleşme baskısı ve dakika uyumuna göre önceliklendirilmiş liste.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {topCompanies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-6 text-sm text-slate-400">
            Portföy verisi bulunamadı.
          </div>
        ) : (
          topCompanies.map((company) => {
            const badge = complianceBadge(company.complianceStatus);
            const daysLeft = getDaysUntil(company.contractEnd);
            const coverage = company.requiredMinutes > 0 ? Math.min(100, Math.round((company.assignedMinutes / company.requiredMinutes) * 100)) : 0;

            return (
              <div key={company.id} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold text-white">{company.companyName}</div>
                      <Badge className={cn("border", badge.className)}>{badge.label}</Badge>
                      <Badge variant="outline">{company.hazardClass}</Badge>
                      <Badge variant="secondary">Risk {company.riskScore}</Badge>
                    </div>
                    <div className="grid gap-2 text-sm text-slate-400 sm:grid-cols-2 xl:grid-cols-4">
                      <div>Çalışan: <span className="text-slate-200">{company.employeeCount}</span></div>
                      <div>Uzman: <span className="text-slate-200">{company.assignedPersonName || "Atanmamış"}</span></div>
                      <div>Gerekli süre: <span className="text-slate-200">{company.requiredMinutes} dk</span></div>
                      <div>Atanan süre: <span className="text-slate-200">{company.assignedMinutes} dk</span></div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Süre uyumu</span>
                        <span>%{coverage}</span>
                      </div>
                      <Progress value={coverage} className="h-2 bg-slate-800" />
                    </div>
                  </div>
                  <div className="flex min-w-[220px] flex-col items-start gap-2 lg:items-end">
                    <div className="text-sm text-slate-400">
                      Sözleşme bitişi: <span className="text-slate-200">{formatDate(company.contractEnd)}</span>
                    </div>
                    <div className="text-sm text-slate-400">
                      {daysLeft === null
                        ? "Tarih bulunamadı"
                        : daysLeft < 0
                          ? `${Math.abs(daysLeft)} gün önce doldu`
                          : `${daysLeft} gün kaldı`}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/isg-bot?tab=dashboard`)}>
                      Bot görünümüne git
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function ExpertLoadTable({ loads }: { loads: OsgbExpertLoad[] }) {
  return (
    <Card className="border-slate-800 bg-slate-900/70">
      <CardHeader>
        <CardTitle className="text-white">Uzman yoğunluğu</CardTitle>
        <CardDescription>Firma dağılımı, çalışan hacmi ve dakika yeterliliği aynı tabloda izlenir.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead>Uzman</TableHead>
              <TableHead>Firma</TableHead>
              <TableHead>Çalışan</TableHead>
              <TableHead>Atanan</TableHead>
              <TableHead>Gerekli</TableHead>
              <TableHead>Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-400">
                  Uzman yük verisi bulunamadı.
                </TableCell>
              </TableRow>
            ) : (
              loads.map((load) => (
                <TableRow key={load.expertName} className="border-slate-800">
                  <TableCell className="font-medium text-white">{load.expertName}</TableCell>
                  <TableCell>{load.companyCount}</TableCell>
                  <TableCell>{load.totalEmployees}</TableCell>
                  <TableCell>{load.totalAssignedMinutes} dk</TableCell>
                  <TableCell>{load.totalRequiredMinutes} dk</TableCell>
                  <TableCell>
                    <Badge className={cn("border", load.overloaded ? "bg-red-500/15 text-red-200 border-red-400/20" : "bg-emerald-500/15 text-emerald-200 border-emerald-400/20")}>
                      {load.overloaded ? "Eksik kapasite" : "Uygun"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function AlertPanels({ flags, alerts }: { flags: OsgbFlagRecord[]; alerts: OsgbAlertRecord[] }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="border-slate-800 bg-slate-900/70">
        <CardHeader>
          <CardTitle className="text-white">Açık uygunsuzluklar</CardTitle>
          <CardDescription>İSG-KATİP uyum bayraklarından gelen açık kayıtlar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {flags.slice(0, 6).map((flag) => (
            <div key={flag.id} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Badge className={cn("border", normalizeSeverityClass(flag.severity))}>{flag.severity}</Badge>
                <span className="text-sm font-medium text-white">{flag.ruleName}</span>
              </div>
              <p className="text-sm leading-6 text-slate-400">{flag.message}</p>
            </div>
          ))}
          {flags.length === 0 ? <div className="text-sm text-slate-400">Açık uygunsuzluk bulunamadı.</div> : null}
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/70">
        <CardHeader>
          <CardTitle className="text-white">Öngörüsel uyarılar</CardTitle>
          <CardDescription>Yaklaşan risk ve sözleşme baskılarını işaretleyen aktif uyarılar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {alerts.slice(0, 6).map((alert) => (
            <div key={alert.id} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Badge className={cn("border", normalizeSeverityClass(alert.severity))}>{alert.severity}</Badge>
                <span className="text-sm font-medium text-white">{alert.alertType}</span>
              </div>
              <p className="text-sm leading-6 text-slate-400">{alert.message}</p>
              <div className="mt-2 text-xs text-slate-500">Öngörü tarihi: {formatDate(alert.predictedDate)}</div>
            </div>
          ))}
          {alerts.length === 0 ? <div className="text-sm text-slate-400">Aktif uyarı bulunamadı.</div> : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default function OSGBDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<OsgbDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async (forceRefresh = false) => {
    if (!user?.id) return;

    const cacheKey = getCacheKey(user.id);
    const cachedRaw = sessionStorage.getItem(cacheKey);

    if (!forceRefresh && cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw) as { timestamp: number; data: OsgbDashboardData };
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
          setData(cached.data);
          setLoading(false);
        }
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }

    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else if (!data) {
        setLoading(true);
      }

      const result = await getOsgbDashboardData(user.id);
      setData(result);
      setError(null);
      sessionStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: result }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "OSGB dashboard verisi yüklenemedi.";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadDashboard(false);
  }, [user?.id]);

  const cards = useMemo(() => (data ? summaryCards(data.summary) : []), [data]);

  if (loading && !data) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <div className="space-y-2">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-800" />
          <div className="h-4 w-96 animate-pulse rounded-lg bg-slate-900" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/70" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="h-[380px] animate-pulse rounded-2xl border border-slate-800 bg-slate-900/70" />
          <div className="h-[380px] animate-pulse rounded-2xl border border-slate-800 bg-slate-900/70" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-200">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">OSGB Dashboard</h1>
              <p className="text-sm text-slate-400">
                İSG-KATİP verisi ile çalışan portföy, kapasite ve uyum görünümü.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate("/osgb")}>Modül Tanıtımı</Button>
          <Button onClick={() => void loadDashboard(true)} disabled={refreshing}>
            <RefreshCcw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
            Yenile
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="border-red-500/20 bg-red-500/10 text-red-100">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Dashboard yüklenemedi</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.title} className="border-slate-800 bg-slate-900/70">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardDescription>{card.title}</CardDescription>
                        <CardTitle className="mt-2 text-3xl text-white">{card.value}</CardTitle>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-200">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-400">{card.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <CompanyRiskList companies={data.companies} />

            <Card className="border-slate-800 bg-slate-900/70">
              <CardHeader>
                <CardTitle className="text-white">Portföy radar</CardTitle>
                <CardDescription>Kritik alanlar için yönetim düzeyi hızlı özet.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="mb-2 flex items-center gap-2 text-white">
                    <BadgeAlert className="h-4 w-4 text-red-300" />
                    En kritik konu
                  </div>
                  <p className="text-sm leading-6 text-slate-400">
                    {data.summary.criticalCompanies > 0
                      ? `${data.summary.criticalCompanies} firma kritik seviyede. Açık uygunsuzluklar ve süre uyumsuzluğu öncelikli.`
                      : "Kritik firma görünmüyor. Uyarı ve sözleşme baskısını izlemeye devam edin."}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="mb-2 flex items-center gap-2 text-white">
                    <Clock3 className="h-4 w-4 text-amber-300" />
                    Sözleşme baskısı
                  </div>
                  <p className="text-sm leading-6 text-slate-400">
                    {data.summary.expiringContracts > 0 || data.summary.expiredContracts > 0
                      ? `${data.summary.expiringContracts} sözleşme 30 gün içinde sona eriyor, ${data.summary.expiredContracts} kayıt ise süresi dolmuş durumda.`
                      : "Yakın dönemde sözleşme baskısı görünmüyor."}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="mb-2 flex items-center gap-2 text-white">
                    <Siren className="h-4 w-4 text-cyan-300" />
                    Operasyon önerisi
                  </div>
                  <p className="text-sm leading-6 text-slate-400">
                    Önce kritik firmalarda asgari süre uyumunu kapatın, sonra açık kurul ve sözleşme kayıtlarını temizleyin.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <ExpertLoadTable loads={data.expertLoads} />
          <AlertPanels flags={data.flags} alerts={data.alerts} />
        </>
      ) : null}
    </div>
  );
}
