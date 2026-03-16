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
  value: number;
  change: string;
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
      title: "Aktif Denetim",
      value: activeInspections,
      change: activeInspections > 0 ? "+2 bu hafta" : "Henüz yok",
      icon: <Activity className="h-5 w-5" />,
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Açık DÖF",
      value: openFindings,
      change: openFindings > 0 ? "-1 geçen haftaya göre" : "Yok",
      icon: <AlertTriangle className="h-5 w-5" />,
      color: "from-orange-500 to-orange-600",
    },
    {
      title: "Kritik Risk %",
      value: criticalRiskPercent,
      change:
        criticalRiskPercent > 20
          ? "Yüksek"
          : criticalRiskPercent > 0
            ? "Normal"
            : "Yok",
      icon: <AlertCircle className="h-5 w-5" />,
      color: "from-red-500 to-red-600",
    },
    {
      title: "Geciken İşlemler",
      value: overdueActions,
      change: overdueActions > 0 ? "Aksiyon gerekli" : "Yok",
      icon: <Clock className="h-5 w-5" />,
      color: "from-purple-500 to-purple-600",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">İSG Yönetim Paneli</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerçek zamanlı denetim ve risk analizi
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Yenile
        </Button>
      </div>

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
              className="glass-card space-y-3 border border-primary/20 p-5 transition-all hover:border-primary/40"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {metric.title}
                </h3>
                <div className={`rounded-lg bg-gradient-to-br p-2.5 text-white ${metric.color}`}>
                  {metric.icon}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-foreground">{metric.value}</p>
                <p className="text-xs font-medium text-muted-foreground">{metric.change}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass-card border border-primary/20 p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <PieChartIcon className="h-4 w-4 text-primary" />
            Risk Dağılımı Analizi
          </h3>
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

        <div className="glass-card border border-primary/20 p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <BarChart3 className="h-4 w-4 text-primary" />
            Aylık Denetim Trendi (Son 6 Ay)
          </h3>
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

        <div>
          <NotificationWidget />
        </div>
      </div>

      <div className="glass-card border border-primary/20 p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Activity className="h-4 w-4 text-primary" />
          Son Denetimler
        </h3>
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
                className="flex cursor-pointer items-center justify-between rounded-lg border border-border/50 bg-secondary/50 p-4 transition-all hover:border-primary/30"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {inspection.location_name || "İsimsiz Lokasyon"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
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
  );
}
