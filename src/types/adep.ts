export interface CompanyInfo {
  firma_adi: string;
  adres: string;
  tehlike_sinifi: "Çok Tehlikeli" | "Tehlikeli" | "Az Tehlikeli";
  calisan_sayisi: number;
  logo_url?: string;
  // ✅ YENİ ALANLAR
  sektor: string;
  vergi_no?: string;
  yetkili_kisi: string;
  yetkili_telefon: string;
  email?: string;
  koordinatlar?: { lat: number; lng: number };
}

export interface TeamMember {
  id: string;
  ad_soyad: string;
  gorev: string;
  telefon: string;
  // ✅ YENİ
  email?: string;
  photo_url?: string;
  sertifika?: string; // "İlk Yardım", "Yangın", vb.
  egitim_tarihi?: string;
}

export interface EmergencyTeams {
  sondurme: TeamMember[];
  kurtarma: TeamMember[];
  koruma: TeamMember[];
  ilk_yardim: TeamMember[];
}

export interface Scenario {
  id: string;
  name: string;
  icon: string;
  selected: boolean;
  procedures: string[];
  // ✅ YENİ
  risk_level: "low" | "medium" | "high" | "critical";
  estimated_duration: number; // dakika
  required_equipment: string[];
  responsible_team: keyof EmergencyTeams;
}

export interface BlueprintData {
  image_url?: string;
  analysis_result?: any;
  // ✅ YENİ
  floor_count?: number;
  building_area?: number;
  emergency_exits?: number;
  assembly_points?: { name: string; lat: number; lng: number }[];
}

export interface EmergencyContact {
  name: string;
  phone: string;
  type: "itfaiye" | "ambulans" | "polis" | "hastane" | "AFAD";
  address?: string;
  distance?: number; // km
}

export interface DrillSchedule {
  date: string;
  scenario: string;
  duration: number;
  participants: number;
  notes?: string;
}

export interface ADEPData {
  version: string; // "1.0", "1.1", vb.
  company_info: CompanyInfo;
  teams: EmergencyTeams;
  scenarios: Scenario[];
  blueprint: BlueprintData;
  // ✅ YENİ
  emergency_contacts: EmergencyContact[];
  drill_schedule: DrillSchedule[];
  created_at: string;
  created_by: string;
  approved_by?: string;
  approval_date?: string;
  next_review_date: string;
  qr_code?: string;
}

