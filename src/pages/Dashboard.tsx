import { useState, useEffect, useCallback, useRef } from "react";
import {
  Activity,
  AlertTriangle,
  Clock,
  TrendingUp,
  AlertCircle,
  BarChart3,
  PieChart as PieChartIcon,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import NotificationWidget from "@/components/NotificationWidget";
import { toast } from "sonner";
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  DASHBOARD_CACHE_TTL,
  fetchDashboardSnapshot,
  readDashboardSnapshot,
  writeDashboardSnapshot,
  type DashboardInspection,
  type DashboardInspectionStatus,
  type DashboardRiskLevel,
  type DashboardSnapshot,
} from "@/lib/dashboardCache";

type RiskLevel = DashboardRiskLevel;
type InspectionStatus = DashboardInspectionStatus;
type Inspection = DashboardInspection;

interface MetricCard {
  title: string;
  subtitle: string;
  value: number;
  insight: string;
  icon: React.ReactNode;
  color: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [, setOrgId] = useState<string | null>(null);

  const [activeInspections, setActiveInspections] = useState(0);
  const [openFindings, setOpenFindings] = useState(0);
  const [criticalRiskPercent, setCriticalRiskPercent] = useState(0);
  const [overdueActions, setOverdueActions] = useState(0);

  const [riskDistribution, setRiskDistribution] = useState<
    Array<{ name: string; value: number; color: string }>
  >([]);
  const [monthlyTrend, setMonthlyTrend] = useState<
    Array<{ month: string; denetimler: number }>
  >([]);
  const [recentInspections, setRecentInspections] = useState<Inspection[]>([]);

  const hasHydratedFromCache = useRef(false);
  const isFetching = useRef(false);

  const applySnapshot = useCallback((snapshot: DashboardSnapshot) => {
    setOrgId(snapshot.orgId);
    setActiveInspections(snapshot.activeInspections);
    setOpenFindings(snapshot.openFindings);
    setCriticalRiskPercent(snapshot.criticalRiskPercent);
    setOverdueActions(snapshot.overdueActions);
    setRiskDistribution(snapshot.riskDistribution);
    setMonthlyTrend(snapshot.monthlyTrend);
    setRecentInspections(snapshot.recentInspections);
  }, []);

