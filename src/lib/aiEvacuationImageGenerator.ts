const IMAGE_SYSTEM_PROMPT = `Sen profesyonel acil durum plani gorsellestirme uzmanisin.
Gorevin, kullanicinin verdigi bina bilgisine gore TEK bir yuksek kaliteli, 3D izometrik acil durum plani gorseli uretmektir.

Zorunlu kurallar:
- Stil: teknik ama estetik, kurumsal, temiz, yuksek detayli 3D izometrik cutaway.
- Gorsel, duvara asilabilecek profesyonel Acil Durum Plani afisi kalitesinde olmali.
- Odalar, koridorlar, merdiven ve cikislar gercekci olcekte ve mantikli yerlesimde olmali.
- Tahliye yonleri yesil oklarla acikca gosterilmeli.
- Acil cikis kapilari bina sinirina yakin ve net gorunur olmali.
- Yangin sondurucu ve guvenlik ekipmanlari koridor veya giris yakininda konumlanmali.
- Toplanma noktasi bina disinda acikca etiketlenmeli.
- ISO 7010 mantigina uygun guvenlik ikon estetigi kullanilmali.
- Ust baslik profesyonel olmali: IS SAGLIGI VE GUVENLIGI ACIL DURUM PLANI.
- Turkce tipografi, temiz etiketler, baskiya uygun kompozisyon.
- Karmasik, daginik, ust uste binen yerlesim uretme.
- Insan figuru, watermark, logo, imza, rastgele yazi, bozuk metin uretme.

Kompozisyon:
- Kamera: hafif yukaridan izometrik aci (yaklasik 30-45 derece).
- Aydinlatma: yumusak, profesyonel studyo isigi.
- Renk paleti: notr mimari tonlar + guvenlik icin yuksek kontrast yesil/kirmizi.
- Cikti tek sahne ve net olmali.

Sadece gorsel uret. Aciklama metni uretme.`;

interface GeminiPart {
  text?: string;
  inlineData?: {
    data?: string;
    mimeType?: string;
  };
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiPart[];
  };
}

function extractImageData(payload: any): { base64: string; mimeType: string } {
  const candidates = (payload?.candidates || []) as GeminiCandidate[];
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts || [];
    for (const part of parts) {
      const b64 = part?.inlineData?.data;
      const mime = part?.inlineData?.mimeType || "image/png";
      if (typeof b64 === "string" && b64.length > 100 && mime.startsWith("image/")) {
        return { base64: b64, mimeType: mime };
      }
    }
  }

  const fallbackText = candidates
    .flatMap((c) => c?.content?.parts || [])
    .map((p) => p.text)
    .filter((v): v is string => typeof v === "string")
    .join("\n")
    .trim();

  if (fallbackText) {
    throw new Error(`Model gorsel yerine metin dondurdu: ${fallbackText.slice(0, 180)}`);
  }

  throw new Error("Gemini yanitinda gorsel bulunamadi.");
}

export async function generateEvacuationImage(prompt: string): Promise<{ dataUrl: string; mimeType: string }> {
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY as string;
  const model =
    (import.meta.env.VITE_IMAGE_MODEL as string) ||
    (import.meta.env.VITE_GOOGLE_MODEL as string) ||
    "gemini-2.5-flash";

  if (!apiKey) {
    throw new Error("VITE_GOOGLE_API_KEY bulunamadi.");
  }

  const userPrompt = prompt.trim();
  if (!userPrompt) {
    throw new Error("Lutfen gorsel icin bina aciklamasi girin.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${IMAGE_SYSTEM_PROMPT}\n\nKullanici gereksinimleri:\n${userPrompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          responseModalities: ["IMAGE", "TEXT"],
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini gorsel uretim hatasi: ${response.status} ${text}`);
  }

  const payload = await response.json();
  const image = extractImageData(payload);
  return {
    dataUrl: `data:${image.mimeType};base64,${image.base64}`,
    mimeType: image.mimeType,
  };
}
