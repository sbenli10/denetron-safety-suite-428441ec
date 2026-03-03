// src/services/geminiService.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const MODEL_NAME = import.meta.env.VITE_GOOGLE_MODEL || "gemini-2.5-flash";

if (!API_KEY) {
  console.error("❌ VITE_GOOGLE_API_KEY bulunamadı!");
}

const genAI = new GoogleGenerativeAI(API_KEY);

export interface GeminiRiskResult {
  hazard: string;
  risk: string;
  category: string;
  probability: number;
  frequency: number;
  severity: number;
  controls: string[];
}

/**
 * Sektöre özgü risk örnekleri oluşturur
 */
function getSectorSpecificExamples(sector: string): string {
  const sectorLower = sector.toLowerCase();

  if (sectorLower.includes("otomotiv") || sectorLower.includes("fabrika") || sectorLower.includes("üretim")) {
    return `
✅ OTOMOTİV SEKTÖRÜNE ÖZGÜ RİSKLER:
- Forklift ve yaya çarpışması (Araç Güvenliği)
- Pres makinesinde el sıkışması (Makine Güvenliği)
- Kaynak dumanı ve UV maruziyeti (Kimyasal/Fiziksel)
- Boya kabininde VOC maruziyeti (Kimyasal)
- Montaj hattında tekrarlı hareketler (Ergonomi)
- Manuel parça taşıma (25kg+) (Ergonomi)
- Makine gürültüsü (>85 dB) (Fiziksel)
- Elektrikli el aletleri (Elektrik)
- Yağ sızıntılarından kayma (Kayma/Düşme)
- Robotik kollarla çalışma (Otomasyon)

❌ YAZMAMALISIN (Bunlar başka sektörlere ait):
- İskele kurulumu (İNŞAAT)
- Yüksekten düşme (İNŞAAT)
- Kazı çalışmaları (İNŞAAT)
- Soğuk hava deposu (GIDA)
- Kesici bıçaklar (GIDA)`;
  }

  if (sectorLower.includes("inşaat") || sectorLower.includes("şantiye") || sectorLower.includes("yapı")) {
    return `
✅ İNŞAAT SEKTÖRÜNE ÖZGÜ RİSKLER:
- Yüksekten düşme (iskele, çatı kenarı) (Düşme)
- İskele çökmesi veya devrilmesi (Yapısal)
- Kazı göçüğü ve gömülme (Toprak İşleri)
- Vinç operasyonu, yük düşmesi (Makine)
- Elektrik hattına dokunma (Elektrik)
- Silika tozu solunması (kesim, delme) (Sağlık)
- Beton pompası kazaları (Makine)
- Çatı çalışmalarında düşme (Düşme)

❌ YAZMAMALISIN:
- Forklift (OTOMOTİV/LOJİSTİK)
- Kaynak işleri (METAL/OTOMOTİV)
- Soğuk hava deposu (GIDA)`;
  }

  if (sectorLower.includes("gıda") || sectorLower.includes("mutfak") || sectorLower.includes("restoran")) {
    return `
✅ GIDA SEKTÖRÜNE ÖZGÜ RİSKLER:
- Kesici bıçaklarla yaralanma (Kesme)
- Kaygan zemin (su, yağ, gıda artıkları) (Kayma)
- Sıcak yüzeyler, buhar yanığı (Yanık)
- Soğuk hava deposu (-25°C) (Termal)
- Mikrobiyolojik kontaminasyon (Biyolojik)
- Fırın ve ocak yanıkları (Yanık)
- Manuel taşıma (kasalar, çuvallar) (Ergonomi)
- Temizlik kimyasalları (Kimyasal)

❌ YAZMAMALISIN:
- Pres makinesi (OTOMOTİV/METAL)
- İskele (İNŞAAT)
- Kaynak (METAL)`;
  }

  if (sectorLower.includes("metal") || sectorLower.includes("kaynak") || sectorLower.includes("çelik")) {
    return `
✅ METAL SEKTÖRÜNE ÖZGÜ RİSKLER:
- Kaynak dumanı ve UV ışınları (Kimyasal/Fiziksel)
- Pres ve kesme makineleri (Makine)
- Metal talaş (göze kaçma) (Fiziksel)
- Taşlama ve kesme (Makine)
- Ergonomik olmayan pozisyonlar (Ergonomi)
- Gürültü (taşlama, kesme >85 dB) (Fiziksel)
- Sıcak metal temas (Yanık)

❌ YAZMAMALISIN:
- Yüksekten düşme (İNŞAAT)
- Soğuk hava deposu (GIDA)`;
  }

  if (sectorLower.includes("tekstil") || sectorLower.includes("dokuma") || sectorLower.includes("giyim")) {
    return `
✅ TEKSTİL SEKTÖRÜNE ÖZGÜ RİSKLER:
- Dikiş makinesi iğnesi yaralanması (Makine)
- Kesici aletler (makas, jilet) (Kesme)
- Dokuma tezgahlarında sıkışma (Makine)
- Tekrarlı hareketler (Ergonomi)
- Toz ve lifler (Solunum)
- Boya ve kimyasallar (Kimyasal)
- Gürültü (makineler) (Fiziksel)`;
  }

  if (sectorLower.includes("kimya") || sectorLower.includes("ilaç") || sectorLower.includes("boya")) {
    return `
✅ KİMYA SEKTÖRÜNE ÖZGÜ RİSKLER:
- Kimyasal maruziyeti (soluma, cilt teması) (Kimyasal)
- Yanıcı/parlayıcı madde yangını (Yangın)
- Reaktif madde patlaması (Patlama)
- Asit/baz sıçraması (Yanık)
- Zehirli gaz solunması (Sağlık)
- Basınçlı sistemler (Patlama)`;
  }

  if (sectorLower.includes("lojistik") || sectorLower.includes("depo") || sectorLower.includes("ambarcılık")) {
    return `
✅ LOJİSTİK SEKTÖRÜNE ÖZGÜ RİSKLER:
- Forklift kazaları (çarpma, ezilme) (Araç)
- Raf yıkılması, yük düşmesi (Yapısal)
- Manuel yük taşıma (Ergonomi)
- Yüksekten mal düşmesi (Düşen Nesne)
- Kamyon yükleme/boşaltma (Araç)`;
  }

  if (sectorLower.includes("enerji") || sectorLower.includes("elektrik") || sectorLower.includes("güneş")) {
    return `
✅ ENERJİ SEKTÖRÜNE ÖZGÜ RİSKLER:
- Elektrik çarpması (yüksek voltaj) (Elektrik)
- Ark parlama yanığı (Elektrik)
- Yüksekten düşme (direk, panel montajı) (Düşme)
- Patlama riski (trafo, pano) (Patlama)`;
  }

  if (sectorLower.includes("maden") || sectorLower.includes("taş") || sectorLower.includes("ocak")) {
    return `
✅ MADEN SEKTÖRÜNE ÖZGÜ RİSKLER:
- Göçük ve gömülme (Yapısal)
- Patlayıcı madde kazaları (Patlama)
- Zehirli gaz solunması (Sağlık)
- Toz maruziyeti (silikoz) (Sağlık)
- Makine sıkışması (Makine)
- Yüksekten düşme (Düşme)`;
  }

  if (sectorLower.includes("sağlık") || sectorLower.includes("hastane") || sectorLower.includes("klinik")) {
    return `
✅ SAĞLIK SEKTÖRÜNE ÖZGÜ RİSKLER:
- Kesici-delici alet yaralanması (iğne, bistüri) (Biyolojik)
- Kan ve vücut sıvılarına maruziyet (Biyolojik)
- Radyasyon (röntgen, MR) (Fiziksel)
- Kimyasal maruziyeti (dezenfektan, ilaç) (Kimyasal)
- Hasta taşıma (Ergonomi)
- Şiddet (hasta/yakını) (Psikososyal)`;
  }

  if (sectorLower.includes("ofis") || sectorLower.includes("büro") || sectorLower.includes("yazılım")) {
    return `
✅ OFİS SEKTÖRÜNE ÖZGÜ RİSKLER:
- Bilgisayar başında uzun süre çalışma (Ergonomi)
- Göz yorgunluğu (Fiziksel)
- Elektrik prizlerinden çarpma (Elektrik)
- Yangın (elektrikli cihazlar) (Yangın)
- Stres ve tükenmişlik (Psikososyal)
- Kayma (kablolar) (Düşme)`;
  }

  if (sectorLower.includes("tarım") || sectorLower.includes("çiftlik") || sectorLower.includes("hayvancılık")) {
    return `
✅ TARIM SEKTÖRÜNE ÖZGÜ RİSKLER:
- Tarım makineleri (traktör, biçerdöver) (Makine)
- Pestisit maruziyeti (Kimyasal)
- Hayvan saldırısı (Biyolojik)
- Güneş çarpması (Fiziksel)
- Manuel yük taşıma (Ergonomi)
- Zoonotik hastalıklar (Biyolojik)`;
  }

  if (sectorLower.includes("turizm") || sectorLower.includes("otel") || sectorLower.includes("konaklama")) {
    return `
✅ TURİZM SEKTÖRÜNE ÖZGÜ RİSKLER:
- Kayma (ıslak zemin, havuz kenarı) (Düşme)
- Yanık (mutfak, sıcak su) (Yanık)
- Kimyasal maruziyeti (temizlik ürünleri) (Kimyasal)
- Elektrik (nemli ortamda cihazlar) (Elektrik)
- Yangın (mutfak, tesisat) (Yangın)
- Müşteri şiddeti (Psikososyal)`;
  }

  if (sectorLower.includes("perakende") || sectorLower.includes("market") || sectorLower.includes("mağaza")) {
    return `
✅ PERAKENDE SEKTÖRÜNE ÖZGÜ RİSKLER:
- Raf yıkılması (Düşen Nesne)
- Manuel yük taşıma (kasalar) (Ergonomi)
- Kayma (ıslak zemin) (Düşme)
- Soygun/şiddet (Psikososyal)
- Soğuk hava deposu (market) (Termal)
- Elektrik (ekipman) (Elektrik)`;
  }

  // Genel şablon (bilinmeyen sektörler için)
  return `
✅ BU SEKTÖRE ÖZGÜ RİSKLERİ BELİRLE:
- İlgili makineler ve ekipmanlar
- Kullanılan kimyasal maddeler
- Fiziksel etkenler (gürültü, titreşim, sıcaklık)
- Ergonomik riskler
- Elektrik riskleri
- Yangın/patlama riskleri
- Biyolojik riskler (varsa)
- Psikososyal riskler`;
}

