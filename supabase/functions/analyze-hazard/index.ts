import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const hazardDescription = body.hazardDescription || "";
    const imageUrl = body.imageUrl || null;

    if (!hazardDescription && !imageUrl) {
      return new Response(
        JSON.stringify({ error: "Tehlike açıklaması veya görsel zorunludur." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY ortam değişkeni ayarlanmamış.");
    }

    const systemPrompt = `
Sen 20 yıllık saha tecrübesine sahip, A Sınıfı İş Güvenliği Uzmanı ve mevzuat danışmanısın. Verilen saha gözlemini, tehlike açıklamasını veya görseli Fine-Kinney metodolojisine göre analiz edeceksin.

Kriterler:
1. Olasılık: (0.2, 0.5, 1, 3, 6, 10)
2. Frekans: (0.5, 1, 2, 3, 6, 10)
3. Şiddet: (1, 3, 7, 15, 40, 100)
4. Risk Puanı: Olasılık * Frekans * Şiddet
5. Risk Seviyesi: "Kabul Edilebilir", "Düşük", "Önemli", "Yüksek", "Kritik"
6. Yasal Atıf: Doğrudan Türkiye İSG mevzuatından ilgili kanun/yönetmelik.

LÜTFEN ÇIKTIYI SADECE AŞAĞIDAKİ JSON FORMATINDA VER:
{
  "hazardDescription": "Teknik tehlike tanımı",
  "probability": 3,
  "frequency": 6,
  "severity": 15,
  "riskScore": 270,
  "riskLevel": "Yüksek",
  "legalReference": "6331 Sayılı Kanun Md. 10",
  "immediateAction": "Acil müdahale",
  "preventiveAction": "Kalıcı çözüm",
  "justification": "Risk skoru gerekçesi"
}
`;

    // Mesaj içeriğini hazırlama (Eğer görsel varsa, mesaj dizisini ona göre oluşturuyoruz)
    let userMessageContent: any[] = [
      {
        type: "text",
        text: `Lütfen şu tehlike durumunu detaylıca analiz et: ${hazardDescription}`,
      }
    ];

    if (imageUrl) {
      userMessageContent.push({
        type: "image_url",
        image_url: {
          url: imageUrl
        }
      });
    }

    const aiPayload = {
      model: "google/gemini-flash-1.5", // veya "google/gemini-3-flash-preview" (Gateway dökümanına göre)
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessageContent },
      ],
      response_format: { type: "json_object" } // YENİ: Modelin kesinlikle JSON dönmesini zorlar
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(aiPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway Hatası:", response.status, errorText);
      return new Response(JSON.stringify({ error: `Yapay zeka servisi yanıt vermedi. Hata: ${response.status}` }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const contentText = data.choices?.[0]?.message?.content || "{}";

    let parsedResult;
    try {
      // Çift güvenlik (```json temizliği)
      const cleaned = contentText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsedResult = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("JSON Parse Hatası:", contentText);
      return new Response(JSON.stringify({ error: "Yapay zeka geçerli bir JSON formatı döndüremedi." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Başarılı Dönüş
    return new Response(JSON.stringify(parsedResult), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Sunucu İçi Hata:", e);
    return new Response(JSON.stringify({ error: e.message || "Bilinmeyen bir hata oluştu" }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});