  const fetchDashboardData = useCallback(
    async (isRefresh = false, force = false) => {
      if (!user || isFetching.current) {
        return;
      }

      if (!force && !isRefresh && hasHydratedFromCache.current) {
        return;
      }

      isFetching.current = true;

      if (isRefresh) {
        setRefreshing(true);
      } else if (!hasHydratedFromCache.current) {
        setLoading(true);
      }

      try {
        const snapshot = await fetchDashboardSnapshot(user.id);
        applySnapshot(snapshot);
        writeDashboardSnapshot(user.id, snapshot);
        hasHydratedFromCache.current = true;

        if (isRefresh) {
          toast.success("Dashboard güncellendi", {
            description: `${snapshot.openFindings} açık bulgu, ${snapshot.activeInspections} aktif denetim`,
          });
        }
      } catch (error: any) {
        console.error("Dashboard fetch error:", error);

        let errorMessage = "Dashboard yüklenemedi";
        let errorDescription = error?.message || "Bilinmeyen hata";

        if (error?.message?.includes("Profil bilgisi")) {
          errorMessage = "Profil hatası";
          errorDescription = "Kullanıcı profili bulunamadı";
        } else if (error?.message?.includes("Kuruluş bilgisi")) {
          errorMessage = "Kuruluş hatası";
          errorDescription = "Kuruluş bilgisi eksik";
        } else if (error?.message?.includes("Denetim verileri")) {
          errorMessage = "Veri hatası";
          errorDescription = "Denetim verileri alınamadı";
        }

        toast.error(errorMessage, {
          description: errorDescription,
          duration: 8000,
          action: {
            label: "Tekrar Dene",
            onClick: () => {
              hasHydratedFromCache.current = false;
              void fetchDashboardData(true, true);
            },
          },
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
        isFetching.current = false;
      }
    },
    [applySnapshot, user]
  );

  useEffect(() => {
    if (!user) {
      return;
    }

    const cachedSnapshot = readDashboardSnapshot(user.id);
    const isCacheFresh =
      cachedSnapshot && Date.now() - cachedSnapshot.timestamp < DASHBOARD_CACHE_TTL;

    if (cachedSnapshot) {
      applySnapshot(cachedSnapshot);
      hasHydratedFromCache.current = true;
      setLoading(false);
    }

    void fetchDashboardData(false, !isCacheFresh);
  }, [applySnapshot, fetchDashboardData, user]);

  const handleRefresh = () => {
    void fetchDashboardData(true, true);
  };

  const getRiskColor = (level: RiskLevel) => {
    const colors: Record<RiskLevel, string> = {
      low: "bg-success/10 text-success border-success/30",
      medium: "bg-warning/10 text-warning border-warning/30",
      high: "bg-orange-500/10 text-orange-500 border-orange-500/30",
      critical: "bg-destructive/10 text-destructive border-destructive/30",
    };
    return colors[level] || "bg-secondary";
  };

  const getRiskLabel = (level: RiskLevel) => {
    const labels: Record<RiskLevel, string> = {
      low: "Düşük",
      medium: "Orta",
      high: "Yüksek",
      critical: "Kritik",
    };
    return labels[level] || level;
  };

  const getStatusLabel = (status: InspectionStatus) => {
    const labels: Record<InspectionStatus, string> = {
      in_progress: "Devam Ediyor",
      completed: "Tamamlandı",
      draft: "Taslak",
      cancelled: "İptal",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: InspectionStatus) => {
    const colors: Record<InspectionStatus, string> = {
      in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/30",
      completed: "bg-success/10 text-success border-success/30",
      draft: "bg-secondary/50 text-muted-foreground border-border",
      cancelled: "bg-destructive/10 text-destructive border-destructive/30",
    };
    return colors[status] || "bg-secondary";
  };

  const metrics: MetricCard[] = [
    {
      title: "Aktif Denetim Hattı",
      subtitle: "Sahada devam eden iş akışı",
      value: activeInspections,
      insight: activeInspections > 0 ? "İş yükü aktif şekilde ilerliyor" : "Yeni denetim planlanmalı",
      icon: <Activity className="h-5 w-5" />,
      color: "from-cyan-500 via-sky-500 to-blue-600",
    },
    {
      title: "Açık DÖF Havuzu",
      subtitle: "Takip isteyen bulgular",
      value: openFindings,
      insight: openFindings > 0 ? "Kapanış odaklı takip gerekli" : "Açık bulgu baskısı görünmüyor",
      icon: <AlertTriangle className="h-5 w-5" />,
      color: "from-amber-500 via-orange-500 to-orange-600",
    },
    {
      title: "Kritik Risk Oranı",
      subtitle: "En yüksek öncelikli risk payı",
      value: criticalRiskPercent,
      insight:
        criticalRiskPercent > 20
          ? "Yönetim müdahalesi gerekiyor"
          : criticalRiskPercent > 0
            ? "Kontrol altında izlenmeli"
            : "Kritik yoğunluk görünmüyor",
      icon: <AlertCircle className="h-5 w-5" />,
      color: "from-rose-500 via-red-500 to-red-700",
    },
    {
      title: "Geciken İşlemler",
      subtitle: "Termin aşımı yaşayan aksiyonlar",
      value: overdueActions,
      insight: overdueActions > 0 ? "Hızlı kapanış gerekli" : "Takvim baskısı görünmüyor",
      icon: <Clock className="h-5 w-5" />,
      color: "from-fuchsia-500 via-violet-500 to-purple-600",
    },
  ];

  const operationalScore = Math.max(
    0,
    100 - Math.min(criticalRiskPercent * 2, 50) - Math.min(overdueActions * 4, 30) - Math.min(openFindings, 20),
  );

  const criticalRecentCount = recentInspections.filter((inspection) => inspection.risk_level === "critical").length;

  const priorityHeadline =
    overdueActions > 0
      ? `${overdueActions} geciken işlem bugün öncelik istiyor`
      : openFindings > 0
        ? `${openFindings} açık DÖF için kapanış takibi gerekli`
        : "Operasyon görünümü dengeli, yeni denetim planlamasına geçilebilir";

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[28px] border border-cyan-500/20 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_32%),radial-gradient(circle_at_80%_20%,_rgba(59,130,246,0.16),_transparent_28%),linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(10,15,28,0.94))] p-6 shadow-[0_20px_80px_rgba(2,6,23,0.45)] md:p-8">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.04)_45%,transparent_100%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-cyan-100">İSG Yönetim Paneli</Badge>
              <Badge variant="outline" className="border-white/10 bg-white/5 px-3 py-1 text-slate-200">
                Operasyon skoru: {operationalScore}/100
              </Badge>
            </div>

