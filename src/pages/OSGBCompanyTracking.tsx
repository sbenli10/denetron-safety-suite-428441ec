import { useEffect, useMemo, useState } from "react";
import { Building2, CircleAlert, FileClock, RefreshCcw, Search, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getOsgbCompanyTracking, type OsgbCompanyTrackingRecord } from "@/lib/osgbOperations";

const money = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value || 0);

const assignmentStatusLabel: Record<OsgbCompanyTrackingRecord["assignmentStatus"], string> = {
  atandi: "Atama tamam",
  eksik: "Eksik süre",
  atanmamis: "Atama yok",
};

const assignmentStatusClass: Record<OsgbCompanyTrackingRecord["assignmentStatus"], string> = {
  atandi: "bg-emerald-500/15 text-emerald-200 border-emerald-400/20",
  eksik: "bg-yellow-500/15 text-yellow-200 border-yellow-400/20",
  atanmamis: "bg-rose-500/15 text-rose-200 border-rose-400/20",
};

export default function OSGBCompanyTracking() {
  const { user } = useAuth();
  const [records, setRecords] = useState<OsgbCompanyTrackingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const rows = await getOsgbCompanyTracking(user.id);
      setRecords(rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Firma takip verisi yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [user?.id]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesStatus = statusFilter === "ALL" || record.assignmentStatus === statusFilter;
      const matchesQuery =
        !query ||
        [
          record.companyName,
          record.hazardClass,
          record.activeAssignment?.personnelName || "",
          record.activeAssignment?.role || "",
        ].some((value) => value.toLowerCase().includes(query));
      return matchesStatus && matchesQuery;
    });
  }, [records, search, statusFilter]);

  const summary = useMemo(() => {
    return {
      tracked: records.length,
      withExpiredDocs: records.filter((item) => item.documentSummary.expired > 0).length,
      withOverdueFinance: records.filter((item) => item.financeSummary.overdueAmount > 0).length,
      assignmentRisk: records.filter((item) => item.assignmentStatus !== "atandi").length,
    };
  }, [records]);

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-200">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">OSGB Firma Takibi</h1>
              <p className="text-sm text-slate-400">
                Her firma için aktif personel ataması, evrak durumu, finans baskısı ve açık görevleri tek tabloda izleyin.
              </p>
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => void loadData()}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Yenile
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-slate-800 bg-slate-950/70">
          <CardHeader className="pb-2">
            <CardDescription>Takip edilen firma</CardDescription>
            <CardTitle className="text-3xl text-white">{summary.tracked}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-400">Portföyde aktif görünen toplam firma.</CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-950/70">
          <CardHeader className="pb-2">
            <CardDescription>Süresi dolan evrak</CardDescription>
            <CardTitle className="text-3xl text-white">{summary.withExpiredDocs}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-400">En az bir süresi dolmuş evrakı olan firmalar.</CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-950/70">
          <CardHeader className="pb-2">
            <CardDescription>Gecikmiş finans</CardDescription>
            <CardTitle className="text-3xl text-white">{summary.withOverdueFinance}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-400">Gecikmiş ödeme kaydı bulunan firmalar.</CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-950/70">
          <CardHeader className="pb-2">
            <CardDescription>Atama riski</CardDescription>
            <CardTitle className="text-3xl text-white">{summary.assignmentRisk}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-400">Atanmamış veya eksik süreli firma sayısı.</CardContent>
        </Card>
      </div>

      {error ? (
        <Alert variant="destructive">
          <CircleAlert className="h-4 w-4" />
          <AlertTitle>Firma takibi yüklenemedi</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-slate-800 bg-slate-950/70">
        <CardHeader className="pb-4">
          <CardTitle className="text-white">Filtreler</CardTitle>
          <CardDescription>Portföyü arama ve assignment durumuna göre daraltın.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="space-y-2">
            <Label>Arama</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Firma veya atanan personel ara..." className="pl-9" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Atama durumu</Label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="ALL">Tüm durumlar</option>
              <option value="atandi">Atama tamam</option>
              <option value="eksik">Eksik süre</option>
              <option value="atanmamis">Atama yok</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-950/70">
        <CardHeader>
          <CardTitle className="text-white">Firma operasyon matrisi</CardTitle>
          <CardDescription>Evrak, finans, görev ve not yoğunluğunu tek satırda görün.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">Firma matrisi yükleniyor...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800">
                  <TableHead>Firma</TableHead>
                  <TableHead>Atama</TableHead>
                  <TableHead>Evrak</TableHead>
                  <TableHead>Finans</TableHead>
                  <TableHead>Görev / Not</TableHead>
                  <TableHead className="text-right">Drill-down</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.companyId} className="border-slate-800">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-white">{record.companyName}</div>
                        <div className="text-xs text-slate-400">
                          {record.hazardClass} • {record.employeeCount} çalışan • Bitiş: {record.contractEnd || "-"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <Badge className={assignmentStatusClass[record.assignmentStatus]}>
                          {assignmentStatusLabel[record.assignmentStatus]}
                        </Badge>
                        <div className="text-xs text-slate-400">
                          {record.activeAssignment
                            ? `${record.activeAssignment.personnelName} • ${record.activeAssignment.assignedMinutes}/${record.requiredMinutes} dk`
                            : `Atama yok • Gerekli: ${record.requiredMinutes} dk`}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        <div className="text-emerald-300">Aktif: {record.documentSummary.active}</div>
                        <div className="text-yellow-300">Yaklaşan: {record.documentSummary.warning}</div>
                        <div className="text-rose-300">Süresi dolmuş: {record.documentSummary.expired}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        <div className="text-slate-300">Bekleyen: {money(record.financeSummary.pendingAmount)}</div>
                        <div className="text-rose-300">Geciken: {money(record.financeSummary.overdueAmount)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs text-slate-300">
                        <div>Açık görev: {record.openTaskCount}</div>
                        <div>Operasyon notu: {record.noteCount}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/osgb/documents?status=${record.documentSummary.expired > 0 ? "expired" : record.documentSummary.warning > 0 ? "warning" : "active"}`}>
                            <FileClock className="mr-2 h-4 w-4" />
                            Evrak
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/osgb/finance?status=${record.financeSummary.overdueAmount > 0 ? "overdue" : "pending"}`}>
                            <Wallet className="mr-2 h-4 w-4" />
                            Finans
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
