import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BlueprintAnalysisResult {
  project_info: {
    area_type: string;
    detected_floor: number;
    building_category: string;
    estimated_area_sqm: number;
  };
  equipment_inventory: Array<{
    type: "extinguisher" | "exit" | "hydrant" | "first_aid" | "assembly_point";
    count: number;
    locations: string[];
    adequacy_status: "sufficient" | "insufficient" | "excessive";
  }>;
  safety_violations: Array<{
    issue: string;
    regulation_reference: string;
    severity: "critical" | "warning" | "info";
    recommended_action: string;
  }>;
  expert_suggestions: string[];
  compliance_score: number;
}

/**
 * ✅ JSON Parse Helper - Truncated ve geçersiz JSON'ları düzeltir
 */
/**
 * ✅ JSON Parse Helper - Kesik JSON'ları akıllıca tamamlar
 */
/**
 * ✅ JSON Parse Helper - Kesik JSON'ları akıllıca tamamlar
 */
function parseAIResponse(contentText: string, requestId: string): BlueprintAnalysisResult {
  console.log(`📦 [${requestId}] Ham yanıt uzunluğu: ${contentText.length} karakter`);
  console.log(`📄 [${requestId}] Tam içerik:\n${contentText}`);
  
  try {
    let cleaned = contentText;
    
    // 1. Markdown temizliği
    cleaned = cleaned.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    console.log(`🔧 [${requestId}] Markdown temizlendi`);
    
    // 2. JSON objesini bul
    const jsonStart = cleaned.indexOf('{');
    if (jsonStart === -1) {
      throw new Error("JSON başlangıcı bulunamadı");
    }
    cleaned = cleaned.substring(jsonStart);
    console.log(`🔧 [${requestId}] JSON başlang��cı tespit edildi`);
    
    // ✅ 3. SON TAMAMLANMAMIŞ PROPERTY'Yİ SİL
    const lastOpenBracket = cleaned.lastIndexOf('[');
    const lastCloseBracket = cleaned.lastIndexOf(']');
    
    if (lastOpenBracket > lastCloseBracket) {
      console.warn(`⚠️  [${requestId}] Açık array tespit edildi, kesiliyor...`);
      const lastComma = cleaned.lastIndexOf(',', lastOpenBracket);
      if (lastComma > 0) {
        cleaned = cleaned.substring(0, lastComma);
      }
    }
    
    // Son açık tırnak kontrolü
    const allQuotes = cleaned.match(/"/g) || [];
    if (allQuotes.length % 2 !== 0) {
      console.warn(`⚠️  [${requestId}] Açık tırnak bulundu, son tırnağı siliyorum...`);
      const lastQuoteIndex = cleaned.lastIndexOf('"');
      if (lastQuoteIndex > 0) {
        const lastCommaBeforeQuote = cleaned.lastIndexOf(',', lastQuoteIndex);
        if (lastCommaBeforeQuote > 0) {
          cleaned = cleaned.substring(0, lastCommaBeforeQuote);
        }
      }
    }
    
    // ✅ 4. JSON'U KAPAT
    const openBraces = (cleaned.match(/{/g) || []).length;
    const closeBraces = (cleaned.match(/}/g) || []).length;
    const openBrackets = (cleaned.match(/\[/g) || []).length;
    const closeBrackets = (cleaned.match(/\]/g) || []).length;
    
    console.log(`🔍 [${requestId}] { : ${openBraces}, } : ${closeBraces}, [ : ${openBrackets}, ] : ${closeBrackets}`);
    
    // Array'leri kapat
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      cleaned += ' ]';
      console.log(`🔧 [${requestId}] Array kapatıldı (${i + 1})`);
    }
    
    // Object'leri kapat
    for (let i = 0; i < openBraces - closeBraces; i++) {
      cleaned += ' }';
      console.log(`🔧 [${requestId}] Object kapatıldı (${i + 1})`);
    }
    
    // 5. Trailing comma temizliği
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
    
    // 6. Whitespace temizliği
    cleaned = cleaned.replace(/[\n\r\t]/g, ' ').replace(/\s+/g, ' ');
    
    console.log(`📦 [${requestId}] Temizlenmiş JSON:\n${cleaned}`);
    
    const parsedResult = JSON.parse(cleaned); // ✅ const olarak değiştirildi
    console.log(`✅ [${requestId}] JSON parse başarılı`);
    
    // ✅ 7. EKSİK ALANLARI TAMAMLA
    if (!parsedResult.project_info) {
      console.warn(`⚠️  [${requestId}] project_info eksik, default ekleniyor`);
      parsedResult.project_info = {
        area_type: "unknown",
        detected_floor: 1,
        building_category: "Belirtilmemiş",
        estimated_area_sqm: 0
      };
    }
    
    if (!parsedResult.equipment_inventory) {
      console.warn(`⚠️  [${requestId}] equipment_inventory eksik, boş array ekleniyor`);
      parsedResult.equipment_inventory = [];
    }
    
    if (!parsedResult.safety_violations) {
      console.warn(`⚠️  [${requestId}] safety_violations eksik, boş array ekleniyor`);
      parsedResult.safety_violations = [];
    }
    
    if (!parsedResult.expert_suggestions) {
      console.warn(`⚠️  [${requestId}] expert_suggestions eksik, boş array ekleniyor`);
      parsedResult.expert_suggestions = [];
    }
    
    if (typeof parsedResult.compliance_score !== 'number') {
      console.warn(`⚠️  [${requestId}] compliance_score hesaplanıyor...`);
      const equipmentCount = (parsedResult.equipment_inventory as BlueprintAnalysisResult['equipment_inventory'])
        ?.reduce((sum, eq) => sum + (eq.count || 0), 0) || 0;
      const violationCount = parsedResult.safety_violations?.length || 0;
      
      parsedResult.compliance_score = Math.max(0, Math.min(100, 50 + (equipmentCount * 5) - (violationCount * 10)));
    }
    
    console.log(`🎯 [${requestId}] Tüm alan kontrolleri tamamlandı`);
    
    return parsedResult as BlueprintAnalysisResult;
    
  } catch (parseError: unknown) { // ✅ any yerine unknown
    const error = parseError as Error;
    console.error(`❌ [${requestId}] JSON Parse Hatası:`, error.message);
    console.error(`📄 [${requestId}] Hatalı JSON:\n${contentText}`);
    
    // ✅ SON ÇARE: AI'DAN GELEN PARÇALARı KURTAR
    console.warn(`🆘 [${requestId}] Son çare: Manuel parsing deneniyor...`);
    
    try {
      // project_info'yu çıkar
      const projectInfoMatch = contentText.match(/"project_info"\s*:\s*{([^}]+)}/);
      const projectInfo = { // ✅ const olarak değiştirildi
        area_type: "unknown" as const,
        detected_floor: 1,
        building_category: "Kısmi analiz",
        estimated_area_sqm: 0
      };
      
      if (projectInfoMatch) {
        const areaTypeMatch = projectInfoMatch[0].match(/"area_type"\s*:\s*"([^"]+)"/);
        const floorMatch = projectInfoMatch[0].match(/"detected_floor"\s*:\s*(\d+)/);
        const categoryMatch = projectInfoMatch[0].match(/"building_category"\s*:\s*"([^"]+)"/);
        const areaMatch = projectInfoMatch[0].match(/"estimated_area_sqm"\s*:\s*(\d+)/);
        
        if (areaTypeMatch) projectInfo.area_type = areaTypeMatch[1] as "unknown";
        if (floorMatch) projectInfo.detected_floor = parseInt(floorMatch[1]);
        if (categoryMatch) projectInfo.building_category = categoryMatch[1];
        if (areaMatch) projectInfo.estimated_area_sqm = parseInt(areaMatch[1]);
      }
      
      // equipment_inventory sayısını tahmin et
      const extinguisherMatch = contentText.match(/"type"\s*:\s*"extinguisher"[^}]*"count"\s*:\s*(\d+)/);
      const equipment: BlueprintAnalysisResult['equipment_inventory'] = []; // ✅ Tip eklendi
      
      if (extinguisherMatch) {
        equipment.push({
          type: "extinguisher" as const, // ✅ as const eklendi
          count: parseInt(extinguisherMatch[1]),
          locations: ["Tespit edildi"],
          adequacy_status: "sufficient" as const // ✅ as const eklendi
        });
      }
      
      console.log(`✅ [${requestId}] Manuel parsing başarılı`);
      
      return {
        project_info: projectInfo,
        equipment_inventory: equipment,
        safety_violations: [],
        expert_suggestions: ["Analiz kısmi tamamlandı", "Daha net bir kroki yükleyin"],
        compliance_score: equipment.length > 0 ? 50 : 0
      };
      
    } catch (_manualError) { // ✅ _ prefix eklendi
      console.error(`❌ [${requestId}] Manuel parsing de başarısız`);
      
      return {
        project_info: {
          area_type: "unknown",
          detected_floor: 1,
          building_category: "Analiz tamamlanamadı",
          estimated_area_sqm: 0
        },
        equipment_inventory: [],
        safety_violations: [{
          issue: "Kroki analizi tamamlanamadı",
          regulation_reference: "N/A",
          severity: "warning",
          recommended_action: "Lütfen daha net bir kroki görseli yükleyin"
        }],
        expert_suggestions: ["Görselin çözünürlüğünü artırın", "Farklı bir format deneyin"],
        compliance_score: 0
      };
    }
  }
}

