import { useState, useEffect,useCallback,useRef } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Loader2,
  AlertCircle,
  BarChart3,
  PieChart as PieChartIcon,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
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

type RiskLevel = "low" | "medium" | "high" | "critical";
type InspectionStatus = "completed" | "draft" | "in_progress" | "cancelled";

interface Inspection {
  id: string;
  location_name: string;
  risk_level: RiskLevel;
  status: InspectionStatus;
  created_at: string;
  org_id: string;
}

interface Finding {
  id: string;
  description: string;
  due_date: string;
  is_resolved: boolean;
  inspection_id: string;
}

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
  const [orgId, setOrgId] = useState<string | null>(null);

  // Metrikler
  const [activeInspections, setActiveInspections] = useState(0);
  const [openFindings, setOpenFindings] = useState(0);
  const [criticalRiskPercent, setCriticalRiskPercent] = useState(0);
  const [overdueActions, setOverdueActions] = useState(0);

  // Grafikler
  const [riskDistribution, setRiskDistribution] = useState<
    Array<{ name: string; value: number; color: string }>
  >([]);
  const [monthlyTrend, setMonthlyTrend] = useState<
    Array<{ month: string; denetimler: number }>
  >([]);

  // Son faaliyetler
  const [recentInspections, setRecentInspections] = useState<Inspection[]>([]);
  
   // ✅ Duplicate fetch guards
  const hasFetched = useRef(false);
  const isFetching = useRef(false);

  
  // ✅ Initial load
  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (!user) {
      console.warn("⚠️ User not authenticated, skipping fetch");
      return;
  }

  // ✅ Duplicate fetch guard
  if (isFetching.current) {
    console.warn("⚠️ Fetch already in progress, skipping");
    return;
  }

  isFetching.current = true;

  if (isRefresh) {
    setRefreshing(true);
  } else {
    setLoading(true);
  }

  try {
    console.log("📊 Fetching dashboard data for user:", user.id);

    // 1️⃣ Organization ID'sini al
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("❌ Profile fetch error:", profileError);
      throw new Error("Profil bilgisi alınamadı: " + profileError.message);
    }

    if (!profile?.organization_id) {
      console.error("❌ No organization_id in profile");
      throw new Error("Kuruluş bilgisi bulunamadı. Lütfen sistem yöneticisi ile iletişime geçin.");
    }

    console.log("✅ Organization ID:", profile.organization_id);
    setOrgId(profile.organization_id);

    // 2️⃣ Denetim verilerini çek
    const { data: inspections, error: inspError } = await supabase
      .from("inspections")
      .select("*")
      .eq("org_id", profile.organization_id)
      .order("created_at", { ascending: false });

    if (inspError) {
      console.error("❌ Inspections fetch error:", inspError);
      throw new Error("Denetim verileri alınamadı: " + inspError.message);
    }

    const inspectionList = (inspections || []) as Inspection[];
    console.log(`✅ Fetched ${inspectionList.length} inspections`);

    // 3️⃣ Açık bulguları çek (✅ Organization filter ile)
    let findingsList: Finding[] = [];

    if (inspectionList.length > 0) {
      const inspectionIds = inspectionList.map((i) => i.id);

      console.log(`🔍 Fetching findings for ${inspectionIds.length} inspections...`);

      const { data: findings, error: findError } = await supabase
        .from("findings")
        .select("*")
        .in("inspection_id", inspectionIds); // ✅ Sadece bu org'un inspectionları

      if (findError) {
        console.error("⚠️ Findings fetch error:", findError);
        console.warn("⚠️ Continuing without findings data (non-critical)");
        // Non-critical error, continue with empty findings
      } else {
        findingsList = (findings || []) as Finding[];
        console.log(`✅ Fetched ${findingsList.length} findings`);
      }
    } else {
      console.log("ℹ️ No inspections found, skipping findings fetch");
    }

    // 📊 METRIK HESAPLAMALARI
    console.log("📊 Calculating metrics...");
    calculateMetrics(inspectionList, findingsList);

    // 📈 GRAFİK VERİLERİ
    console.log("📈 Generating charts...");
    calculateRiskDistribution(inspectionList);
    calculateMonthlyTrend(inspectionList);

    // 📋 SON FAALİYETLER
    const recent = inspectionList.slice(0, 5);
    setRecentInspections(recent);

    console.log("✅ Dashboard data loaded successfully");
    
    if (isRefresh) {
      toast.success("Dashboard güncellendi", {
        description: `${inspectionList.length} denetim, ${findingsList.length} bulgu`
      });
    }

  } catch (error: any) {
    console.error("💥 Dashboard fetch error:", error);
    console.error("📄 Error details:", {
      name: error.name,
      message: error.message,
      code: error.code
    });
    
    let errorMessage = "Dashboard yüklenemedi";
    let errorDescription = error.message || "Bilinmeyen hata";

    // ✅ User-friendly error messages
    if (error.message?.includes("Profil bilgisi")) {
      errorMessage = "Profil Hatası";
      errorDescription = "Kullanıcı profili bulunamadı";
    } else if (error.message?.includes("Kuruluş bilgisi")) {
      errorMessage = "Kuruluş Hatası";
      errorDescription = "Lütfen sistem yöneticisi ile iletişime geçin";
    } else if (error.message?.includes("Denetim verileri")) {
      errorMessage = "Veri Hatası";
      errorDescription = "Denetim verileri yüklenemedi";
    } else if (error.code === "PGRST116") {
      errorMessage = "Yetki Hatası";
      errorDescription = "Bu verilere erişim yetkiniz yok";
    } else if (error.message?.includes("network") || error.message?.includes("fetch")) {
      errorMessage = "Bağlantı Hatası";
      errorDescription = "İnternet bağlantınızı kontrol edin";
    }

    toast.error(errorMessage, {
      description: errorDescription,
      duration: 8000,
      action: {
        label: "Tekrar Dene",
        onClick: () => {
          hasFetched.current = false;
          fetchDashboardData(true);
        }
      }
    });
  } finally {
    setLoading(false);
    setRefreshing(false);
    isFetching.current = false; // ✅ Guard reset
  }
}, [user]); // ✅ Sadece user değiştiğinde yeniden oluştur

  // ✅ Refresh handler
  const handleRefresh = () => {
    hasFetched.current = false; // Reset flag
    fetchDashboardData(true);
  };
  // ✅ Metrikleri hesapla
  const calculateMetrics = (
    inspections: Inspection[],
    findings: Finding[]
  ) => {
    console.log("📊 Calculating metrics...");

    // Aktif denetimler
    const active = inspections.filter((i) => i.status === "in_progress").length;
    setActiveInspections(active);

    // Açık DÖF
    const open = findings.filter((f) => !f.is_resolved).length;
    setOpenFindings(open);

    // Kritik risk oranı
    const critical = inspections.filter((i) => i.risk_level === "critical").length;
    const criticalPercent =
      inspections.length > 0
        ? Math.round((critical / inspections.length) * 100)
        : 0;
    setCriticalRiskPercent(criticalPercent);

    // Geciken faaliyetler
    const today = new Date();
    const overdue = findings.filter(
      (f) => !f.is_resolved && f.due_date && new Date(f.due_date) < today
    ).length;
    setOverdueActions(overdue);

    console.log("✅ Metrics calculated:", {
      active,
      open,
      criticalPercent,
      overdue,
    });
  };

  // ✅ Risk dağılımı
  const calculateRiskDistribution = (inspections: Inspection[]) => {
    const dist: Record<RiskLevel, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    inspections.forEach((i) => {
      if (i.risk_level in dist) {
        dist[i.risk_level]++;
      }
    });

    const colors: Record<RiskLevel, string> = {
      low: "#10b981",
      medium: "#f59e0b",
      high: "#f97316",
      critical: "#ef4444",
    };

    const labels: Record<RiskLevel, string> = {
      low: "Düşük",
      medium: "Orta",
      high: "Yüksek",
      critical: "Kritik",
    };

    const data = (Object.keys(dist) as RiskLevel[])
      .map((level) => ({
        name: labels[level],
        value: dist[level],
        color: colors[level],
      }))
      .filter((d) => d.value > 0);

    setRiskDistribution(data);
    console.log("✅ Risk distribution calculated:", data);
  };

  // ✅ Aylık trend
  const calculateMonthlyTrend = (inspections: Inspection[]) => {
    const today = new Date();
    const months: Record<string, number> = {};

    // Son 6 ay
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleString("tr-TR", {
        month: "short",
        year: "2-digit",
      });
      months[monthKey] = 0;
    }

    // Denetimleri say
    inspections.forEach((i) => {
      try {
        const date = new Date(i.created_at);
        const monthKey = date.toLocaleString("tr-TR", {
          month: "short",
          year: "2-digit",
        });
        if (monthKey in months) {
          months[monthKey]++;
        }
      } catch (error) {
        console.warn("Date parse error for inspection:", i.id);
      }
    });

    const data = Object.entries(months).map(([month, count]) => ({
      month,
      denetimler: count,
    }));

    setMonthlyTrend(data);
    console.log("✅ Monthly trend calculated:", data);
  };

  // 🎨 Risk Level Helpers
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

  // 🔄 Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <div>
            <p className="text-lg font-semibold text-foreground">
              Dashboard yükleniyor...
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Veriler hazırlanıyor
            </p>
          </div>
        </div>
      </div>
    );
  }

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
      change: openFindings > 0 ? `-1 geçen haftaya göre` : "✅ Yok",
      icon: <AlertTriangle className="h-5 w-5" />,
      color: "from-orange-500 to-orange-600",
    },
    {
      title: "Kritik Risk %",
      value: criticalRiskPercent,
      change: `${criticalRiskPercent > 20 ? "📈 Yüksek" : criticalRiskPercent > 0 ? "📊 Normal" : "✅ Yok"}`,
      icon: <AlertCircle className="h-5 w-5" />,
      color: "from-red-500 to-red-600",
    },
    {
      title: "Geciken İşlemler",
      value: overdueActions,
      change: overdueActions > 0 ? "⚠️ Hemen tamamla!" : "✅ Yok",
      icon: <Clock className="h-5 w-5" />,
      color: "from-purple-500 to-purple-600",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            İSG Yönetim Paneli
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerçek zamanlı denetim ve risk analizi
            {orgId && (
              <span className="ml-2 text-xs opacity-60">
                • Org: {orgId.substring(0, 8)}...
              </span>
            )}
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

      {/* 📊 KPI Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => (
          <div
            key={idx}
            className="glass-card p-5 border border-primary/20 space-y-3 hover:border-primary/40 transition-all"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {metric.title}
              </h3>
              <div
                className={`p-2.5 rounded-lg bg-gradient-to-br ${metric.color} text-white`}
              >
                {metric.icon}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-foreground">
                {metric.value}
              </p>
              <p
                className={`text-xs font-medium ${
                  metric.change.includes("📈") || metric.change.includes("⚠️")
                    ? "text-orange-500"
                    : metric.change.includes("✅")
                    ? "text-success"
                    : "text-muted-foreground"
                }`}
              >
                {metric.change}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 📈 Grafikler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Dağılımı */}
        <div className="glass-card p-6 border border-primary/20">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-primary" />
            Risk Dağılımı Analizi
          </h3>
          {riskDistribution.length > 0 ? (
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
            <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
              <AlertCircle className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Henüz denetim verisi yok</p>
              <p className="text-xs mt-1">İlk denetiminizi oluşturun</p>
            </div>
          )}
        </div>

        {/* Aylık Trend */}
        <div className="glass-card p-6 border border-primary/20">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Aylık Denetim Trendi (Son 6 Ay)
          </h3>
          {monthlyTrend.some((m) => m.denetimler > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="colorDenetim" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="month" 
                  stroke="#9ca3af" 
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  stroke="#9ca3af" 
                  tick={{ fontSize: 11 }}
                  allowDecimals={false}
                />
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
            <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
              <TrendingUp className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Henüz trend verisi yok</p>
              <p className="text-xs mt-1">Denetimler eklendikçe grafik oluşacak</p>
            </div>
          )}
        </div>
        <div>
          <NotificationWidget /> {/* ✅ Widget */}
        </div>
      </div>

      {/* 📋 Son Faaliyetler */}
      <div className="glass-card p-6 border border-primary/20">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Son Denetimler
        </h3>
        <div className="space-y-3">
          {recentInspections.length > 0 ? (
            recentInspections.map((inspection) => (
              <div
                key={inspection.id}
                className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border/50 hover:border-primary/30 transition-all cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {inspection.location_name || "İsimsiz Lokasyon"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(inspection.created_at).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
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
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-30 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                Henüz denetim bulunmuyor
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                İlk denetiminizi oluşturmak için "Denetimler" sayfasını ziyaret edin
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}