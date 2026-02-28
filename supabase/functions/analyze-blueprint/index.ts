import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ✅ ENHANCED TYPES
interface ProjectInfo {
  area_type: string;
  detected_floor: number;
  building_category: string;
  estimated_area_sqm: number;
  usage_type?: string;
  construction_year?: number;
  occupancy_count?: number;
}

interface Equipment {
  type: "extinguisher" | "exit" | "hydrant" | "first_aid" | "assembly_point" | "alarm" | "emergency_light" | "fire_hose" | "smoke_detector";
  count: number;
  locations: string[];
  adequacy_status: "sufficient" | "insufficient" | "excessive";
  recommended_count?: number;
  notes?: string;
}

interface Violation {
  issue: string;
  regulation_reference: string;
  severity: "critical" | "warning" | "info";
  recommended_action: string;
  estimated_cost?: number;
  priority_level?: number;
}

interface RiskAssessment {
  fire_risk: "low" | "medium" | "high";
  structural_risk: "low" | "medium" | "high";
  evacuation_capacity: number;
}

interface ImprovementRoadmap {
  immediate: string[];
  short_term: string[];
  long_term: string[];
}

interface BlueprintAnalysisResult {
  project_info: ProjectInfo;
  equipment_inventory: Equipment[];
  safety_violations: Violation[];
  expert_suggestions: string[];
  compliance_score: number;
  risk_assessment?: RiskAssessment;
  improvement_roadmap?: ImprovementRoadmap;
}

/**
 * ✅ Enhanced JSON Parser - Kesik ve hatalı JSON'ları düzeltir
 */
function parseAIResponse(contentText: string, requestId: string): BlueprintAnalysisResult {
  console.log(`📦 [${requestId}] Ham yanıt uzunluğu: ${contentText.length} karakter`);
  
  if (contentText.length > 500) {
    console.log(`📄 [${requestId}] İlk 500 karakter:\n${contentText.substring(0, 500)}...`);
  } else {
    console.log(`📄 [${requestId}] Tam içerik:\n${contentText}`);
  }
  
  try {
    let cleaned = contentText.trim();
    
    // 1. Markdown temizliği
    cleaned = cleaned.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
    console.log(`🔧 [${requestId}] Markdown temizlendi`);
    
    // 2. JSON başlangıcını bul
    const jsonStart = cleaned.indexOf('{');
    if (jsonStart === -1) {
      throw new Error("JSON başlangıcı bulunamadı");
    }
    
    if (jsonStart > 0) {
      console.log(`⚠️  [${requestId}] JSON öncesi ${jsonStart} karakter atlandı`);
      cleaned = cleaned.substring(jsonStart);
    }
    
    // 3. Tamamlanmamış array'leri tespit et
    const lastOpenBracket = cleaned.lastIndexOf('[');
    const lastCloseBracket = cleaned.lastIndexOf(']');
    
    if (lastOpenBracket > lastCloseBracket) {
      console.warn(`⚠️  [${requestId}] Açık array tespit edildi (pos: ${lastOpenBracket})`);
      const lastComma = cleaned.lastIndexOf(',', lastOpenBracket);
      
      if (lastComma > 0) {
        console.log(`🔧 [${requestId}] Son tamamlanmamış property siliniyor...`);
        cleaned = cleaned.substring(0, lastComma);
      }
    }
    
    // 4. Açık tırnak kontrolü
    const allQuotes = cleaned.match(/"/g) || [];
    if (allQuotes.length % 2 !== 0) {
      console.warn(`⚠️  [${requestId}] Açık tırnak bulundu (${allQuotes.length} adet)`);
      const lastQuoteIndex = cleaned.lastIndexOf('"');
      
      if (lastQuoteIndex > 0) {
        const lastCommaBeforeQuote = cleaned.lastIndexOf(',', lastQuoteIndex);
        if (lastCommaBeforeQuote > 0) {
          console.log(`🔧 [${requestId}] Son açık tırnak bloğu siliniyor...`);
          cleaned = cleaned.substring(0, lastCommaBeforeQuote);
        }
      }
    }
    
    // 5. Bracket/Brace dengesi
    const openBraces = (cleaned.match(/{/g) || []).length;
    const closeBraces = (cleaned.match(/}/g) || []).length;
    const openBrackets = (cleaned.match(/\[/g) || []).length;
    const closeBrackets = (cleaned.match(/\]/g) || []).length;
    
    console.log(`🔍 [${requestId}] Bracket dengesi: { ${openBraces}/${closeBraces}, [ ${openBrackets}/${closeBrackets}`);
    
    // Array'leri kapat
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      cleaned += ' ]';
      console.log(`🔧 [${requestId}] Array kapatıldı (${i + 1}/${openBrackets - closeBrackets})`);
    }
    
    // Object'leri kapat
    for (let i = 0; i < openBraces - closeBraces; i++) {
      cleaned += ' }';
      console.log(`🔧 [${requestId}] Object kapatıldı (${i + 1}/${openBraces - closeBraces})`);
    }
    
    // 6. Trailing comma temizliği
    const beforeTrailing = cleaned.length;
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
    
    if (cleaned.length !== beforeTrailing) {
      console.log(`🔧 [${requestId}] ${beforeTrailing - cleaned.length} trailing comma temizlendi`);
    }
    
    // 7. Smart quotes düzeltme
    cleaned = cleaned
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2015\u2013]/g, "-");
    
    // 8. Whitespace normalleştirme
    cleaned = cleaned.replace(/[\n\r\t]+/g, ' ').replace(/\s{2,}/g, ' ');
    
    console.log(`📦 [${requestId}] Final JSON uzunluğu: ${cleaned.length} karakter`);
    
    // 9. JSON Parse
    const parsedResult = JSON.parse(cleaned);
    console.log(`✅ [${requestId}] JSON parse başarılı`);
    
    // 10. Eksik alanları tamamla
    const result = ensureCompleteResult(parsedResult, requestId);
    
    return result;
    
  } catch (parseError: unknown) {
    const error = parseError as Error;
    console.error(`❌ [${requestId}] JSON Parse Hatası: ${error.message}`);
    console.error(`📄 [${requestId}] Hatalı JSON ilk 300 karakter:\n${contentText.substring(0, 300)}`);
    
    // Son çare: Manuel parsing
    return manualParse(contentText, requestId);
  }
}

