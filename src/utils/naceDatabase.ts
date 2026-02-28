export interface NACECode {
  code: string;
  name: string;
  hazard_class: "Az Tehlikeli" | "Tehlikeli" | "Çok Tehlikeli";
  industry_sector: string;
}

export const NACE_DATABASE: NACECode[] = [
  // Çok Tehlikeli
  { code: "05.10", name: "Taş kömürü madenciliği", hazard_class: "Çok Tehlikeli", industry_sector: "mining" },
  { code: "06.10", name: "Ham petrol çıkarımı", hazard_class: "Çok Tehlikeli", industry_sector: "mining" },
  { code: "08.11", name: "Süsleme ve yapı taşı, kireç taşı, alçı taşı, tebeşir ve kayağantaşı (arduvaz) madenciliği", hazard_class: "Çok Tehlikeli", industry_sector: "mining" },
  { code: "24.10", name: "Ana demir ve çelik ürünleri ile ferro alaşımların imalatı", hazard_class: "Çok Tehlikeli", industry_sector: "manufacturing" },
  { code: "24.20", name: "Çelik tüplerin, boruların, içi boş profillerin ve benzeri bağlantı parçalarının imalatı", hazard_class: "Çok Tehlikeli", industry_sector: "manufacturing" },
  { code: "41.10", name: "Bina inşaat projelerinin geliştirilmesi", hazard_class: "Çok Tehlikeli", industry_sector: "construction" },
  { code: "41.20", name: "İkamet amaçlı olan veya olmayan binaların inşaatı", hazard_class: "Çok Tehlikeli", industry_sector: "construction" },
  { code: "42.11", name: "Karayolları ve demiryollarının inşaatı", hazard_class: "Çok Tehlikeli", industry_sector: "construction" },
  { code: "42.13", name: "Köprü ve tünel inşaatı", hazard_class: "Çok Tehlikeli", industry_sector: "construction" },
  { code: "43.11", name: "Yıkım", hazard_class: "Çok Tehlikeli", industry_sector: "construction" },
  { code: "43.12", name: "İnşaat sahası hazırlık faaliyetleri", hazard_class: "Çok Tehlikeli", industry_sector: "construction" },
  { code: "49.10", name: "Şehirlerarası demiryolu yolcu taşımacılığı", hazard_class: "Çok Tehlikeli", industry_sector: "transportation" },
  { code: "49.31", name: "Kara taşımacılığıyla yapılan yolcu taşımacılığı", hazard_class: "Çok Tehlikeli", industry_sector: "transportation" },

  // Tehlikeli
  { code: "10.11", name: "Et işleme ve saklaması", hazard_class: "Tehlikeli", industry_sector: "manufacturing" },
  { code: "10.51", name: "Süt işleme ve peynir imalatı", hazard_class: "Tehlikeli", industry_sector: "manufacturing" },
  { code: "13.10", name: "Tekstil elyafının hazırlanması ve bükülmesi", hazard_class: "Tehlikeli", industry_sector: "manufacturing" },
  { code: "16.10", name: "Ağaç, ağaç ve mantar ürünlerinin biçilmesi, planyalanması ve emprenye edilmesi", hazard_class: "Tehlikeli", industry_sector: "manufacturing" },
  { code: "23.51", name: "Çimento imalatı", hazard_class: "Tehlikeli", industry_sector: "manufacturing" },
  { code: "25.11", name: "Metal yapı ve metal yapı parçalarının imalatı", hazard_class: "Tehlikeli", industry_sector: "manufacturing" },
  { code: "26.11", name: "Elektronik bileşenlerin imalatı", hazard_class: "Tehlikeli", industry_sector: "manufacturing" },
  { code: "27.11", name: "Elektrik motoru, jeneratör ve transformatör imalatı", hazard_class: "Tehlikeli", industry_sector: "manufacturing" },
  { code: "28.11", name: "Motor ve türbinlerin imalatı", hazard_class: "Tehlikeli", industry_sector: "manufacturing" },
  { code: "29.10", name: "Motorlu kara taşıtı imalatı", hazard_class: "Tehlikeli", industry_sector: "manufacturing" },
  { code: "35.11", name: "Elektrik enerjisinin üretimi", hazard_class: "Tehlikeli", industry_sector: "energy" },
  { code: "38.11", name: "Tehlikesiz atıkların toplanması", hazard_class: "Tehlikeli", industry_sector: "waste" },
  { code: "52.10", name: "Depolama ve ambarcılık", hazard_class: "Tehlikeli", industry_sector: "logistics" },

  // Az Tehlikeli
  { code: "45.11", name: "Motorlu kara taşıtlarının ticareti (satış)", hazard_class: "Az Tehlikeli", industry_sector: "office" },
  { code: "46.11", name: "Tarımsal hammadde, canlı hayvan, tekstil hammaddesi ve yarı mamul ürünlerinin ticaretinde aracılık", hazard_class: "Az Tehlikeli", industry_sector: "office" },
  { code: "47.11", name: "Gıda ürünleri, içecek ve tütün satışının yapıldığı perakende mağazalar", hazard_class: "Az Tehlikeli", industry_sector: "retail" },
  { code: "55.10", name: "Oteller ve benzeri konaklama yerleri", hazard_class: "Az Tehlikeli", industry_sector: "hospitality" },
  { code: "56.10", name: "Lokantalar ve seyyar yemek hizmeti faaliyetleri", hazard_class: "Az Tehlikeli", industry_sector: "hospitality" },
  { code: "58.11", name: "Kitap yayımı", hazard_class: "Az Tehlikeli", industry_sector: "office" },
  { code: "62.01", name: "Bilgisayar programlama faaliyetleri", hazard_class: "Az Tehlikeli", industry_sector: "office" },
  { code: "63.11", name: "Veri işleme, barındırma (hosting) ve ilgili faaliyetler", hazard_class: "Az Tehlikeli", industry_sector: "office" },
  { code: "64.19", name: "Diğer parasal aracılık", hazard_class: "Az Tehlikeli", industry_sector: "office" },
  { code: "64.92", name: "Diğer kredi verme", hazard_class: "Az Tehlikeli", industry_sector: "office" },
  { code: "65.11", name: "Hayat sigortası", hazard_class: "Az Tehlikeli", industry_sector: "office" },
  { code: "66.11", name: "Finansal piyasa yönetimi", hazard_class: "Az Tehlikeli", industry_sector: "office" },
  { code: "68.10", name: "Kendi mülkünün alınıp satılması", hazard_class: "Az Tehlikeli", industry_sector: "real_estate" },
  { code: "69.10", name: "Hukuk faaliyetleri", hazard_class: "Az Tehlikeli", industry_sector: "office" },
  { code: "70.10", name: "İdare faaliyetleri", hazard_class: "Az Tehlikeli", industry_sector: "office" },
  { code: "71.11", name: "Mimarlık faaliyetleri", hazard_class: "Az Tehlikeli", industry_sector: "office" },
  { code: "72.11", name: "Biyoteknoloji alanında araştırma ve deneysel geliştirme faaliyetleri", hazard_class: "Az Tehlikeli", industry_sector: "office" },
  { code: "73.11", name: "Reklam ajanslarının faaliyetleri", hazard_class: "Az Tehlikeli", industry_sector: "office" },
  { code: "74.10", name: "Uzmanlaşmış tasarım faaliyetleri", hazard_class: "Az Tehlikeli", industry_sector: "office" },
  { code: "85.10", name: "Okul öncesi eğitim", hazard_class: "Az Tehlikeli", industry_sector: "education" },
  { code: "86.10", name: "Hastane faaliyetleri", hazard_class: "Az Tehlikeli", industry_sector: "healthcare" },
];

export function searchNACE(query: string): NACECode[] {
  const lowerQuery = query.toLowerCase();
  return NACE_DATABASE.filter(
    nace =>
      nace.code.includes(query) ||
      nace.name.toLowerCase().includes(lowerQuery)
  ).slice(0, 10); // İlk 10 sonuç
}