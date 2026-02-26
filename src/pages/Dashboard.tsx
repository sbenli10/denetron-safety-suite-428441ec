import { useState, useEffect } from "react";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  Legend,
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

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  // ✅ Dashboard verileri çek
  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1️⃣ Organization ID'sini al
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.organization_id) {
        throw new Error("Kuruluş bilgisi bulunamadı");
      }

      setOrgId(profile.organization_id);

      // 2️⃣ Denetim verilerini çek
      const { data: inspections, error: inspError } = await supabase
        .from("inspections")
        .select("*")
        .eq("org_id", profile.organization_id);

      if (inspError) throw inspError;

      const inspectionList = (inspections || []) as Inspection[];

      // 3️⃣ Açık bulguları çek
      const { data: findings, error: findError } = await supabase
        .from("findings")
        .select("*");

      if (findError) throw findError;

      const findingsList = (findings || []) as Finding[];

      // 📊 METRIK HESAPLAMALARI
      calculateMetrics(inspectionList, findingsList);

      // 📈 GRAFİK VERİLERİ
      calculateRiskDistribution(inspectionList);
      calculateMonthlyTrend(inspectionList);

      // 📋 SON FAALİYETLER
      const recent = inspectionList
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        )
        .slice(0, 5);

      setRecentInspections(recent);

      toast.success("Dashboard güncellendi");
    } catch (error: any) {
      toast.error("Veriler yüklenirken hata: " + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Metrikleri hesapla
  const calculateMetrics = (
    inspections: Inspection[],
    findings: Finding[]
  ) => {
    // Aktif denetimler
    const active = inspections.filter(
      (i) => i.status === "in_progress"
    ).length;
    setActiveInspections(active);

    // Açık DÖF
    const open = findings.filter((f) => !f.is_resolved).length;
    setOpenFindings(open);

    // Kritik risk oranı
    const critical = inspections.filter(
      (i) => i.risk_level === "critical"
    ).length;
    const criticalPercent =
      inspections.length > 0
        ? Math.round((critical / inspections.length) * 100)
        : 0;
    setCriticalRiskPercent(criticalPercent);

    // Geciken faaliyetler
    const today = new Date();
    const overdue = findings.filter(
      (f) =>
        !f.is_resolved &&
        new Date(f.due_date) < today
    ).length;
    setOverdueActions(overdue);
  };

  // ✅ Risk dağılımı
  const calculateRiskDistribution = (inspections: Inspection[]) => {
    const dist = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    inspections.forEach((i) => {
      dist[i.risk_level]++;
    });

    const colors = {
      low: "#10b981",
      medium: "#f59e0b",
      high: "#f97316",
      critical: "#ef4444",
    };

    const data = [
      { name: "Düşük", value: dist.low, color: colors.low },
      { name: "Orta", value: dist.medium, color: colors.medium },
      { name: "Yüksek", value: dist.high, color: colors.high },
      { name: "Kritik", value: dist.critical, color: colors.critical },
    ].filter((d) => d.value > 0);

    setRiskDistribution(data);
  };

  // ✅ Aylık trend
  const calculateMonthlyTrend = (inspections: Inspection[]) => {
    const today = new Date();
    const months: { [key: string]: number } = {};

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
      const date = new Date(i.created_at);
      const monthKey = date.toLocaleString("tr-TR", {
        month: "short",
        year: "2-digit",
      });
      if (months[monthKey] !== undefined) {
        months[monthKey]++;
      }
    });

    const data = Object.entries(months).map(([month, count]) => ({
      month,
      denetimler: count,
    }));

    setMonthlyTrend(data);
  };

  // 🎨 Risk Level Renkleri
  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case "low":
        return "bg-success/10 text-success border-success/30";
      case "medium":
        return "bg-warning/10 text-warning border-warning/30";
      case "high":
        return "bg-orange-500/10 text-orange-500 border-orange-500/30";
      case "critical":
        return "bg-destructive/10 text-destructive border-destructive/30";
    }
  };

  const getRiskLabel = (level: RiskLevel) => {
    const labels: Record<RiskLevel, string> = {
      low: "Düşük",
      medium: "Orta",
      high: "Yüksek",
      critical: "Kritik",
    };
    return labels[level];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">
            Dashboard yükleniyor...
          </p>
        </div>
      </div>
    );
  }

  const metrics: MetricCard[] = [
    {
      title: "Aktif Denetim",
      value: activeInspections,
      change: "+2 bu hafta",
      icon: <Activity className="h-5 w-5" />,
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Açık DÖF",
      value: openFindings,
      change: `-1 geçen haftaya göre`,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: "from-orange-500 to-orange-600",
    },
    {
      title: "Kritik Risk %",
      value: criticalRiskPercent,
      change: `${criticalRiskPercent > 20 ? "📈 Artış" : "📉 Azalış"}`,
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
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          İSG Yönetim Paneli
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerçek zamanlı denetim ve risk analizi
        </p>
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
                  metric.change.includes("📈")
                    ? "text-orange-500"
                    : metric.change.includes("⚠️")
                    ? "text-destructive"
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
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
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
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Veri yok
            </div>
          )}
        </div>

        {/* Aylık Trend */}
        <div className="glass-card p-6 border border-primary/20">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Aylık Denetim Trendi
          </h3>
          {monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="colorDenetim" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="denetimler"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorDenetim)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Veri yok
            </div>
          )}
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
                className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-border/50 hover:border-primary/30 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {inspection.location_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(inspection.created_at).toLocaleDateString(
                      "tr-TR"
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${getRiskColor(
                      inspection.risk_level
                    )}`}
                  >
                    {getRiskLabel(inspection.risk_level)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      inspection.status === "in_progress"
                        ? "bg-blue-500/10 text-blue-500"
                        : inspection.status === "completed"
                        ? "bg-success/10 text-success"
                        : "bg-secondary"
                    }`}
                  >
                    {inspection.status === "in_progress"
                      ? "Devam"
                      : inspection.status === "completed"
                      ? "Tamamlandı"
                      : "Taslak"}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Henüz denetim bulunmuyor</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}