/**
 * ✅ Ensure Complete Result - Eksik alanları tamamla
 */
function ensureCompleteResult(parsed: any, requestId: string): BlueprintAnalysisResult {
  console.log(`🔍 [${requestId}] Eksik alan kontrolü başlıyor...`);
  
  // Project Info
  if (!parsed.project_info) {
    console.warn(`⚠️  [${requestId}] project_info eksik, default ekleniyor`);
    parsed.project_info = {
      area_type: "unknown",
      detected_floor: 1,
      building_category: "Belirtilmemiş",
      estimated_area_sqm: 0
    };
  } else {
    if (!parsed.project_info.area_type) parsed.project_info.area_type = "unknown";
    if (!parsed.project_info.detected_floor) parsed.project_info.detected_floor = 1;
    if (!parsed.project_info.building_category) parsed.project_info.building_category = "Belirtilmemiş";
    if (!parsed.project_info.estimated_area_sqm) parsed.project_info.estimated_area_sqm = 0;
  }
  
  // Equipment Inventory
  if (!Array.isArray(parsed.equipment_inventory)) {
    console.warn(`⚠️  [${requestId}] equipment_inventory eksik veya geçersiz`);
    parsed.equipment_inventory = [];
  } else {
    console.log(`✓ [${requestId}] equipment_inventory: ${parsed.equipment_inventory.length} item`);
    
    // Her equipment'ı doğrula
    parsed.equipment_inventory = parsed.equipment_inventory.map((eq: any, idx: number) => {
      if (!eq.type) {
        console.warn(`⚠️  [${requestId}] Equipment ${idx}: type eksik`);
        eq.type = "extinguisher";
      }
      if (!eq.count) eq.count = 0;
      if (!Array.isArray(eq.locations)) eq.locations = [];
      if (!eq.adequacy_status) eq.adequacy_status = "sufficient";
      
      return eq;
    });
  }
  
  // Safety Violations
  if (!Array.isArray(parsed.safety_violations)) {
    console.warn(`⚠️  [${requestId}] safety_violations eksik`);
    parsed.safety_violations = [];
  } else {
    console.log(`✓ [${requestId}] safety_violations: ${parsed.safety_violations.length} item`);
  }
  
  // Expert Suggestions
  if (!Array.isArray(parsed.expert_suggestions)) {
    console.warn(`⚠️  [${requestId}] expert_suggestions eksik`);
    parsed.expert_suggestions = [];
  } else {
    console.log(`✓ [${requestId}] expert_suggestions: ${parsed.expert_suggestions.length} item`);
  }
  
  // Compliance Score
  if (typeof parsed.compliance_score !== 'number') {
    console.warn(`⚠️  [${requestId}] compliance_score hesaplanıyor...`);
    
    const equipmentCount = parsed.equipment_inventory.reduce((sum: number, eq: any) => sum + (eq.count || 0), 0);
    const violationCount = parsed.safety_violations.length;
    const criticalViolations = parsed.safety_violations.filter((v: any) => v.severity === 'critical').length;
    
    // Score formula: Base 50 + (equipments * 3) - (violations * 5) - (critical * 10)
    let score = 50 + (equipmentCount * 3) - (violationCount * 5) - (criticalViolations * 10);
    score = Math.max(0, Math.min(100, score));
    
    parsed.compliance_score = score;
    console.log(`🎯 [${requestId}] Hesaplanan compliance_score: ${score}%`);
  }
  
  // Risk Assessment (optional)
  if (!parsed.risk_assessment) {
    console.log(`ℹ️  [${requestId}] risk_assessment oluşturuluyor...`);
    
    const criticalCount = parsed.safety_violations.filter((v: any) => v.severity === 'critical').length;
    const equipmentCount = parsed.equipment_inventory.reduce((sum: number, eq: any) => sum + (eq.count || 0), 0);
    
    parsed.risk_assessment = {
      fire_risk: criticalCount > 2 ? "high" : criticalCount > 0 ? "medium" : "low",
      structural_risk: parsed.compliance_score < 50 ? "high" : parsed.compliance_score < 70 ? "medium" : "low",
      evacuation_capacity: Math.floor(parsed.project_info.estimated_area_sqm / 2)
    };
  }
  
  // Improvement Roadmap (optional)
  if (!parsed.improvement_roadmap && parsed.safety_violations.length > 0) {
    console.log(`ℹ️  [${requestId}] improvement_roadmap oluşturuluyor...`);
    
    const critical = parsed.safety_violations.filter((v: any) => v.severity === 'critical');
    const warnings = parsed.safety_violations.filter((v: any) => v.severity === 'warning');
    
    parsed.improvement_roadmap = {
      immediate: critical.map((v: any) => v.recommended_action).slice(0, 3),
      short_term: warnings.map((v: any) => v.recommended_action).slice(0, 3),
      long_term: parsed.expert_suggestions.slice(0, 3)
    };
  }
  
  console.log(`✅ [${requestId}] Tüm alan kontrolleri tamamlandı`);
  
  return parsed as BlueprintAnalysisResult;
}

