import { useState, useEffect } from "react";
import { 
  Calendar, Plus, Download, FileSpreadsheet, Users, 
  ClipboardList, Trash2, Save, Sparkles, CheckCircle2,
  AlertCircle, Clock, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  generateWorkPlanPDF, 
  generateTrainingPlanPDF,
  generateEvaluationReportPDF 
} from "@/utils/generateAnnualPlanPDF";
import type { 
  WorkPlanRow, 
  TrainingPlanRow, 
  EvaluationRow, 
  MonthStatus,
  AnnualPlanData 
} from "@/types/annualPlans";
import { 
  WORK_PLAN_TEMPLATE, 
  TRAINING_PLAN_TEMPLATE, 
  MONTH_NAMES 
} from "@/types/annualPlans";

const currentYear = new Date().getFullYear();

export default function AnnualPlans() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("work_plan");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ✅ State Management
  const [workPlan, setWorkPlan] = useState<WorkPlanRow[]>([]);
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlanRow[]>([]);
  const [evaluationReport, setEvaluationReport] = useState<EvaluationRow[]>([]);

  // ✅ Load Data
  useEffect(() => {
    loadPlans();
  }, [selectedYear, user]);

  const loadPlans = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("annual_plans")
        .select("*")
        .eq("user_id", user.id)
        .eq("year", selectedYear);

      if (error) throw error;

      if (data && data.length > 0) {
        data.forEach(plan => {
         if (plan.plan_type === "work_plan") {
        setWorkPlan((plan.plan_data as unknown) as WorkPlanRow[]);
        } else if (plan.plan_type === "training_plan") {
        setTrainingPlan((plan.plan_data as unknown) as TrainingPlanRow[]);
        } else if (plan.plan_type === "evaluation_report") {
        setEvaluationReport((plan.plan_data as unknown) as EvaluationRow[]);
        }
        });
        toast.success(`${selectedYear} yılı planları yüklendi`);
      } else {
        // Boş başlat
        setWorkPlan([]);
        setTrainingPlan([]);
        setEvaluationReport([]);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(`Yükleme hatası: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ YENİ:
const savePlan = async (planType: 'work_plan' | 'training_plan' | 'evaluation_report') => {
  if (!user) return;

  setSaving(true);
  try {
    const planData = 
      planType === 'work_plan' ? workPlan :
      planType === 'training_plan' ? trainingPlan :
      evaluationReport;

    // JSON serialization için type-safe dönüşüm
    const planDataJson = JSON.parse(JSON.stringify(planData));

    // Önce mevcut kaydı kontrol et
    const { data: existing } = await supabase
      .from("annual_plans")
      .select("id")
      .eq("user_id", user.id)
      .eq("year", selectedYear)
      .eq("plan_type", planType)
      .single();

    if (existing) {
      // Güncelle
      const { error } = await supabase
        .from("annual_plans")
        .update({ 
          plan_data: planDataJson, // ✅ Düzeltildi
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id);

      if (error) throw error;
    } else {
      // Yeni kayıt
      const { error } = await supabase
        .from("annual_plans")
        .insert({
          user_id: user.id,
          plan_type: planType,
          year: selectedYear,
          plan_data: planDataJson, // ✅ Düzeltildi
          title: `${selectedYear} ${
            planType === 'work_plan' ? 'Çalışma Planı' :
            planType === 'training_plan' ? 'Eğitim Planı' :
            'Değerlendirme Raporu'
          }`
        });

      if (error) throw error;
    }

    toast.success("✅ Plan kaydedildi");
  } catch (e: any) {
    console.error(e);
    toast.error(`❌ Kaydetme hatası: ${e.message}`);
  } finally {
    setSaving(false);
  }
};

  // ========================
  // WORK PLAN FUNCTIONS
  // ========================
  const addWorkPlanRow = () => {
    const newRow: WorkPlanRow = {
      id: crypto.randomUUID(),
      activity_name: "",
      responsible: "",
      months: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i, "empty"]))
    };
    setWorkPlan([...workPlan, newRow]);
  };

  const updateWorkPlanRow = (id: string, field: keyof WorkPlanRow, value: any) => {
    setWorkPlan(prev => prev.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const toggleMonthStatus = (rowId: string, monthIndex: number) => {
    setWorkPlan(prev => prev.map(row => {
      if (row.id !== rowId) return row;

      const currentStatus = row.months[monthIndex];
      const nextStatus: MonthStatus = 
        currentStatus === "empty" ? "planned" :
        currentStatus === "planned" ? "completed" :
        "empty";

      return {
        ...row,
        months: { ...row.months, [monthIndex]: nextStatus }
      };
    }));
  };

  const removeWorkPlanRow = (id: string) => {
    setWorkPlan(prev => prev.filter(row => row.id !== id));
  };

  const loadWorkPlanTemplate = () => {
    const templateWithIds = WORK_PLAN_TEMPLATE.map(row => ({
      ...row,
      id: crypto.randomUUID()
    }));
    setWorkPlan(templateWithIds);
    toast.success("✅ Şablon yüklendi");
  };

  // ========================
  // TRAINING PLAN FUNCTIONS
  // ========================
  const addTrainingPlanRow = () => {
    const newRow: TrainingPlanRow = {
      id: crypto.randomUUID(),
      topic: "",
      duration_hours: 0,
      trainer: "",
      target_participants: 0,
      planned_month: 0,
      status: "planned"
    };
    setTrainingPlan([...trainingPlan, newRow]);
  };

  const updateTrainingPlanRow = (id: string, field: keyof TrainingPlanRow, value: any) => {
    setTrainingPlan(prev => prev.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const removeTrainingPlanRow = (id: string) => {
    setTrainingPlan(prev => prev.filter(row => row.id !== id));
  };

  const loadTrainingPlanTemplate = () => {
    const templateWithIds = TRAINING_PLAN_TEMPLATE.map(row => ({
      ...row,
      id: crypto.randomUUID()
    }));
    setTrainingPlan(templateWithIds);
    toast.success("✅ Şablon yüklendi");
  };

  // ========================
  // EVALUATION REPORT FUNCTIONS
  // ========================
  const addEvaluationRow = () => {
    const newRow: EvaluationRow = {
      id: crypto.randomUUID(),
      activity: "",
      planned_date: "",
      actual_date: "",
      status: "pending",
      result_comment: ""
    };
    setEvaluationReport([...evaluationReport, newRow]);
  };

  const updateEvaluationRow = (id: string, field: keyof EvaluationRow, value: any) => {
    setEvaluationReport(prev => prev.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const removeEvaluationRow = (id: string) => {
    setEvaluationReport(prev => prev.filter(row => row.id !== id));
  };

  // ========================
  // PDF EXPORT FUNCTIONS
  // ========================
  const exportWorkPlanPDF = async () => {
    if (workPlan.length === 0) {
      toast.error("Dışa aktarılacak veri yok");
      return;
    }

    toast.info("📄 PDF oluşturuluyor...");
    try {
      const blob = await generateWorkPlanPDF(workPlan, selectedYear, user?.email || "İşyeri");
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Calisma-Plani-${selectedYear}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("✅ PDF indirildi");
    } catch (e: any) {
      toast.error(`❌ PDF hatası: ${e.message}`);
    }
  };

  const exportTrainingPlanPDF = async () => {
    if (trainingPlan.length === 0) {
      toast.error("Dışa aktarılacak veri yok");
      return;
    }

    toast.info("📄 PDF oluşturuluyor...");
    try {
      const blob = await generateTrainingPlanPDF(trainingPlan, selectedYear, user?.email || "İşyeri");
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Egitim-Plani-${selectedYear}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("✅ PDF indirildi");
    } catch (e: any) {
      toast.error(`❌ PDF hatası: ${e.message}`);
    }
  };

  const exportEvaluationPDF = async () => {
    if (evaluationReport.length === 0) {
      toast.error("Dışa aktarılacak veri yok");
      return;
    }

    toast.info("📄 PDF oluşturuluyor...");
    try {
      const blob = await generateEvaluationReportPDF(evaluationReport, selectedYear, user?.email || "İşyeri");
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Degerlendirme-Raporu-${selectedYear}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("✅ PDF indirildi");
    } catch (e: any) {
      toast.error(`❌ PDF hatası: ${e.message}`);
    }
  };

  // ========================
  // RENDER
  // ========================
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            Yıllık Planlar ve Raporlar
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Çalışma planı, eğitim planı ve değerlendirme raporlarını yönetin
          </p>
        </div>

        {/* Year Selector */}
        <Select
          value={selectedYear.toString()}
          onValueChange={(value) => setSelectedYear(parseInt(value))}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(year => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="work_plan" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Çalışma Planı
          </TabsTrigger>
          <TabsTrigger value="training_plan" className="gap-2">
            <Users className="h-4 w-4" />
            Eğitim Planı
          </TabsTrigger>
          <TabsTrigger value="evaluation" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Değerlendirme Raporu
          </TabsTrigger>
        </TabsList>

        {/* ======================== */}
        {/* TAB 1: ÇALIŞMA PLANI */}
        {/* ======================== */}
        <TabsContent value="work_plan" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Yıllık Çalışma Planı ({selectedYear})</CardTitle>
                  <CardDescription>
                    Aylık takip için hücrelere tıklayın: Boş → Planlandı (Sarı) → Tamamlandı (Yeşil)
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadWorkPlanTemplate}
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Şablon Yükle
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => savePlan('work_plan')}
                    disabled={saving}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Kaydet
                  </Button>
                  <Button
                    size="sm"
                    onClick={exportWorkPlanPDF}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    PDF İndir
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Faaliyet</TableHead>
                      <TableHead className="w-[150px]">Sorumlu</TableHead>
                      {MONTH_NAMES.map((month, idx) => (
                        <TableHead key={idx} className="text-center w-[60px]">
                          {month.substring(0, 3)}
                        </TableHead>
                      ))}
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workPlan.map(row => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Input
                            value={row.activity_name}
                            onChange={(e) => updateWorkPlanRow(row.id, 'activity_name', e.target.value)}
                            placeholder="Faaliyet adı"
                            className="h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.responsible}
                            onChange={(e) => updateWorkPlanRow(row.id, 'responsible', e.target.value)}
                            placeholder="Sorumlu"
                            className="h-8 text-sm"
                          />
                        </TableCell>
                        {Object.entries(row.months).map(([monthIndex, status]) => (
                          <TableCell 
                            key={monthIndex}
                            className="p-1 text-center cursor-pointer"
                            onClick={() => toggleMonthStatus(row.id, parseInt(monthIndex))}
                          >
                            <div className={`h-8 w-full rounded flex items-center justify-center transition-all hover:scale-105 ${
                              status === "empty" ? "bg-slate-100 dark:bg-slate-800 text-slate-400" :
                              status === "planned" ? "bg-yellow-400 dark:bg-yellow-500 text-yellow-900 font-bold" :
                              "bg-green-500 dark:bg-green-600 text-white font-bold"
                            }`}>
                              {status === "planned" ? "P" : status === "completed" ? "✓" : "-"}
                            </div>
                          </TableCell>
                        ))}
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeWorkPlanRow(row.id)}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Button
                variant="outline"
                onClick={addWorkPlanRow}
                className="w-full mt-4 gap-2"
              >
                <Plus className="h-4 w-4" />
                Satır Ekle
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================== */}
        {/* TAB 2: EĞİTİM PLANI */}
        {/* ======================== */}
        <TabsContent value="training_plan" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Yıllık Eğitim Planı ({selectedYear})</CardTitle>
                  <CardDescription>
                    Personel eğitimlerini planlayın ve takip edin
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadTrainingPlanTemplate}
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Şablon Yükle
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => savePlan('training_plan')}
                    disabled={saving}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Kaydet
                  </Button>
                  <Button
                    size="sm"
                    onClick={exportTrainingPlanPDF}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    PDF İndir
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Eğitim Konusu</TableHead>
                    <TableHead className="w-[100px]">Süre (saat)</TableHead>
                    <TableHead className="w-[150px]">Eğitici</TableHead>
                    <TableHead className="w-[120px]">Hedef Katılımcı</TableHead>
                    <TableHead className="w-[120px]">Planlanan Ay</TableHead>
                    <TableHead className="w-[120px]">Durum</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainingPlan.map(row => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Input
                          value={row.topic}
                          onChange={(e) => updateTrainingPlanRow(row.id, 'topic', e.target.value)}
                          placeholder="Eğitim konusu"
                          className="h-9 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={row.duration_hours}
                          onChange={(e) => updateTrainingPlanRow(row.id, 'duration_hours', parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="h-9 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.trainer}
                          onChange={(e) => updateTrainingPlanRow(row.id, 'trainer', e.target.value)}
                          placeholder="Eğitici"
                          className="h-9 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={row.target_participants}
                          onChange={(e) => updateTrainingPlanRow(row.id, 'target_participants', parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="h-9 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.planned_month.toString()}
                          onValueChange={(value) => updateTrainingPlanRow(row.id, 'planned_month', parseInt(value))}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTH_NAMES.map((month, idx) => (
                              <SelectItem key={idx} value={idx.toString()}>
                                {month}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.status}
                          onValueChange={(value: "planned" | "completed") => updateTrainingPlanRow(row.id, 'status', value)}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="planned">
                              <span className="flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                Planlandı
                              </span>
                            </SelectItem>
                            <SelectItem value="completed">
                              <span className="flex items-center gap-2">
                                <CheckCircle2 className="h-3 w-3" />
                                Tamamlandı
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeTrainingPlanRow(row.id)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Button
                variant="outline"
                onClick={addTrainingPlanRow}
                className="w-full mt-4 gap-2"
              >
                <Plus className="h-4 w-4" />
                Eğitim Ekle
              </Button>

              {/* İstatistikler */}
              {trainingPlan.length > 0 && (
                <div className="grid grid-cols-4 gap-4 mt-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-primary">
                        {trainingPlan.length}
                      </div>
                      <p className="text-xs text-muted-foreground">Toplam Eğitim</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-primary">
                        {trainingPlan.reduce((sum, row) => sum + row.duration_hours, 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">Toplam Saat</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-primary">
                        {trainingPlan.reduce((sum, row) => sum + row.target_participants, 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">Hedef Katılımcı</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-success">
                        {trainingPlan.filter(row => row.status === "completed").length}
                      </div>
                      <p className="text-xs text-muted-foreground">Tamamlanan</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================== */}
        {/* TAB 3: DEĞERLENDİRME RAPORU */}
        {/* ======================== */}
        <TabsContent value="evaluation" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Yıllık Değerlendirme Raporu ({selectedYear})</CardTitle>
                  <CardDescription>
                    Gerçekleştirilen faaliyetlerin sonuçlarını kaydedin
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => savePlan('evaluation_report')}
                    disabled={saving}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Kaydet
                  </Button>
                  <Button
                    size="sm"
                    onClick={exportEvaluationPDF}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    PDF İndir
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Faaliyet</TableHead>
                    <TableHead className="w-[130px]">Planlanan Tarih</TableHead>
                    <TableHead className="w-[130px]">Gerçekleşen Tarih</TableHead>
                    <TableHead className="w-[120px]">Durum</TableHead>
                    <TableHead>Sonuç ve Yorum</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluationReport.map(row => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Input
                          value={row.activity}
                          onChange={(e) => updateEvaluationRow(row.id, 'activity', e.target.value)}
                          placeholder="Faaliyet"
                          className="h-9 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={row.planned_date}
                          onChange={(e) => updateEvaluationRow(row.id, 'planned_date', e.target.value)}
                          className="h-9 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={row.actual_date}
                          onChange={(e) => updateEvaluationRow(row.id, 'actual_date', e.target.value)}
                          className="h-9 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.status}
                          onValueChange={(value: "completed" | "pending" | "cancelled") => updateEvaluationRow(row.id, 'status', value)}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="completed">
                              <span className="flex items-center gap-2">
                                <CheckCircle2 className="h-3 w-3 text-success" />
                                Tamamlandı
                              </span>
                            </SelectItem>
                            <SelectItem value="pending">
                              <span className="flex items-center gap-2">
                                <AlertCircle className="h-3 w-3 text-warning" />
                                Beklemede
                              </span>
                            </SelectItem>
                            <SelectItem value="cancelled">
                              <span className="flex items-center gap-2">
                                <XCircle className="h-3 w-3 text-destructive" />
                                İptal
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Textarea
                          value={row.result_comment}
                          onChange={(e) => updateEvaluationRow(row.id, 'result_comment', e.target.value)}
                          placeholder="Sonuç ve değerlendirme..."
                          className="min-h-[60px] text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeEvaluationRow(row.id)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Button
                variant="outline"
                onClick={addEvaluationRow}
                className="w-full mt-4 gap-2"
              >
                <Plus className="h-4 w-4" />
                Değerlendirme Ekle
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}