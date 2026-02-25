import {
  ShieldAlert,
  ClipboardCheck,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { InspectionRow } from "@/components/InspectionRow";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

const riskTrendData = [
  { month: "Aug", high: 12, medium: 24, low: 45 },
  { month: "Sep", high: 10, medium: 28, low: 42 },
  { month: "Oct", high: 15, medium: 22, low: 50 },
  { month: "Nov", high: 8, medium: 30, low: 48 },
  { month: "Dec", high: 6, medium: 26, low: 55 },
  { month: "Jan", high: 4, medium: 20, low: 60 },
];

const riskDistribution = [
  { name: "Low", value: 60, color: "hsl(142, 76%, 36%)" },
  { name: "Medium", value: 25, color: "hsl(38, 92%, 50%)" },
  { name: "High", value: 12, color: "hsl(0, 84%, 60%)" },
  { name: "Critical", value: 3, color: "hsl(0, 84%, 45%)" },
];

const complianceData = [
  { month: "Aug", score: 82 },
  { month: "Sep", score: 85 },
  { month: "Oct", score: 79 },
  { month: "Nov", score: 88 },
  { month: "Dec", score: 91 },
  { month: "Jan", score: 94 },
];

const recentInspections = [
  { id: "INS-0421", site: "Warehouse Alpha — Zone B", inspector: "A. Yılmaz", date: "Feb 23, 2026", status: "completed" as const, riskLevel: "low" as const, score: 96 },
  { id: "INS-0420", site: "Construction Site Gamma", inspector: "M. Demir", date: "Feb 22, 2026", status: "in-progress" as const, riskLevel: "high" as const },
  { id: "INS-0419", site: "Chemical Plant — Section 4", inspector: "E. Kaya", date: "Feb 21, 2026", status: "overdue" as const, riskLevel: "critical" as const },
  { id: "INS-0418", site: "Office Complex — Floor 3", inspector: "S. Çelik", date: "Feb 20, 2026", status: "completed" as const, riskLevel: "low" as const, score: 92 },
  { id: "INS-0417", site: "Manufacturing Unit Delta", inspector: "K. Arslan", date: "Feb 19, 2026", status: "scheduled" as const, riskLevel: "medium" as const },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 border border-border">
        <p className="text-xs font-medium text-foreground mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs text-muted-foreground">
            <span style={{ color: entry.color }}>●</span> {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of safety metrics and recent activity</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Inspections"
          value={24}
          change="+3 this week"
          changeType="positive"
          icon={ClipboardCheck}
        />
        <MetricCard
          title="Open Hazards"
          value={7}
          change="-2 from last week"
          changeType="positive"
          icon={AlertTriangle}
          iconColor="bg-warning/15"
        />
        <MetricCard
          title="Risk Score"
          value="94%"
          change="+6% improvement"
          changeType="positive"
          icon={ShieldAlert}
          iconColor="bg-success/15"
        />
        <MetricCard
          title="Compliance Rate"
          value="97.2%"
          change="+1.4% from Q3"
          changeType="positive"
          icon={TrendingUp}
          iconColor="bg-info/15"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Trends */}
        <div className="glass-card p-5 lg:col-span-2 animate-fade-in">
          <h3 className="text-sm font-semibold text-foreground mb-4">Risk Trend Analysis</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={riskTrendData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 22%)" />
              <XAxis dataKey="month" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="low" name="Low" fill="hsl(142, 76%, 36%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="medium" name="Medium" fill="hsl(38, 92%, 50%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="high" name="High" fill="hsl(0, 84%, 60%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Distribution */}
        <div className="glass-card p-5 animate-fade-in">
          <h3 className="text-sm font-semibold text-foreground mb-4">Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={riskDistribution}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                dataKey="value"
                strokeWidth={0}
              >
                {riskDistribution.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {riskDistribution.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] text-muted-foreground">{item.name} ({item.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Compliance Trend + Recent Inspections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Trend */}
        <div className="glass-card p-5 animate-fade-in">
          <h3 className="text-sm font-semibold text-foreground mb-4">Compliance Score</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={complianceData}>
              <defs>
                <linearGradient id="complianceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 22%)" />
              <XAxis dataKey="month" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[70, 100]} tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="score" name="Score" stroke="hsl(217, 91%, 60%)" fill="url(#complianceGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Inspections */}
        <div className="glass-card p-5 lg:col-span-2 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Recent Inspections</h3>
            <a href="/inspections" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
          <div className="space-y-1">
            {recentInspections.map((inspection) => (
              <InspectionRow key={inspection.id} {...inspection} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