/**
 * ✅ Manual Parse - Son çare manuel parsing
 */
function manualParse(contentText: string, requestId: string): BlueprintAnalysisResult {
  console.warn(`🆘 [${requestId}] Manuel parsing başlatılıyor...`);
  
  const result: BlueprintAnalysisResult = {
    project_info: {
      area_type: "unknown",
      detected_floor: 1,
      building_category: "Kısmi analiz",
      estimated_area_sqm: 0
    },
    equipment_inventory: [],
    safety_violations: [],
    expert_suggestions: ["Analiz kısmi tamamlandı", "Daha net bir kroki görseli yükleyin"],
    compliance_score: 0
  };
  
  try {
    // Project info extraction
    const areaTypeMatch = contentText.match(/"area_type"\s*:\s*"([^"]+)"/);
    const floorMatch = contentText.match(/"detected_floor"\s*:\s*(\d+)/);
    const categoryMatch = contentText.match(/"building_category"\s*:\s*"([^"]+)"/);
    const areaMatch = contentText.match(/"estimated_area_sqm"\s*:\s*(\d+)/);
    
    if (areaTypeMatch) {
      result.project_info.area_type = areaTypeMatch[1];
      console.log(`✓ [${requestId}] area_type bulundu: ${areaTypeMatch[1]}`);
    }
    if (floorMatch) {
      result.project_info.detected_floor = parseInt(floorMatch[1]);
      console.log(`✓ [${requestId}] floor bulundu: ${floorMatch[1]}`);
    }
    if (categoryMatch) {
      result.project_info.building_category = categoryMatch[1];
      console.log(`✓ [${requestId}] category bulundu: ${categoryMatch[1]}`);
    }
    if (areaMatch) {
      result.project_info.estimated_area_sqm = parseInt(areaMatch[1]);
      console.log(`✓ [${requestId}] area bulundu: ${areaMatch[1]} m²`);
    }
    
    // Equipment extraction
    const equipmentTypes = ["extinguisher", "exit", "hydrant", "first_aid", "assembly_point"];
    
    equipmentTypes.forEach(type => {
      const regex = new RegExp(`"type"\\s*:\\s*"${type}"[^}]*"count"\\s*:\\s*(\\d+)`, 'g');
      const match = regex.exec(contentText);
      
      if (match) {
        result.equipment_inventory.push({
          type: type as any,
          count: parseInt(match[1]),
          locations: ["Tespit edildi"],
          adequacy_status: "sufficient"
        });
        console.log(`✓ [${requestId}] ${type} bulundu: ${match[1]} adet`);
      }
    });
    
    // Compliance score estimate
    const totalEquipment = result.equipment_inventory.reduce((sum, eq) => sum + eq.count, 0);
    result.compliance_score = Math.min(100, totalEquipment * 10);
    
    console.log(`✅ [${requestId}] Manuel parsing tamamlandı: ${totalEquipment} ekipman, ${result.compliance_score}% skor`);
    
  } catch (manualError) {
    console.error(`❌ [${requestId}] Manuel parsing de başarısız:`, manualError);
  }
  
  return result;
}

