export interface CompanyInfo {
  firma_adi: string;
  adres: string;
  tehlike_sinifi: "Çok Tehlikeli" | "Tehlikeli" | "Az Tehlikeli";
  calisan_sayisi: number;
  logo_url?: string;
}

export interface TeamMember {
  id: string;
  ad_soyad: string;
  gorev: string;
  telefon: string;
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
}

export interface BlueprintData {
  image_url?: string;
  analysis_result?: any; // Blueprint analysis sonucu
}

export interface ADEPData {
  company_info: CompanyInfo;
  teams: EmergencyTeams;
  scenarios: Scenario[];
  blueprint: BlueprintData;
}

// Mevzuat gereksinimleri
export const TEAM_REQUIREMENTS = {
  "Çok Tehlikeli": {
    sondurme: { per: 20, min: 3 },
    kurtarma: { per: 30, min: 2 },
    koruma: { per: 40, min: 2 },
    ilk_yardim: { per: 50, min: 2 }
  },
  "Tehlikeli": {
    sondurme: { per: 30, min: 2 },
    kurtarma: { per: 50, min: 2 },
    koruma: { per: 60, min: 1 },
    ilk_yardim: { per: 70, min: 1 }
  },
  "Az Tehlikeli": {
    sondurme: { per: 50, min: 1 },
    kurtarma: { per: 80, min: 1 },
    koruma: { per: 100, min: 1 },
    ilk_yardim: { per: 100, min: 1 }
  }
};

export const DEFAULT_SCENARIOS: Scenario[] = [
  {
    id: "yangin",
    name: "Yangın",
    icon: "🔥",
    selected: false,
    procedures: [
      "Yangın algılama sistemini devreye alın",
      "Acil çıkış kapılarını açın",
      "Söndürme ekibini alarma geçirin",
      "İtfaiyeyi arayın (110)",
      "Personeli tahliye edin",
      "Toplanma alanına yönlendirin"
    ]
  },
  {
    id: "deprem",
    name: "Deprem",
    icon: "🏚️",
    selected: false,
    procedures: [
      "Çök-Kapan-Tutun talimatı verin",
      "Sarsıntı bittikten sonra tahliye başlatın",
      "Asansör kullanmayın",
      "Gaz vanalarını kapatın",
      "Bina hasarını kontrol edin",
      "Toplanma alanında sayım yapın"
    ]
  },
  {
    id: "sel",
    name: "Su Baskını/Sel",
    icon: "🌊",
    selected: false,
    procedures: [
      "Elektrik panosunu kapatın",
      "Alt katları tahliye edin",
      "Üst katlara çıkın",
      "AFAD'ı arayın (122)",
      "Su seviyesini izleyin",
      "Kurtarma ekibini bekleyin"
    ]
  },
  {
    id: "kimyasal",
    name: "Kimyasal Sızıntı",
    icon: "☣️",
    selected: false,
    procedures: [
      "Tehlikeli maddeyi izole edin",
      "Havalandırma sistemini durdurun",
      "KKD'yi giyin",
      "Sızıntıyı kontrol altına alın",
      "Etkilenen personeli tahliye edin",
      "112 Acil Servisi arayın"
    ]
  },
  {
    id: "gaz_sizinti",
    name: "Gaz Sızıntısı",
    icon: "💨",
    selected: false,
    procedures: [
      "Ana gaz vanasını kapatın",
      "Elektrik anahtarlarına dokunmayın",
      "Kapı ve pencereleri açın",
      "Binayı tahliye edin",
      "Gaz şirketini arayın",
      "Uzaktan bekleme yapın"
    ]
  },
  {
    id: "bomba_ihbari",
    name: "Bomba İhbarı",
    icon: "💣",
    selected: false,
    procedures: [
      "Sakin kalın, paniğe kapılmayın",
      "İhbarı ciddiye alın",
      "Polisi arayın (155)",
      "Sessiz tahliye başlatın",
      "Şüpheli eşyalara dokunmayın",
      "Güvenli mesafede bekleyin"
    ]
  }
];