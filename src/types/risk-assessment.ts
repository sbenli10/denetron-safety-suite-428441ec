export type RiskClass = 
  | "Kabul Edilebilir" 
  | "Olası" 
  | "Önemli" 
  | "Yüksek" 
  | "Çok Yüksek";

export type AssessmentStatus = "draft" | "completed" | "approved";
export type RiskItemStatus = "open" | "in_progress" | "completed";

export interface RiskItem {
  id: string;
  created_at: string;
  updated_at: string;
  assessment_id: string;
  item_number: number;
  department?: string;
  hazard: string;
  risk: string;
  affected_people?: string; // ✅ YENİ: Etkilenenler
  photo_url?: string;
  
  // 1. AŞAMA (Mevcut Durum)
  probability_1: number; // Olasılık
  frequency_1: number;   // Frekans
  severity_1: number;    // Şiddet
  score_1: number;       // R = O × F × Ş
  risk_class_1: RiskClass;
  
  // ÖNLEMLER
  existing_controls?: string;
  proposed_controls?: string;
  
  // 2. AŞAMA (Önlem Sonrası - Kalıntı Risk)
  probability_2?: number;
  frequency_2?: number;
  severity_2?: number;
  score_2?: number;
  risk_class_2?: RiskClass;
  
  // DİĞER
  responsible_person?: string;
  deadline?: string;
  status: RiskItemStatus;
  is_from_library: boolean;
  library_category?: string;
  sort_order: number;
}

export interface RiskAssessment {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  company_id: string;
  assessment_name: string;
  assessment_date: string;
  sector?: string;
  method: string;
  status: AssessmentStatus;
  department?: string;
  assessor_name?: string;
  reviewer_name?: string;
  approval_date?: string;
  next_review_date?: string;
  version: number;
  is_deleted: boolean;
  notes?: string;
}

export interface RiskLibraryItem {
  id: string;
  sector: string;
  category?: string;
  hazard: string;
  risk: string;
  typical_probability: number;
  typical_frequency: number;
  typical_severity: number;
  suggested_controls: string[];
  legal_reference?: string;
  usage_count: number;
  is_active: boolean;
}

// ✅ YENİ: Risk Paketleri (Sol Panel için)
export interface RiskPackage {
  id: string;
  name: string;
  sector: string;
  item_count: number;
  items: RiskLibraryItem[];
}

export const SECTORS = [
  "FABRİKA",
  "ATÖLYE",
  "TERSANE",
  "MADEN",
  "ENERJİ",
  "DEMİRÇELİK",
  "DOKUM",
  "METAL",
  "KAYNAK",
  "İNŞAAT"
] as const;

export const FINE_KINNEY_SCALES = {
  probability: [
    { value: 10, label: "Bekleniyor" },
    { value: 6, label: "Oldukça Mümkün" },
    { value: 3, label: "Mümkün Fakat Nadir" },
    { value: 1, label: "Mümkün Değil" },
    { value: 0.5, label: "Pratik Olarak İmkansız" },
    { value: 0.2, label: "Düşünülemez" }
  ],
  frequency: [
    { value: 10, label: "Sürekli" },
    { value: 6, label: "Sık Sık (Günde bir)" },
    { value: 3, label: "Ara Sıra (Haftada bir)" },
    { value: 2, label: "Seyrek (Ayda bir)" },
    { value: 1, label: "Çok Nadir (Yılda bir)" },
    { value: 0.5, label: "Çok Seyrek" }
  ],
  severity: [
    { value: 100, label: "Çok Sayıda Ölüm" },
    { value: 40, label: "Ölüm" },
    { value: 15, label: "Çok Ciddi Yaralanma" },
    { value: 7, label: "Ciddi Yaralanma" },
    { value: 3, label: "Hafif Yaralanma" },
    { value: 1, label: "Çok Hafif Yaralanma" }
  ]
};

export function calculateRiskScore(
  probability: number,
  frequency: number,
  severity: number
): number {
  return probability * frequency * severity;
}

export function getRiskClass(score: number): RiskClass {
  if (score > 400) return "Çok Yüksek";
  if (score >= 200) return "Yüksek";
  if (score >= 70) return "Önemli";
  if (score >= 20) return "Olası";
  return "Kabul Edilebilir";
}

export function getRiskClassColor(riskClass: RiskClass): string {
  const colors: Record<RiskClass, string> = {
    "Çok Yüksek": "bg-red-600 text-white border-red-700",
    "Yüksek": "bg-orange-500 text-white border-orange-600",
    "Önemli": "bg-yellow-500 text-black border-yellow-600",
    "Olası": "bg-blue-500 text-white border-blue-600",
    "Kabul Edilebilir": "bg-green-600 text-white border-green-700"
  };
  return colors[riskClass];
}

// src/types/sectors.ts
export const RISK_SECTORS = [
  { id: "otomotiv", name: "Otomotiv", icon: "🚗", keywords: ["araç", "fabrika", "üretim", "montaj"] },
  { id: "insaat", name: "İnşaat", icon: "🏗️", keywords: ["yapı", "inşa", "bina", "şantiye"] },
  { id: "gida", name: "Gıda", icon: "🍽️", keywords: ["yemek", "restoran", "mutfak", "gıda"] },
  { id: "metal", name: "Metal İşleme", icon: "🔩", keywords: ["metal", "çelik", "demir", "kaynak"] },
  { id: "tekstil", name: "Tekstil", icon: "👕", keywords: ["kumaş", "dokuma", "giyim", "tekstil"] },
  { id: "kimya", name: "Kimya", icon: "⚗️", keywords: ["kimyasal", "ilaç", "boya", "plastik"] },
  { id: "lojistik", name: "Lojistik & Depo", icon: "📦", keywords: ["depo", "ambarcılık", "kargo", "taşıma"] },
  { id: "enerji", name: "Enerji", icon: "⚡", keywords: ["elektrik", "güneş", "rüzgar", "enerji"] },
  { id: "maden", name: "Maden & Taş Ocağı", icon: "⛏️", keywords: ["maden", "taş", "kömür", "ocak"] },
  { id: "saglik", name: "Sağlık", icon: "🏥", keywords: ["hastane", "klinik", "sağlık", "tıbbi"] },
  { id: "egitim", name: "Eğitim", icon: "📚", keywords: ["okul", "üniversite", "eğitim", "öğretim"] },
  { id: "ofis", name: "Ofis & Hizmet", icon: "💼", keywords: ["büro", "ofis", "yazılım", "danışmanlık"] },
  { id: "tarim", name: "Tarım & Hayvancılık", icon: "🌾", keywords: ["tarım", "çiftlik", "hayvancılık", "sera"] },
  { id: "turizm", name: "Turizm & Otel", icon: "🏨", keywords: ["otel", "tatil", "konaklama", "turizm"] },
  { id: "perakende", name: "Perakende", icon: "🛒", keywords: ["market", "mağaza", "satış", "perakende"] }
] as const;

export type SectorId = typeof RISK_SECTORS[number]["id"];

export function getRiskClassLabel(riskClass: RiskClass): string {
  const labels: Record<RiskClass, string> = {
    "Çok Yüksek": "Esaslı",
    "Yüksek": "Tolerans",
    "Önemli": "Olası",
    "Olası": "Olası",
    "Kabul Edilebilir": "Kabul"
  };
  return labels[riskClass];
}