// ✅ GELIŞMIŞ SENARYOLAR
export const ADVANCED_SCENARIOS: Scenario[] = [
  {
    id: "yangin",
    name: "Yangın",
    icon: "🔥",
    selected: false,
    risk_level: "critical",
    estimated_duration: 15,
    required_equipment: ["Yangın söndürücü", "Yangın battaniyesi", "Duman maskesi"],
    responsible_team: "sondurme",
    procedures: [
      "1. Yangın alarmını çalıştır (manuel veya otomatik)",
      "2. 110 İtfaiye'yi ara, konum ve yangın türünü bildir",
      "3. Elektrik panosunu kapat (ana şalter)",
      "4. Söndürme ekibi ilk müdahaleye başlar (P.A.S.S. yöntemi)",
      "5. Koruma ekibi tahliye yollarını açık tutar",
      "6. İlk yardım ekibi yaralı kontrolü yapar",
      "7. Tüm personel toplanma alanına yönlendirilir",
      "8. Yoklama alınır, eksik kişiler bildirilir",
      "9. İtfaiye ekipleri gelene kadar bina yaklaşımı yasaktır",
      "10. Olayın Sosyal Güvenlik Kurumu'na bildirilmesi (72 saat)"
    ]
  },
  {
    id: "deprem",
    name: "Deprem",
    icon: "🏚️",
    selected: false,
    risk_level: "critical",
    estimated_duration: 30,
    required_equipment: ["Acil çanta", "El feneri", "İlk yardım çantası", "Telsiz"],
    responsible_team: "kurtarma",
    procedures: [
      "1. Sarsıntı başladığında: ÇÖK-KAPAN-TUTUN",
      "2. Masanın altına gir, başını kolla",
      "3. Camlardan, rafl ardan uzak dur",
      "4. Asansör kullanma, merdivenlere koşma",
      "5. Sarsıntı durduktan sonra acil çıkışları kullan",
      "6. Binadan çıkarken koşma, itişme, bağırma",
      "7. Elektrik-gaz-su vanalarını kapat",
      "8. Toplanma alanına git, yoklamaya katıl",
      "9. Enkaz altında kalan varsa kurtarma ekibine bildir",
      "10. Artçı sarsıntılara hazır ol, binaya girme",
      "11. 112 AFAD'ı ara, hasar durumunu bildir"
    ]
  },
  {
    id: "kimyasal",
    name: "Kimyasal Sızıntı",
    icon: "☢️",
    selected: false,
    risk_level: "critical",
    estimated_duration: 20,
    required_equipment: ["Kimyasal eldiven", "Gaz maskesi", "Emici malzeme", "Nötrleştirici"],
    responsible_team: "koruma",
    procedures: [
      "1. Sızıntı kaynağını tespit et, yaklaşma",
      "2. Bölgeyi izole et, uyarı levhaları koy",
      "3. 112 Acil Servis + AFAD'ı ara",
      "4. Havalandırma sistemini kapat (yayılma riski)",
      "5. Koruma ekibi kimyasal koruyucu giysi giyer",
      "6. Sızıntı emici malzeme ile kontrol altına alınır",
      "7. Temas eden kişiler dekontaminasyon duşuna alınır",
      "8. İlk yardım ekibi semptomları izler",
      "9. Kimyasal Madde Güvenlik Bilgi Formu (MSDS) temin edilir",
      "10. Atık bertaraf firması çağrılır"
    ]
  },
  {
    id: "gaz_kacagi",
    name: "Doğalgaz Kaçağı",
    icon: "💨",
    selected: false,
    risk_level: "high",
    estimated_duration: 10,
    required_equipment: ["Gaz dedektörü", "Yangın söndürücü", "İzole eldiven"],
    responsible_team: "sondurme",
    procedures: [
      "1. Elektrik düğmelerine dokunma (kıvılcım riski)",
      "2. Kapı ve pencereleri aç, havalandır",
      "3. Ana gaz vanasını kapat",
      "4. 187 IGDAŞ Acil'i ara (İstanbul) / İlgili gaz dağıtım",
      "5. Binayı hızla tahliye et",
      "6. Çakmak, kibrit, telefon kullanma",
      "7. Toplanma alanında bekle",
      "8. Gaz ekipleri gelene kadar binaya girme"
    ]
  },
  {
    id: "sel",
    name: "Su Baskını / Sel",
    icon: "🌊",
    selected: false,
    risk_level: "high",
    estimated_duration: 25,
    required_equipment: ["Su pompası", "Kum torbası", "Bot", "Can yeleği"],
    responsible_team: "kurtarma",
    procedures: [
      "1. Elektrik panosunu kapat (elektrik çarpması riski)",
      "2. Bodrum ve zemin katları tahliye et",
      "3. Değerli eşya ve dokümanları üst katlara taşı",
      "4. Kapı ve pencerelere kum torbası yerleştir",
      "5. 112 AFAD'ı ara, su seviyesini bildir",
      "6. Su seviyesi yükseliyorsa binayı tahliye et",
      "7. Yüksek noktalarda toplan, yardım bekle",
      "8. Akan suda yürüme, su içinde araç kullanma"
    ]
  },
  {
    id: "elektrik",
    name: "Elektrik Arızası / Yangın",
    icon: "⚡",
    selected: false,
    risk_level: "high",
    estimated_duration: 12,
    required_equipment: ["Kuru kimyevi söndürücü (CO2)", "İzole eldiven", "El feneri"],
    responsible_team: "sondurme",
    procedures: [
      "1. Ana şalteri kapat (pano odasında)",
      "2. 110 İtfaiye + Elektrik dağıtım şirketini ara",
      "3. Suyla müdahale etme (elektrik iletir)",
      "4. CO2 veya kuru kimyevi söndürücü kullan",
      "5. Sigortalar atıyorsa tamirat bekle",
      "6. Elektrik çarpması olan varsa 112'yi ara, kalp masajı yap"
    ]
  },
  {
    id: "bomb_tehdidi",
    name: "Bomba İhbarı",
    icon: "💣",
    selected: false,
    risk_level: "critical",
    estimated_duration: 45,
    required_equipment: ["Telsiz", "Şüpheli paket tanıma rehberi"],
    responsible_team: "koruma",
    procedures: [
      "1. İhbarı ciddiye al, arayandan detay al",
      "2. 155 Polis + 112 AFAD'ı ara",
      "3. Binayı sessizce tahliye et, panik yaratma",
      "4. Şüpheli paketlere dokunma, taşıma",
      "5. Cep telefonu kullanma (radyo frekansı riski)",
      "6. 500 metre güvenlik mesafesi oluştur",
      "7. Bomba imha ekipleri gelene kadar bekle"
    ]
  },
  {
    id: "is_kazasi",
    name: "İş Kazası / Yaralanma",
    icon: "🩹",
    selected: false,
    risk_level: "medium",
    estimated_duration: 8,
    required_equipment: ["İlk yardım çantası", "Sedye", "AED cihazı"],
    responsible_team: "ilk_yardim",
    procedures: [
      "1. Olay yerini güvenli hale getir (makine durdur)",
      "2. Yaralının bilincini kontrol et",
      "3. 112 Acil Servis'i ara, yaralanma tipini bildir",
      "4. Kanama varsa bası ile durdur",
      "5. Kırık varsa sabitlemeler yap",
      "6. Yaralıyı hareket ettirme (omurga travması riski)",
      "7. Ambulans gelene kadar yaşamsal fonksiyonları izle",
      "8. Kazayı SGK'ya 3 gün içinde bildir (İş Kazası Bildirgesi)"
    ]
  },
  {
    id: "pandemi",
    name: "Salgın Hastalık / Pandemi",
    icon: "🦠",
    selected: false,
    risk_level: "medium",
    estimated_duration: 60,
    required_equipment: ["Maske", "Dezenfektan", "Ateş ölçer", "İzolasyon odası"],
    responsible_team: "ilk_yardim",
    procedures: [
      "1. Semptom gösteren kişiyi izole et",
      "2. 184 ALO Sağlık Bakanlığı'nı ara",
      "3. Temaslı kişileri tespit et, takip et",
      "4. Ortak alanları dezenfekte et",
      "5. Mesafe kuralını uygula (min. 1.5m)",
      "6. Maske, hijyen kurallarını sıkılaştır",
      "7. Gerekirse uzaktan çalışma modeline geç"
    ]
  },
  {
    id: "siddetli_hava",
    name: "Fırtına / Şiddetli Hava",
    icon: "🌪️",
    selected: false,
    risk_level: "medium",
    estimated_duration: 20,
    required_equipment: ["Jeneratör", "El feneri", "Battaniye", "Su bidonu"],
    responsible_team: "koruma",
    procedures: [
      "1. Meteoroloji uyarılarını takip et",
      "2. Dış mekanlardaki personeli içeri al",
      "3. Pencere ve kapıları kapat, bantla",
      "4. Elektrik kesintisine hazırlıklı ol",
      "5. Yüksek nesnelerden (ağaç, baca) uzak dur",
      "6. Fırtına geçene kadar binada kal"
    ]
  }
];

// adep.ts dosyasının en altına ekle:

export const TEAM_REQUIREMENTS = {
  sondurme: { min: 3, label: "Söndürme Ekibi" },
  kurtarma: { min: 3, label: "Kurtarma Ekibi" },
  koruma: { min: 2, label: "Koruma Ekibi" },
  ilk_yardim: { min: 2, label: "İlk Yardım Ekibi" }
};

export const DEFAULT_SCENARIOS = ADVANCED_SCENARIOS;