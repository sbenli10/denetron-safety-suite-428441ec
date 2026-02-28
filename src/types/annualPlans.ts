export type MonthStatus = "empty" | "planned" | "completed";

export interface WorkPlanRow {
  id: string;
  activity_name: string;
  responsible: string;
  months: {
    [key: number]: MonthStatus; // 0-11 (Ocak-Aralık)
  };
}

export interface TrainingPlanRow {
  id: string;
  topic: string;
  duration_hours: number;
  trainer: string;
  target_participants: number;
  planned_month: number;
  status: "planned" | "completed";
}

export interface EvaluationRow {
  id: string;
  activity: string;
  planned_date: string;
  actual_date: string;
  status: "completed" | "pending" | "cancelled";
  result_comment: string;
}

export interface AnnualPlanData {
  work_plan: WorkPlanRow[];
  training_plan: TrainingPlanRow[];
  evaluation_report: EvaluationRow[];
}

// Şablon verileri
export const WORK_PLAN_TEMPLATE: Omit<WorkPlanRow, 'id'>[] = [
  {
    activity_name: "Asansör Periyodik Kontrolü",
    responsible: "Teknik Müdür",
    months: Array.from({ length: 12 }, (_, i) => [i, i % 6 === 0 ? "planned" : "empty"]).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
  },
  {
    activity_name: "Yangın Söndürme Tüpü Kontrol ve Dolumu",
    responsible: "İSG Uzmanı",
    months: Array.from({ length: 12 }, (_, i) => [i, i === 0 ? "planned" : "empty"]).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
  },
  {
    activity_name: "Tahliye Tatbikatı",
    responsible: "Acil Durum Ekibi",
    months: Array.from({ length: 12 }, (_, i) => [i, i === 5 || i === 11 ? "planned" : "empty"]).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
  },
  {
    activity_name: "İlk Yardım Eğitimi",
    responsible: "İSG Uzmanı",
    months: Array.from({ length: 12 }, (_, i) => [i, i === 2 ? "planned" : "empty"]).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
  },
  {
    activity_name: "KKD Temini ve Dağıtımı",
    responsible: "Satın Alma",
    months: Array.from({ length: 12 }, (_, i) => [i, i % 3 === 0 ? "planned" : "empty"]).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
  },
  {
    activity_name: "Risk Değerlendirmesi Güncellemesi",
    responsible: "İSG Uzmanı",
    months: Array.from({ length: 12 }, (_, i) => [i, i === 0 || i === 6 ? "planned" : "empty"]).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
  },
  {
    activity_name: "İşyeri Hekimi Kontrolleri",
    responsible: "İşyeri Hekimi",
    months: Array.from({ length: 12 }, (_, i) => [i, "planned"]).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
  },
  {
    activity_name: "Acil Durum Planı Revizyonu",
    responsible: "İSG Uzmanı",
    months: Array.from({ length: 12 }, (_, i) => [i, i === 0 ? "planned" : "empty"]).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
  },
  {
    activity_name: "Elektrik Panosu Termografik Kontrol",
    responsible: "Elektrik Mühendisi",
    months: Array.from({ length: 12 }, (_, i) => [i, i === 3 || i === 9 ? "planned" : "empty"]).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
  },
  {
    activity_name: "Yıldırım Tesisatı Topraklama Ölçümü",
    responsible: "Teknik Ekip",
    months: Array.from({ length: 12 }, (_, i) => [i, i === 4 ? "planned" : "empty"]).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
  }
];

export const TRAINING_PLAN_TEMPLATE: Omit<TrainingPlanRow, 'id'>[] = [
  {
    topic: "İş Sağlığı ve Güvenliği Temel Eğitimi",
    duration_hours: 16,
    trainer: "İSG Uzmanı",
    target_participants: 50,
    planned_month: 0,
    status: "planned"
  },
  {
    topic: "Yangın Söndürme ve Tahliye Eğitimi",
    duration_hours: 4,
    trainer: "İtfaiye Uzmanı",
    target_participants: 30,
    planned_month: 2,
    status: "planned"
  },
  {
    topic: "İlk Yardım Eğitimi",
    duration_hours: 8,
    trainer: "Acil Tıp Teknisyeni",
    target_participants: 20,
    planned_month: 3,
    status: "planned"
  },
  {
    topic: "Yüksekte Çalışma Güvenliği",
    duration_hours: 8,
    trainer: "İSG Uzmanı",
    target_participants: 15,
    planned_month: 4,
    status: "planned"
  },
  {
    topic: "Elektrik Güvenliği",
    duration_hours: 6,
    trainer: "Elektrik Mühendisi",
    target_participants: 10,
    planned_month: 5,
    status: "planned"
  },
  {
    topic: "Kimyasal Madde Güvenliği (MSDS)",
    duration_hours: 4,
    trainer: "Kimya Mühendisi",
    target_participants: 25,
    planned_month: 7,
    status: "planned"
  },
  {
    topic: "Ergonomi ve Kas-İskelet Sağlığı",
    duration_hours: 3,
    trainer: "Fizyoterapist",
    target_participants: 40,
    planned_month: 9,
    status: "planned"
  }
];

export const MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];