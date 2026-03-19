import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, BarChart3, LineChart as LineChartIcon } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getOsgbOperationalSummary, type OsgbOperationalSummary } from "@/lib/osgbOperations";

type ViewMode = "finance" | "documents";

export default function OSGBAnalytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [summary, setSummary] = useState<OsgbOperationalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const view = useMemo<ViewMode>(() => {
    const requested = searchParams.get("view");
    return requested === "documents" ? "documents" : "finance";
  }, [searchParams]);

  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      setLoading(true);
      try {
        const result = await getOsgbOperationalSummary(user.id);
        setSummary(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Trend analizi yüklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [user?.id]);

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">OSGB Trend Analizi</h1>
          <p className="text-sm text-slate-400">Finans ve evrak trendlerini ayrı grafik ekranlarında detaylı inceleyin.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/osgb/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard'a dön
          </Button>
          <Button variant={view === "finance" ? "default" : "outline"} onClick={() => navigate("/osgb/analytics?view=finance")}>
            <LineChartIcon className="mr-2 h-4 w-4" />
            Finans
          </Button>
          <Button variant={view === "documents" ? "default" : "outline"} onClick={() => navigate("/osgb/analytics?view=documents")}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Evrak
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="border-red-500/20 bg-red-500/10 text-red-100">
          <AlertTitle>Trend analizi yüklenemedi</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading || !summary ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="h-[420px] animate-pulse rounded-2xl border border-slate-800 bg-slate-900/70" />
          <div className="h-[420px] animate-pulse rounded-2xl border border-slate-800 bg-slate-900/70" />
        </div>
      ) : view === "finance" ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="border-slate-800 bg-slate-900/70 xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-white">Finans trend analizi</CardTitle>
              <CardDescription>Son 6 ayın bekleyen, ödenen ve geciken tahsilat hacmi.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={summary.finance.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "12px" }} />
                  <Line type="monotone" dataKey="pendingAmount" name="Bekleyen" stroke="#facc15" strokeWidth={2} />
                  <Line type="monotone" dataKey="paidAmount" name="Ödendi" stroke="#22c55e" strokeWidth={2} />
                  <Line type="monotone" dataKey="overdueAmount" name="Geciken" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="border-slate-800 bg-slate-900/70 xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-white">Evrak trend analizi</CardTitle>
              <CardDescription>Son 6 ayın aktif, yaklaşan ve süresi dolmuş evrak dağılımı.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={summary.documents.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "12px" }} />
                  <Bar dataKey="activeCount" name="Aktif" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="warningCount" name="Yaklaşan" fill="#facc15" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expiredCount" name="Süresi dolmuş" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