/**
 * ✅ ENHANCED SYSTEM PROMPT
 */
const SYSTEM_PROMPT = `Sen 20 yıllık deneyime sahip bir Yangın Güvenliği ve İmar Uzmanısın. Yüklenen görseli bir 'mimari kat planı' veya 'tahliye krokisi' olarak analiz edeceksin.

## 🎯 GÖREV

1. **Görsel Türü Tespiti**:
   - CAD çizimi, el çizimi veya dijital kroki türünü belirle
   - Ölçek bilgisi varsa kaydet ve alan hesapla

2. **Mimari Elemanlar**:
   - Duvarlar, kapılar, pencereler, merdivenler
   - Oda/alan isimleri (varsa)
   - Toplam alan tahmini (ölçek varsa)
   - Kullanım amacı (ofis, konut, vb.)

3. **Güvenlik Ekipmanları** (SAYARAK listele):
   - 🧯 Yangın Söndürme Tüpü
   - 🚪 Acil Çıkış İşareti
   - 🚰 Yangın Dolabı/Hidrant
   - 🩹 İlk Yardım Dolabı
   - 🟢 Toplanma Alanı
   - 🔔 Yangın Alarm Butonu
   - 💡 Acil Aydınlatma
   - 🔥 Yangın Hortumu
   - 💨 Duman Dedektörü

4. **Konum Analizi**:
   - Her ekipmanın konumunu MİMARİ ÖĞELERE göre tarif et
   - Örnek: "Ana girişin 3m sağında", "B-103 odasının önünde"

5. **Mevzuat Kontrolleri** (Türkiye):
   - Tüp: Her 200 m² için 1 adet (min 6kg ABC)
   - Acil Çıkış: Max 30m mesafe
   - Hidrant: Max 25m aralık
   - İlk Yardım: Her katta min 1
   - Yönlendirme: Her 10m'de bir

6. **Risk Değerlendirmesi**:
   - Yangın riski (low/medium/high)
   - Yapısal risk
   - Tahliye kapasitesi

7. **İyileştirme Yol Haritası**:
   - Acil (0-7 gün)
   - Kısa vadeli (1-3 ay)
   - Uzun vadeli (6-12 ay)

## 📄 ÇIKTI FORMATI (SADECE JSON)

{
  "project_info": {
    "area_type": "office|residential|industrial|commercial|educational",
    "detected_floor": 3,
    "building_category": "Çok katlı ofis binası",
    "estimated_area_sqm": 1200,
    "usage_type": "Ofis ve toplantı alanı",
    "occupancy_count": 80
  },
  "equipment_inventory": [
    {
      "type": "extinguisher",
      "count": 6,
      "locations": ["Ana giriş holü", "Koridor ortası", "Arka çıkış"],
      "adequacy_status": "sufficient",
      "recommended_count": 6,
      "notes": "ABC tipi, 6kg"
    }
  ],
  "safety_violations": [
    {
      "issue": "Doğu koridorda yangın tüpü yok",
      "regulation_reference": "Binaların Yangından Korunması Yönetmeliği Md. 58",
      "severity": "critical",
      "recommended_action": "6kg ABC tipi tüp monte edilmeli",
      "estimated_cost": 500,
      "priority_level": 1
    }
  ],
  "expert_suggestions": [
    "Merdiven başlarına fotolüminesans levha eklenmelidir"
  ],
  "compliance_score": 75,
  "risk_assessment": {
    "fire_risk": "medium",
    "structural_risk": "low",
    "evacuation_capacity": 120
  },
  "improvement_roadmap": {
    "immediate": ["Kritik eksikleri gider"],
    "short_term": ["Ek ekipman monte et"],
    "long_term": ["Tatbikat planla"]
  }
}

## 🚫 YAPMA:
- Markdown kullanma
- Belirsiz konum söyleme
- Eksik alan bırakma

## ✅ YAP:
- SADECE JSON döndür
- Her ekipmanı say
- Konumları detaylı yaz
- Gerçekçi skor hesapla`;

