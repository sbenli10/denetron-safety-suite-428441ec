import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom"; // AI sayfasından gelen veriyi yakalamak için
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Plus,
  Brain,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileWarning,
} from "lucide-react";
import { format, isPast, parseISO } from "date-fns";

// Statüler Türkçeleştirildi
type CAPAStatus = "Açık" | "Devam Ediyor" | "Tamamlandı";

interface CAPARecord {
  id: string;
  nonConformity: string;
  rootCause: string;
  correctiveAction: string;
  assignedPerson: string;
  deadline: string;
  status: CAPAStatus;
  createdAt: string;
}

const initialData: CAPARecord[] = [
  {
    id: "DÖF-001",
    nonConformity: "2m üzerindeki yüksek platformlarda emniyet kemeri kullanılmıyor",
    rootCause: "Eğitim eksikliği ve ekipman envanteri yetersizliği",
    correctiveAction: "Zorunlu yüksekte çalışma eğitimi ve günlük kemer kontrolü",
    assignedPerson: "Mehmet Yılmaz",
    deadline: "2026-03-15",
    status: "Devam Ediyor",
    createdAt: "2026-02-10",
  },
];

const statusConfig: Record<CAPAStatus, { color: string; icon: typeof Clock }> = {
  "Açık": { color: "bg-red-500/20 text-red-400 border-red-500/30", icon: AlertTriangle },
  "Devam Ediyor": { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Clock },
  "Tamamlandı": { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
};

export default function CAPA() {
  const location = useLocation();
  const [records, setRecords] = useState<CAPARecord[]>(initialData);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [nonConformity, setNonConformity] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [assignedPerson, setAssignedPerson] = useState("");
  const [deadline, setDeadline] = useState("");

  // AI Raporları sayfasından gelen veriyi otomatik doldurma (Copilot Entegrasyonu)
  useEffect(() => {
    if (location.state?.aiData) {
      const { description, plan, justification } = location.state.aiData;
      setNonConformity(description || "");
      setCorrectiveAction(plan || "");
      setRootCause(justification || "");
      setDialogOpen(true); // Formu otomatik aç
      toast({ title: "AI Verisi Aktarıldı", description: "Yapay zeka analizi DÖF formuna dolduruldu." });
    }
  }, [location.state]);

  const handleSubmit = () => {
    if (!nonConformity || !rootCause || !correctiveAction || !assignedPerson || !deadline) {
      toast({ title: "Lütfen tüm alanları doldurun", variant: "destructive" });
      return;
    }
    const newRecord: CAPARecord = {
      id: `DÖF-${String(records.length + 1).padStart(3, "0")}`,
      nonConformity,
      rootCause,
      correctiveAction,
      assignedPerson,
      deadline,
      status: "Açık",
      createdAt: format(new Date(), "yyyy-MM-dd"),
    };
    setRecords((prev) => [newRecord, ...prev]);
    setDialogOpen(false);
    toast({ title: "DÖF Kaydı Oluşturuldu", description: `${newRecord.id} başarıyla kaydedildi.` });
  };

  const updateStatus = (id: string, status: CAPAStatus) => {
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">DÖF Yönetimi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Düzeltici ve Önleyici Faaliyetler — Uygunsuzluk takibi ve çözüm süreçleri
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Yeni DÖF Kaydı
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileWarning className="h-5 w-5 text-primary" /> Yeni DÖF Formu
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Uygunsuzluk Tanımı</Label>
                <Textarea value={nonConformity} onChange={(e) => setNonConformity(e.target.value)} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Kök Neden Analizi</Label>
                <Textarea value={rootCause} onChange={(e) => setRootCause(e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Düzeltici İşlem Planı</Label>
                <Textarea value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sorumlu Kişi</Label>
                  <Input value={assignedPerson} onChange={(e) => setAssignedPerson(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Son Tarih (Deadline)</Label>
                  <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                </div>
              </div>
              <Button className="w-full" onClick={handleSubmit}>DÖF Kaydını Tamamla</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card border-red-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <AlertTriangle className="text-red-400" />
            <div><p className="text-2xl font-bold">{records.filter(r => r.status === "Açık").length}</p><p className="text-xs text-muted-foreground">Açık DÖF</p></div>
          </CardContent>
        </Card>
        {/* Diğer metrik kartları benzer şekilde güncellenebilir */}
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-lg">DÖF Takip Listesi</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Uygunsuzluk</TableHead>
                <TableHead>Sorumlu</TableHead>
                <TableHead>Son Tarih</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => {
                const cfg = statusConfig[record.status];
                const isOverdue = record.status !== "Tamamlandı" && isPast(parseISO(record.deadline));
                return (
                  <TableRow key={record.id} className={isOverdue ? "bg-red-500/5" : ""}>
                    <TableCell className="font-mono text-primary">{record.id}</TableCell>
                    <TableCell className="max-w-[250px] truncate">{record.nonConformity}</TableCell>
                    <TableCell>{record.assignedPerson}</TableCell>
                    <TableCell className={isOverdue ? "text-red-500 font-bold" : ""}>
                      {record.deadline} {isOverdue && "⚠️"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cfg.color}>{record.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Select value={record.status} onValueChange={(v) => updateStatus(record.id, v as CAPAStatus)}>
                        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Açık">Açık</SelectItem>
                          <SelectItem value="Devam Ediyor">Devam Ediyor</SelectItem>
                          <SelectItem value="Tamamlandı">Tamamlandı</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}