/**
 * Google Gemini ile sektöre özgü risk analizi yapar
 */
export async function generateRisksWithGemini(
  sector: string,
  companyName?: string
): Promise<GeminiRiskResult[]> {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const sectorExamples = getSectorSpecificExamples(sector);

const prompt = `Sen Türkiye'de 15+ yıl deneyimli, Fine-Kinney metodunda uzman bir İSG (İş Sağlığı ve Güvenliği) mühendisisin. 6331 sayılı İSG Kanunu ve tüm ilgili yönetmeliklere hakimsin.

═══════════════════════════════════════════════════════════════
                    GÖREV TALİMATI
═══════════════════════════════════════════════════════════════

"${sector}" sektöründe faaliyet gösteren ${companyName ? `"${companyName}"` : "bir"} firması için KAPSAMLI ve PROFESYONELbir Fine-Kinney risk değerlendirmesi hazırla.

SEKTÖR: ${sector.toUpperCase()}
HEDEF: Minimum 30, maksimum 40 FARKLI risk maddesi
STANDART: Türkiye İSG Mevzuatı + Uluslararası ISO 45001

═══════════════════════════════════════════════════════════════
                SEKTÖRE ÖZGÜ RİSK REHBERİ
═══════════════════════════════════════════════════════════════

${sectorExamples}

═══════════════════════════════════════════════════════════════
                   KRİTİK KURALLAR
═══════════════════════════════════════════════════════════════

✅ MUTLAKA YAP:
  1. SADECE "${sector}" sektörüne özgü riskleri belirle
  2. Her risk için FARKLI bir tehlike/aktivite ele al
  3. 30-40 adet TEKRARSIZ risk maddesi oluştur
  4. Aşağıdaki 10 kategoriyi DENGELI dağıt:
     • Makine Güvenliği (en az 6 risk)
     • Kimyasal Riskler (en az 4 risk)
     • Fiziksel Etkenler (en az 4 risk)
     • Ergonomi (en az 4 risk)
     • Elektrik Güvenliği (en az 3 risk)
     • Yangın/Patlama (en az 3 risk)
     • Kayma/Düşme (en az 3 risk)
     • Psikososyal (en az 2 risk)
     • Acil Durumlar (en az 2 risk)
     • Diğer Sektörel (en az 5 risk)
  5. Her risk için GERÇEKÇI O-F-Ş değerleri kullan
  6. Türkiye İSG mevzuatına (6331 sayılı kanun) uygun önlemler öner

❌ ASLA YAPMA:
  1. Başka sektörlerin risklerini yazma (yukarıdaki ❌ işaretli örneklere DİKKAT)
  2. Aynı riski farklı isimlerle tekrarlama
  3. Genel/belirsiz ifadeler kullanma ("makine kazası" gibi)
  4. Mantıksız O-F-Ş değerleri verme (örn: O:10, F:10, Ş:100)

═══════════════════════════════════════════════════════════════
              FINE-KINNEY METODOLOJİSİ
════════════════════════���══════════════════════════════════════

FORMÜL: Risk Skoru (R) = Olasılık (O) × Frekans (F) × Şiddet (Ş)

┌─────────────────────────────────────────────────────────────┐
│ OLASILIK (O) - Bu tehlike ne sıklıkla gerçekleşebilir?     │
├─────────────────────────────────────────────────────────────┤
│  10  │ Bekleniyor (kesinlikle olacak)                       │
│   6  │ Oldukça mümkün (sıklıkla görülür)                    │
│   3  │ Mümkün fakat nadir (bazen olabilir)                  │
│   1  │ Mümkün değil (çok düşük ihtimal)                     │
│ 0.5  │ Pratik olarak imkansız                               │
│ 0.2  │ Düşünülemez (teorik risk)                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────��───────────────────┐
│ FREKANS (F) - Tehlikeye ne sıklıkla maruz kalınıyor?       │
├─────────────────────────────────────────────────────────────┤
│  10  │ Sürekli (her vardiya, her gün)                       │
│   6  │ Sık sık (günde birkaç kez)                           │
│   3  │ Ara sıra (haftada bir)                               │
│   2  │ Seyrek (ayda bir)                                    │
│   1  │ Çok nadir (yılda bir)                                │
│ 0.5  │ Çok seyrek (yıllar arasında)                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ŞİDDET (Ş) - Olası en kötü sonuç nedir?                    │
├─────────────────────────────────────────────────────────────┤
│ 100  │ Çok sayıda ölüm (toplu kaza)                         │
│  40  │ Ölüm (tek kişi)                                      │
│  15  │ Çok ciddi yaralanma (kalıcı iş göremezlik, uzuv)    │
│   7  │ Ciddi yaralanma (tedavi, iş günü kaybı)             │
│   3  │ Hafif yaralanma (ilk yardım gerektiren)             │
│   1  │ Çok hafif (yara bandı yeterli)                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ RİSK SINIFI                                                 │
├─────────────────────────────────────────────────────────────┤
│ R > 400      │ ÇOK YÜKSEK   │ Derhal durdur             │
│ 200-400      │ YÜKSEK       │ Acil önlem al             │
│ 70-199       │ ÖNEMLİ       │ Kısa vadede çöz           │
│ 20-69        │ OLASI        │ Planlı önlem              │
│ R < 20       │ KABULEDİLEBİLİR │ İzle ve gözden geçir │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════
                ÇIKTI FORMATI (JSON)
═══════════════════════════════════════════════════════════════

UYARI: Sadece JSON array döndür. Markdown (\`\`\`json), açıklama, 
       başlık KULLANMA. Direkt [ ile başla, ] ile bitir.

[
  {
    "hazard": "SPESİFİK tehlike tanımı (makine/ekipman/işlem adı ile)",
    "risk": "DETAYLI olası zararlar (yaralanma türü, etkilenen organ, hastalık adı)",
    "category": "NET kategori (örn: Makine Güvenliği - Pres, Kimyasal - Solvent)",
    "probability": 6,
    "frequency": 6,
    "severity": 15,
    "controls": [
      "ÖNLEM 1: TEKNİK/MÜHENDİSLİK - Spesifik ekipman/sistem adı, nasıl uygulanacağı",
      "ÖNLEM 2: İDARİ/ORGANİZASYONEL - Prosedür, eğitim, periyot, sorumluluk",
      "ÖNLEM 3: KİŞİSEL KORUYUCU DONANIM - Spesifik KKD türü + hangi yönetmelik/standart (örn: EN 388, KKD Yönetmeliği Md.5)"
    ]
  }
]

═══════════════════════════════════════════════════════════════
              KALITE KONTROL ÖRNEKLERİ
═══════════════════════════════════════════════════════════════

❌ KÖTÜ ÖRNEK (Genel, belirsiz, kullanılamaz):
{
  "hazard": "Makine kazası",
  "risk": "Yaralanma",
  "category": "Makine",
  "probability": 5,
  "frequency": 5,
  "severity": 10,
  "controls": [
    "Dikkatli olunmalı",
    "Eğitim verilmeli",
    "KKD kullanılmalı"
  ]
}

✅ İYİ ÖRNEK (Spesifik, uygulanabilir, profesyonel):
{
  "hazard": "CNC torna tezgahında 3000 rpm'de dönen iş parçasından metal talaş fırlaması",
  "risk": "Göze yüksek hızda metal talaş kaçması sonucu kornea hasarı, retina yaralanması, kalıcı görme kaybı (tek veya çift göz)",
  "category": "Makine Güvenliği - CNC Torna",
  "probability": 6,
  "frequency": 10,
  "severity": 15,
  "controls": [
    "TEKNİK: CNC torna tezgahlarına 8mm kalınlığında şeffaf polikarbon tam çevrili koruyucu muhafaza montajı, talaş toplama vakum sistemi entegrasyonu ve tezgah kapağı açıkken otomatik durdurma sensörü kurulumu",
    "İDARİ: Torna operatörlerinin her vardiya başında koruyucu muhafazaların kapalı olduğunu kontrol etmesi (CW-TOR-01 çalışma talimatı), aylık makine emniyet kontrol formlarının doldurulması, yılda 2 kez Makine Emniyeti Yönetmeliği eğitimi",
    "KKD: EN 166 standardına uygun darbe dayanımlı (S işaretli) iş gözlüğü veya EN 166 / EN 170 tam yüz siperi kullanımı (Kişisel Koruyucu Donanım Yönetmeliği Madde 4-5, İş Ekipmanları Yönetmeliği EK-II)"
  ]
}

═══════════════════════════════════════════════════════════════
                   SON KONTROL LİSTESİ
═══════════════════════════════════════════════════════════════

Gönderme ÖNCESINDE kontrol et:
☐ 30-40 adet FARKLI risk var mı?
☐ Sadece "${sector}" sektörüne özgü mü?
☐ Her kategori dengeli dağıtılmış mı?
☐ O-F-Ş değerleri mantıklı mı?
☐ Önlemler UYGULANABILIR mi?
☐ Mevzuat referansları var mı?
☐ JSON formatı doğru mu?
☐ Markdown/açıklama YOK mu?

═══════════════════════════════════════════════════════════════

ŞİMDİ BAŞLA: Sadece JSON array döndür.`;

    console.log("🤖 Gemini'ye gönderilen prompt:", prompt.substring(0, 500) + "...");

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("🤖 Gemini Raw Response:", text);

    // Parse JSON
    let jsonText = text.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    // Try to extract JSON array
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("❌ JSON bulunamadı. Raw text:", text);
      throw new Error("Gemini'den geçerli JSON dönmedi");
    }

    const risks: GeminiRiskResult[] = JSON.parse(jsonMatch[0]);

    // Validate risks
    if (!Array.isArray(risks) || risks.length === 0) {
      throw new Error("Geçersiz risk listesi (boş veya array değil)");
    }

    console.log(`📊 ${risks.length} risk parse edildi`);

    // ✅ Sektör uygunluğu kontrolü
    const sectorLower = sector.toLowerCase();
    const invalidRisks = risks.filter(risk => {
      const hazardLower = risk.hazard.toLowerCase();
      
      // Otomotiv için inşaat riski kontrolü
      if (sectorLower.includes('otomotiv') || sectorLower.includes('fabrika') || sectorLower.includes('üretim')) {
        if (
          hazardLower.includes('iskele') || 
          hazardLower.includes('yüksekte') ||
          hazardLower.includes('yüksekten') ||
          hazardLower.includes('kazı') || 
          hazardLower.includes('ekskavatör') ||
          hazardLower.includes('loder') ||
          hazardLower.includes('göçük') ||
          hazardLower.includes('çatı')
        ) {
          return true;
        }
      }

      // Gıda için otomotiv/metal riski kontrolü
      if (sectorLower.includes('gıda') || sectorLower.includes('mutfak')) {
        if (
          hazardLower.includes('kaynak') && !hazardLower.includes('kontaminasyon') ||
          hazardLower.includes('pres') && !hazardLower.includes('basınç') ||
          hazardLower.includes('forklift') ||
          hazardLower.includes('montaj hattı') ||
          hazardLower.includes('talaş')
        ) {
          return true;
        }
      }

      // İnşaat için gıda riski kontrolü
      if (sectorLower.includes('inşaat') || sectorLower.includes('şantiye')) {
        if (
          hazardLower.includes('soğuk hava') ||
          hazardLower.includes('bıçak') ||
          hazardLower.includes('kesici alet')
        ) {
          return true;
        }
      }

      return false;
    });

    if (invalidRisks.length > 0) {
      console.warn(`⚠️ ${invalidRisks.length} risk sektöre uygun değil, kaldırılıyor:`);
      invalidRisks.forEach(r => console.warn(`   - ${r.hazard}`));
      
      const validRisks = risks.filter(risk => !invalidRisks.includes(risk));
      
      if (validRisks.length === 0) {
        throw new Error("Tüm riskler yanlış sektöre ait. Lütfen tekrar deneyin.");
      }
      
      console.log(`✅ ${validRisks.length} geçerli risk kaldı`);
      return validRisks;
    }

    // Validate each risk
    risks.forEach((risk, idx) => {
      if (!risk.hazard || !risk.risk) {
        throw new Error(`Risk #${idx + 1} eksik: 'hazard' veya 'risk' alanı boş`);
      }
      if (typeof risk.probability !== 'number' || typeof risk.frequency !== 'number' || typeof risk.severity !== 'number') {
        throw new Error(`Risk #${idx + 1} eksik: O/F/Ş değerleri sayı olmalı`);
      }
      if (risk.probability <= 0 || risk.frequency <= 0 || risk.severity <= 0) {
        throw new Error(`Risk #${idx + 1} hatalı: O/F/Ş değerleri 0'dan büyük olmalı`);
      }
      if (!Array.isArray(risk.controls) || risk.controls.length === 0) {
        throw new Error(`Risk #${idx + 1} eksik: en az 1 önlem olmalı`);
      }
    });

    console.log(`✅ Gemini ${risks.length} geçerli risk üretti (${sector})`);
    return risks;

  } catch (error: any) {
    console.error("❌ Gemini API error:", error);
    
    if (error.message?.includes("API key") || error.message?.includes("API_KEY_INVALID")) {
      throw new Error("Google API key geçersiz veya eksik (.env dosyasını kontrol edin)");
    }
    
    if (error.message?.includes("quota") || error.message?.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("Gemini API kotası doldu. Lütfen birkaç dakika sonra tekrar deneyin.");
    }
    
    if (error.message?.includes("safety") || error.message?.includes("SAFETY")) {
      throw new Error("Gemini güvenlik filtresi devreye girdi. Lütfen farklı bir sektör ifadesi deneyin.");
    }

    if (error instanceof SyntaxError) {
      throw new Error("Gemini geçersiz JSON döndü. Lütfen tekrar deneyin.");
    }
    
    throw error;
  }
}

export async function generateRisksWithGeminiPro(
  sector: string,
  companyName?: string
): Promise<GeminiRiskResult[]> {
  const MODEL_ROBUST = import.meta.env.VITE_GOOGLE_MODEL_ROBUST || "gemini-2.5-pro";
  console.log(`🧠 Using robust model: ${MODEL_ROBUST}`);
  const robustModel = genAI.getGenerativeModel({ model: MODEL_ROBUST });  
  return generateRisksWithGemini(sector, companyName);
}