/**
 * ✅ MAIN HANDLER
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().substring(0, 8);
  const startTime = Date.now();
  
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🏗️  [${requestId}] YENİ KROKİ ANALİZ TALEBİ`);
  console.log(`⏰ [${requestId}] Timestamp: ${new Date().toISOString()}`);
  console.log(`${"=".repeat(60)}\n`);

  try {
    // ✅ Request body parse
    console.log(`📥 [${requestId}] Request body okunuyor...`);
    const body = await req.json();
    const { image, project_name, user_notes } = body;
    
    if (project_name) console.log(`📝 [${requestId}] Proje adı: ${project_name}`);
    if (user_notes) console.log(`📝 [${requestId}] Kullanıcı notu: ${user_notes}`);

    // ✅ Image validation
    if (!image) {
      console.error(`❌ [${requestId}] Görsel eksik!`);
      return new Response(
        JSON.stringify({ error: "Kroki görseli zorunludur" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ✅ Image size check
    const imageSizeBytes = image.length * 0.75;
    const imageSizeKB = imageSizeBytes / 1024;
    const imageSizeMB = imageSizeKB / 1024;
    
    console.log(`📊 [${requestId}] Görsel boyutu: ${imageSizeMB.toFixed(2)} MB (${imageSizeKB.toFixed(0)} KB)`);

    if (imageSizeKB > 3072) { // 3MB limit
      console.error(`❌ [${requestId}] Görsel çok büyük: ${imageSizeMB.toFixed(2)} MB > 3 MB`);
      return new Response(
        JSON.stringify({ 
          error: `Görsel çok büyük (${imageSizeMB.toFixed(2)} MB). Maksimum 3MB olmalı.` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ✅ Environment check
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    const GOOGLE_MODEL = Deno.env.get("GOOGLE_MODEL") || "gemini-2.0-flash-exp";

    if (!GOOGLE_API_KEY) {
      console.error(`❌ [${requestId}] GOOGLE_API_KEY environment variable eksik!`);
      throw new Error("GOOGLE_API_KEY yapılandırması eksik");
    }

    console.log(`🔑 [${requestId}] API Key: ${GOOGLE_API_KEY.substring(0, 15)}...`);
    console.log(`🤖 [${requestId}] Model: ${GOOGLE_MODEL}`);

    // ✅ Base64 parse
    const base64Match = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!base64Match) {
      console.error(`❌ [${requestId}] Geçersiz base64 format`);
      throw new Error("Geçersiz görsel formatı. Base64 encoded image gerekli.");
    }

    const mimeType = base64Match[1];
    const base64Data = base64Match[2];
    
    console.log(`📷 [${requestId}] MIME Type: ${mimeType}`);
    console.log(`📊 [${requestId}] Base64 length: ${base64Data.length} chars`);

    // ✅ Gemini API Request
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            { text: SYSTEM_PROMPT },
            { 
              text: `\n\n${project_name ? `Proje: ${project_name}\n` : ''}${user_notes ? `Not: ${user_notes}\n` : ''}\nLütfen yukarıdaki kroki planını analiz et:` 
            },
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
        temperature: 0.2,
        maxOutputTokens: 8192,
        topP: 0.95,
        topK: 40,
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
    console.log(`📡 [${requestId}] HTTP Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [${requestId}] Gemini API hatası!`);
      console.error(`📄 [${requestId}] Error response (first 500 chars):\n${errorText.substring(0, 500)}`);
      
      throw new Error(`Gemini API Error (${response.status}): ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    console.log(`✅ [${requestId}] API yanıtı başarıyla alındı`);
    console.log(`📦 [${requestId}] Candidates count: ${data.candidates?.length || 0}`);

    if (data.candidates && data.candidates.length > 0) {
      console.log(`📊 [${requestId}] Finish reason: ${data.candidates[0].finishReason}`);
    }

    const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    console.log(`📄 [${requestId}] Response content length: ${contentText.length} chars`);

    // ✅ Parse AI Response
    console.log(`🔧 [${requestId}] JSON parsing başlatılıyor...`);
    const parsedResult = parseAIResponse(contentText, requestId);

    // ✅ Success logging
    const totalDuration = Date.now() - startTime;
    
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🎉 [${requestId}] ANALİZ TAMAMLANDI!`);
    console.log(`${"=".repeat(60)}`);
    console.log(`   📊 Bina Tipi: ${parsedResult.project_info.area_type}`);
    console.log(`   🏢 Kategori: ${parsedResult.project_info.building_category}`);
    console.log(`   📐 Alan: ${parsedResult.project_info.estimated_area_sqm} m²`);
    console.log(`   🧯 Ekipman Çeşidi: ${parsedResult.equipment_inventory.length}`);
    console.log(`   📦 Toplam Ekipman: ${parsedResult.equipment_inventory.reduce((sum, eq) => sum + eq.count, 0)}`);
    console.log(`   ⚠️  Uyumsuzluk: ${parsedResult.safety_violations.length}`);
    console.log(`   🔴 Kritik: ${parsedResult.safety_violations.filter(v => v.severity === 'critical').length}`);
    console.log(`   💡 Öneri: ${parsedResult.expert_suggestions.length}`);
    console.log(`   ✅ Uygunluk Skoru: ${parsedResult.compliance_score}%`);
    console.log(`   ⏱️  Toplam Süre: ${totalDuration}ms`);
    console.log(`   🕐 Bitiş: ${new Date().toISOString()}`);
    console.log(`${"=".repeat(60)}\n`);

    return new Response(
      JSON.stringify({
        success: true,
        analysis: parsedResult,
        metadata: {
          request_id: requestId,
          image_size_kb: Math.round(imageSizeKB),
          image_size_mb: parseFloat(imageSizeMB.toFixed(2)),
          api_duration_ms: apiDuration,
          total_duration_ms: totalDuration,
          model: GOOGLE_MODEL,
          processed_at: new Date().toISOString(),
          project_name: project_name || null,
          user_notes: user_notes || null
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    const errorDuration = Date.now() - startTime;
    
    console.error(`\n${"=".repeat(60)}`);
    console.error(`💥 [${requestId}] HATA OLUŞTU!`);
    console.error(`${"=".repeat(60)}`);
    console.error(`📛 [${requestId}] Error Type: ${error.name}`);
    console.error(`📄 [${requestId}] Error Message: ${error.message}`);
    console.error(`🔍 [${requestId}] Stack Trace:\n${error.stack}`);
    console.error(`⏱️  [${requestId}] Hata anı: ${errorDuration}ms`);
    console.error(`🕐 [${requestId}] Timestamp: ${new Date().toISOString()}`);
    console.error(`${"=".repeat(60)}\n`);

    return new Response(
      JSON.stringify({
        error: error.message || "Kroki analizi sırasında beklenmeyen bir hata oluştu",
        request_id: requestId,
        error_type: error.name,
        duration_ms: errorDuration,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});