const SYSTEM_PROMPT = `Sen 20 yıllık deneyime sahip bir Yangın Güvenliği ve İmar Uzmanısın. Yüklenen görseli bir 'mimari kat planı' veya 'tahliye krokisi' olarak analiz edeceksin.

## 🎯 GÖREV

1. **Görsel Türü Tespiti**:
   - Görselin CAD çizimi, el çizimi veya dijital kroki olup olmadığını belirle
   - Ölçek bilgisi varsa kaydet

2. **Mimari Elemanlar**:
   - Duvarlar, kapılar, pencereler, merdivenleri tespit et
   - Oda/alan isimlerini oku (varsa)
   - Toplam alan tahmini yap (ölçek varsa)

3. **Güvenlik Ekipmanları** (ZORUNLU - Her birini sayarak listele):
   - 🧯 Yangın Söndürme Tüpü (Kırmızı silindir, "Fire Extinguisher" yazısı)
   - 🚪 Acil Çıkış İşareti (Yeşil, koşan insan figürü, "EXIT" yazısı)
   - 🚰 Yangın Dolabı/Hidrant (Kırmızı kutu, hortum sembolü)
   - 🩹 İlk Yardım Çantası (Beyaz kutu, kırmızı artı işareti)
   - 🟢 Toplanma Alanı (Yeşil daire, insan grubu sembolü)

4. **Konum Analizi**:
   - Her ekipmanın konumunu mimari öğelere göre tarif et
   - Örnek: "Ana girişin 3m sağında", "B-103 odasının önünde", "Doğu merdiven boşluğu yanı"

5. **Mevzuat Kontrolleri** (Türkiye Yangın Yönetmeliği):
   - Tüp Yoğunluğu: Her 200 m² için 1 tüp (minimum 6 kg ABC)
   - Acil Çıkış Mesafesi: En uzak noktadan çıkışa max 30m
   - Hidrant Erişimi: Koridor/merdiven başlarında, max 25m aralıkla
   - İlk Yardım: Her katta en az 1 dolap
   - Yönlendirme Levhaları: Her 10m'de bir, görüş hattında

6. **Uyumsuzluk Tespiti**:
   - Eksik ekipman
   - Aşırı uzak mesafeler
   - Engelli erişim sorunları
   - Levha eksikliği

## 📄 ÇIKTI FORMATI

**ÇOK ÖNEMLİ**: Yanıtını SADECE aşağıdaki JSON formatında ver. Hiçbir açıklama ekleme!

{
  "project_info": {
    "area_type": "office|residential|industrial|commercial|educational",
    "detected_floor": 1,
    "building_category": "string (detaylı açıklama)",
    "estimated_area_sqm": 450
  },
  "equipment_inventory": [
    {
      "type": "extinguisher",
      "count": 3,
      "locations": [
        "Ana giriş holü, kapı yanı",
        "Koridor ortası, asansör karşısı",
        "Arka çıkış yanı"
      ],
      "adequacy_status": "sufficient"
    },
    {
      "type": "exit",
      "count": 2,
      "locations": ["Ana giriş üstü", "Acil çıkış kapısı üstü"],
      "adequacy_status": "insufficient"
    }
  ],
  "safety_violations": [
    {
      "issue": "Doğu koridorda yangın tüpü yok",
      "regulation_reference": "Binaların Yangından Korunması Hakkında Yönetmelik Md. 58",
      "severity": "critical",
      "recommended_action": "Koridor sonuna 6kg ABC tipi yangın söndürme tüpü monte edilmelidir"
    }
  ],
  "expert_suggestions": [
    "Merdiven başlarına fotolüminesans yönlendirme levhaları eklenmelidir",
    "Bina girişinde toplanma alanı işaretlemesi yapılmalıdır"
  ],
  "compliance_score": 65
}

## 🚫 YAPMA:
- Markdown formatı kullanma
- Görseli "fotoğraf" olarak değil "teknik çizim" olarak işle
- Belirsiz konum belirtme ("bir yerde" yerine somut yer söyle)
- Eksik alan bırakma (her alan dolu olmalı)

## ✅ YAP:
- Her ekipmanı tek tek say
- Konumları detaylı tarif et
- Mevzuat maddelerini doğru kaydet
- Compliance score'u gerçekçi hesapla
- SADECE JSON döndür, başka hiçbir metin yazma`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`\n🏗️ [${requestId}] ===== YENİ KROKİ ANALİZİ =====`);
  console.log(`⏰ [${requestId}] Başlangıç zamanı: ${new Date().toISOString()}`);

  try {
    const body = await req.json();
    const { image } = body;
    
    console.log(`📥 [${requestId}] Request body alındı`);

    if (!image) {
      console.error(`❌ [${requestId}] Görsel eksik`);
      return new Response(
        JSON.stringify({ error: "Kroki görseli zorunludur" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ✅ Görsel boyut kontrolü
    const imageSizeKB = (image.length * 0.75) / 1024;
    console.log(`📊 [${requestId}] Görsel boyutu: ${imageSizeKB.toFixed(2)} KB`);

    if (imageSizeKB > 2048) {
      console.error(`❌ [${requestId}] Görsel çok büyük: ${imageSizeKB.toFixed(2)} KB > 2048 KB`);
      return new Response(
        JSON.stringify({ error: "Görsel çok büyük (max 2MB). Lütfen sıkıştırın." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ✅ Environment variables
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    const GOOGLE_MODEL = "gemini-2.5-flash";

    if (!GOOGLE_API_KEY) {
      console.error(`❌ [${requestId}] GOOGLE_API_KEY bulunamadı`);
      throw new Error("GOOGLE_API_KEY bulunamadı");
    }

    console.log(`🔑 [${requestId}] API Key mevcut: ${GOOGLE_API_KEY.substring(0, 10)}...`);
    console.log(`🤖 [${requestId}] Model: ${GOOGLE_MODEL}`);

    // ✅ Base64 parse
    const base64Match = image.match(/^data:image\/\w+;base64,(.+)$/);
    if (!base64Match) {
      console.error(`❌ [${requestId}] Base64 format hatası`);
      throw new Error("Geçersiz base64 formatı");
    }

    const base64Data = base64Match[1];
    const mimeType = image.match(/data:(image\/\w+);/)?.[1] || "image/jpeg";
    
    console.log(`📷 [${requestId}] MIME Type: ${mimeType}`);
    console.log(`📊 [${requestId}] Base64 uzunluğu: ${base64Data.length} karakter`);

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            { text: SYSTEM_PROMPT },
            { text: "\n\nLütfen yukarıdaki mimari planı analiz et ve JSON formatında sonuç ver:" },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
        responseMimeType: "application/json"
      }
    };

    console.log(`🚀 [${requestId}] Gemini Vision API'ye istek gönderiliyor...`);
    const apiStartTime = Date.now();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_MODEL}:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );

    const apiDuration = Date.now() - apiStartTime;
    console.log(`⏱️  [${requestId}] API yanıt süresi: ${apiDuration}ms`);
    console.log(`📡 [${requestId}] HTTP Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [${requestId}] Gemini API hatası: ${response.status}`);
      console.error(`📄 [${requestId}] Hata detayı:`, errorText.substring(0, 500));
      throw new Error(`Gemini API hatası (${response.status}): ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    console.log(`✅ [${requestId}] API yanıtı alındı`);
    console.log(`📦 [${requestId}] Candidates sayısı: ${data.candidates?.length || 0}`);

    const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    console.log(`📄 [${requestId}] Content uzunluğu: ${contentText.length} karakter`);

    // ✅ JSON Parse (güçlendirilmiş)
    const parsedResult = parseAIResponse(contentText, requestId);

    console.log(`\n🎉 [${requestId}] ===== ANALİZ TAMAMLANDI =====`);
    console.log(`   📊 Bina Tipi: ${parsedResult.project_info.area_type}`);
    console.log(`   🏢 Kategori: ${parsedResult.project_info.building_category}`);
    console.log(`   📐 Alan: ${parsedResult.project_info.estimated_area_sqm} m²`);
    console.log(`   🧯 Ekipman Tipi: ${parsedResult.equipment_inventory.length} adet`);
    console.log(`   ⚠️  Uyumsuzluk: ${parsedResult.safety_violations.length} adet`);
    console.log(`   💡 Öneri: ${parsedResult.expert_suggestions.length} adet`);
    console.log(`   ✅ Uygunluk Skoru: ${parsedResult.compliance_score}%`);
    console.log(`⏰ [${requestId}] Bitiş zamanı: ${new Date().toISOString()}`);

    return new Response(
      JSON.stringify({
        success: true,
        analysis: parsedResult,
        metadata: {
          request_id: requestId,
          image_size_kb: Math.round(imageSizeKB),
          processing_time_ms: apiDuration,
          processed_at: new Date().toISOString()
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (e: any) {
    console.error(`\n💥 [${requestId}] ===== SUNUCU HATASI =====`);
    console.error(`📛 [${requestId}] Hata Tipi: ${e.name}`);
    console.error(`📄 [${requestId}] Hata Mesajı: ${e.message}`);
    console.error(`🔍 [${requestId}] Stack Trace:`, e.stack);
    console.error(`⏰ [${requestId}] Hata zamanı: ${new Date().toISOString()}`);

    return new Response(
      JSON.stringify({
        error: e.message || "Kroki analizi başarısız oldu",
        request_id: requestId,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});