            <div className="space-y-3">
              <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-white md:text-5xl">
                Denetim, risk ve aksiyon yükünü tek bakışta yöneten kurumsal kontrol masası
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                Kritik yoğunluğu, saha hareketini ve kapanış baskısını aynı çerçevede gösterir. Panelin amacı sayı
                vermek değil, yöneticiye bugün neye odaklanması gerektiğini netleştirmektir.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Bugünün Önceliği</p>
                <p className="mt-3 text-sm font-medium leading-6 text-white">{priorityHeadline}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Kritik Sonuçlar</p>
                <p className="mt-3 text-3xl font-semibold text-white">{criticalRecentCount}</p>
                <p className="mt-1 text-sm text-slate-300">Son denetimlerde kritik risk etiketi alan kayıtlar</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Operasyon Yorumu</p>
                <p className="mt-3 text-sm font-medium leading-6 text-white">
                  {operationalScore >= 80
                    ? "Sistem dengeli görünüyor, standart takiple ilerlenebilir."
                    : operationalScore >= 60
                      ? "Panel kontrollü ama dikkat isteyen alanlar var."
                      : "Yük baskısı yüksek, kritik akışlar ayrıştırılmalı."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4">
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Canlı Durum</p>
                  <p className="mt-2 text-4xl font-semibold text-white">{operationalScore}</p>
                </div>
                <Button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  variant="outline"
                  size="sm"
                  className="gap-2 border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  Yenile
                </Button>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#3b82f6_45%,#8b5cf6_100%)]"
                  style={{ width: `${operationalScore}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-slate-300">
                Skor; kritik risk oranı, geciken işlemler ve açık DÖF yoğunluğuna göre dinamik hesaplanır.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/70">Saha Akışı</p>
                <p className="mt-2 text-2xl font-semibold text-white">{activeInspections}</p>
                <p className="mt-1 text-sm text-slate-300">Aktif yürüyen denetim</p>
              </div>
              <div className="rounded-2xl border border-amber-400/10 bg-amber-400/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-amber-200/70">Kapanış Baskısı</p>
                <p className="mt-2 text-2xl font-semibold text-white">{openFindings + overdueActions}</p>
                <p className="mt-1 text-sm text-slate-300">Açık bulgu + geciken işlem toplamı</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="glass-card space-y-3 border border-primary/10 p-5"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-24 animate-pulse rounded bg-slate-800" />
                <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-800" />
              </div>
              <div className="space-y-2">
                <div className="h-8 w-16 animate-pulse rounded bg-slate-800" />
                <div className="h-3 w-28 animate-pulse rounded bg-slate-900" />
              </div>
            </div>
          ))
        ) : (
          metrics.map((metric, idx) => (
            <div
              key={idx}
              className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(8,12,22,0.96))] p-5 transition-all hover:-translate-y-0.5 hover:border-cyan-400/20"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{metric.title}</p>
                  <p className="text-sm text-slate-300">{metric.subtitle}</p>
                </div>
                <div className={`rounded-2xl bg-gradient-to-br p-3 text-white shadow-lg ${metric.color}`}>
                  {metric.icon}
                </div>
              </div>
              <div className="mt-6 space-y-2">
                <p className="text-4xl font-semibold tracking-tight text-white">{metric.value}</p>
                <p className="text-sm text-slate-300">{metric.insight}</p>
              </div>
              <div className="mt-5 h-px bg-gradient-to-r from-white/0 via-white/10 to-white/0" />
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>Durum sinyali</span>
                <span>{metric.value > 0 ? "Canlı" : "Beklemede"}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(9,14,25,0.95))] p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <PieChartIcon className="h-4 w-4 text-cyan-300" />
                  Risk Dağılımı Analizi
                </h3>
                <p className="mt-1 text-sm text-slate-400">Portföydeki risk yoğunluğunu seviyelere göre özetler.</p>
              </div>
              <Badge variant="outline" className="border-white/10 bg-white/5 text-slate-200">
                {riskDistribution.reduce((sum, item) => sum + item.value, 0)} toplam kayıt
              </Badge>
            </div>
          {loading ? (
            <div className="h-[280px] animate-pulse rounded-xl bg-slate-900/70" />
          ) : riskDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] flex-col items-center justify-center text-muted-foreground">
              <AlertCircle className="mb-3 h-12 w-12 opacity-30" />
              <p className="text-sm">Henüz denetim verisi yok</p>
              <p className="mt-1 text-xs">İlk denetiminizi oluşturun</p>
            </div>
          )}
          </div>

          <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(9,14,25,0.95))] p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Activity className="h-4 w-4 text-cyan-300" />
                  Son Denetimler
                </h3>
                <p className="mt-1 text-sm text-slate-400">Sahadan yeni gelen kayıtların operasyonel özeti.</p>
              </div>
              <Badge variant="outline" className="border-white/10 bg-white/5 text-slate-200">
                {recentInspections.length} kayıt
              </Badge>
            </div>
            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-border/40 bg-secondary/30 p-4"
                  >
                    <div className="mb-2 h-4 w-52 animate-pulse rounded bg-slate-800" />
                    <div className="h-3 w-36 animate-pulse rounded bg-slate-900" />
                  </div>
                ))
              ) : recentInspections.length > 0 ? (
                recentInspections.map((inspection) => (
                  <div
                    key={inspection.id}
                    className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] p-4 transition-all hover:border-cyan-400/20 hover:bg-white/[0.05]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {inspection.location_name || "İsimsiz Lokasyon"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(inspection.created_at).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="ml-4 flex shrink-0 items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${getRiskColor(inspection.risk_level)}`}
                      >
                        {getRiskLabel(inspection.risk_level)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${getStatusColor(inspection.status)}`}
                      >
                        {getStatusLabel(inspection.status)}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center">
                  <AlertCircle className="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-30" />
                  <p className="text-sm font-medium text-foreground">Henüz denetim bulunmuyor</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    İlk denetiminizi oluşturmak için "Denetimler" sayfasını ziyaret edin
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(9,14,25,0.95))] p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <BarChart3 className="h-4 w-4 text-cyan-300" />
                  Aylık Denetim Trendi
                </h3>
                <p className="mt-1 text-sm text-slate-400">Son altı ayda saha aktivitesinin yönünü gösterir.</p>
              </div>
              <Badge variant="outline" className="border-white/10 bg-white/5 text-slate-200">
                6 aylık görünüm
              </Badge>
            </div>
          {loading ? (
            <div className="h-[280px] animate-pulse rounded-xl bg-slate-900/70" />
          ) : monthlyTrend.some((m) => m.denetimler > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="colorDenetim" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#f3f4f6" }}
                />
                <Area
                  type="monotone"
                  dataKey="denetimler"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorDenetim)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] flex-col items-center justify-center text-muted-foreground">
              <TrendingUp className="mb-3 h-12 w-12 opacity-30" />
              <p className="text-sm">Henüz trend verisi yok</p>
              <p className="mt-1 text-xs">Denetimler eklendikçe grafik oluşacak</p>
            </div>
          )}
          </div>

          <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(9,14,25,0.95))] p-6">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-white">Bildirim Merkezi</h3>
              <p className="mt-1 text-sm text-slate-400">Canlı uyarılar ve işlem çağrıları burada toplanır.</p>
            </div>
            <NotificationWidget />
          </div>
        </div>
      </div>
    </div>
  );
}
