export interface AIPlanRoom {
  id?: string;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AIPlanPointItem {
  id?: string;
  name?: string;
  x: number;
  y: number;
}

export interface AIPlanRoute {
  id?: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface AIEvacuationPlan {
  rooms: AIPlanRoom[];
  exits: AIPlanPointItem[];
  extinguishers: AIPlanPointItem[];
  routes: AIPlanRoute[];
}

const SYSTEM_PROMPT = `Sen yangin guvenligi ve tahliye plani tasarimi konusunda uzman bir yapay zekasin.

Kullanicinin verdigi bina aciklamasina gore mantikli bir tahliye plani uret.

Canvas boyutu:
1200 x 800

Koordinatlar bu alan icinde olmalidir.

Kurallar:
- Odalar mantikli yerlesimde olmali
- Cikislar bina kenarina yakin olmali
- Tahliye yollari en yakin cikisa gitmeli
- Yangin sonduruculer koridor veya girislerde olmali

COK ONEMLI:
Sadece JSON uret.
Aciklama yazma.

JSON formati:
{
  "rooms": [],
  "exits": [],
  "extinguishers": [],
  "routes": []
}`;

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function extractCandidateText(payload: any): string {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    throw new Error("Gemini yaniti beklenen formatta degil.");
  }

  const text = parts
    .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Gemini bos yanit dondurdu.");
  }

  return text;
}

function cleanJsonText(raw: string): string {
  const withoutFence = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return withoutFence;
  }

  return withoutFence.slice(firstBrace, lastBrace + 1);
}

function normalizePointItem(item: any, fallbackName: string): AIPlanPointItem | null {
  const x = toFiniteNumber(item?.x ?? item?.left ?? item?.cx);
  const y = toFiniteNumber(item?.y ?? item?.top ?? item?.cy);
  if (x === null || y === null) return null;
  return {
    id: typeof item?.id === "string" ? item.id : undefined,
    name: typeof item?.name === "string" ? item.name : fallbackName,
    x,
    y,
  };
}

function normalizeRouteItems(rawRoutes: any[]): AIPlanRoute[] {
  const routes: AIPlanRoute[] = [];

  rawRoutes.forEach((route: any, index: number) => {
    const direct = {
      x1: toFiniteNumber(route?.x1 ?? route?.fromX ?? route?.startX),
      y1: toFiniteNumber(route?.y1 ?? route?.fromY ?? route?.startY),
      x2: toFiniteNumber(route?.x2 ?? route?.toX ?? route?.endX),
      y2: toFiniteNumber(route?.y2 ?? route?.toY ?? route?.endY),
    };

    if (direct.x1 !== null && direct.y1 !== null && direct.x2 !== null && direct.y2 !== null) {
      routes.push({ id: route?.id ?? `route-${index}`, x1: direct.x1, y1: direct.y1, x2: direct.x2, y2: direct.y2 });
      return;
    }

    const startX = toFiniteNumber(route?.start?.x);
    const startY = toFiniteNumber(route?.start?.y);
    const endX = toFiniteNumber(route?.end?.x);
    const endY = toFiniteNumber(route?.end?.y);
    if (startX !== null && startY !== null && endX !== null && endY !== null) {
      routes.push({ id: route?.id ?? `route-${index}`, x1: startX, y1: startY, x2: endX, y2: endY });
      return;
    }

    const points = Array.isArray(route?.points) ? route.points : Array.isArray(route) ? route : null;
    if (points && points.length >= 2) {
      for (let i = 0; i < points.length - 1; i += 1) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const x1 = toFiniteNumber(p1?.x ?? p1?.[0]);
        const y1 = toFiniteNumber(p1?.y ?? p1?.[1]);
        const x2 = toFiniteNumber(p2?.x ?? p2?.[0]);
        const y2 = toFiniteNumber(p2?.y ?? p2?.[1]);
        if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
          routes.push({ id: `${route?.id ?? `route-${index}`}-${i}`, x1, y1, x2, y2 });
        }
      }
    }
  });

  return routes;
}

function normalizePlan(raw: any): AIEvacuationPlan {
  const roomsRaw = Array.isArray(raw?.rooms) ? raw.rooms : [];
  const exitsRaw = Array.isArray(raw?.exits) ? raw.exits : [];
  const extRaw = Array.isArray(raw?.extinguishers) ? raw.extinguishers : [];
  const routesRaw = Array.isArray(raw?.routes) ? raw.routes : [];

  const rooms: AIPlanRoom[] = roomsRaw
    .map((room: any, idx: number) => {
      const x = toFiniteNumber(room?.x ?? room?.left);
      const y = toFiniteNumber(room?.y ?? room?.top);
      const width = toFiniteNumber(room?.width ?? room?.w);
      const height = toFiniteNumber(room?.height ?? room?.h);
      if (x === null || y === null || width === null || height === null || width <= 0 || height <= 0) {
        return null;
      }
      return {
        id: typeof room?.id === "string" ? room.id : `room-${idx}`,
        name: typeof room?.name === "string" ? room.name : "Oda",
        x,
        y,
        width,
        height,
      };
    })
    .filter(Boolean) as AIPlanRoom[];

  const exits = exitsRaw
    .map((item: any) => normalizePointItem(item, "Acil Cikis"))
    .filter(Boolean) as AIPlanPointItem[];

  const extinguishers = extRaw
    .map((item: any) => normalizePointItem(item, "Yangin Sondurucu"))
    .filter(Boolean) as AIPlanPointItem[];

  const routes = normalizeRouteItems(routesRaw);

  return { rooms, exits, extinguishers, routes };
}

async function requestSingleModel(apiKey: string, model: string, payloadText: string): Promise<AIEvacuationPlan> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
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
              parts: [{ text: payloadText }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (response.ok) {
      const payload = await response.json();
      const raw = extractCandidateText(payload);
      const cleaned = cleanJsonText(raw);
      const parsed = JSON.parse(cleaned);
      return normalizePlan(parsed);
    }

    const retryable = RETRYABLE_STATUS.has(response.status);
    const errText = await response.text();

    if (retryable && attempt < 2) {
      await sleep((attempt + 1) * 700);
      continue;
    }

    if (response.status === 503) {
      throw new Error("Gemini servisi su anda mesgul (503). Lutfen 10-20 saniye sonra tekrar deneyin.");
    }

    throw new Error(`Gemini API hatasi: ${response.status} ${errText}`);
  }

  throw new Error("Gemini istegi tekrar denemelere ragmen tamamlanamadi.");
}

async function callGeminiWithFallback(payloadText: string, preferredFirst: "flash" | "robust"): Promise<AIEvacuationPlan> {
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY as string;
  if (!apiKey) {
    throw new Error("VITE_GOOGLE_API_KEY bulunamadi.");
  }

  const flash = (import.meta.env.VITE_GOOGLE_MODEL as string) || "gemini-2.5-flash";
  const robust = (import.meta.env.VITE_GOOGLE_MODEL_ROBUST as string) || "gemini-2.5-pro";
  const modelOrder = preferredFirst === "robust" ? [robust, flash] : [flash, robust];

  let lastError: unknown;
  for (const model of modelOrder) {
    try {
      return await requestSingleModel(apiKey, model, payloadText);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Gemini ile plan olusturulamadi.");
}

export async function generateEvacuationPlan(prompt: string): Promise<AIEvacuationPlan> {
  const userPrompt = prompt.trim();
  if (!userPrompt) {
    throw new Error("Bina aciklamasi bos olamaz.");
  }

  return callGeminiWithFallback(`${SYSTEM_PROMPT}\n\nKullanici aciklamasi:\n${userPrompt}`, "flash");
}

export async function improveEvacuationPlan(currentPlan: AIEvacuationPlan, instruction: string): Promise<AIEvacuationPlan> {
  const trimmedInstruction = instruction.trim();
  if (!trimmedInstruction) {
    throw new Error("Iyilestirme aciklamasi bos olamaz.");
  }

  return callGeminiWithFallback(
    `${SYSTEM_PROMPT}\n\nMevcut plan JSON:\n${JSON.stringify(currentPlan)}\n\nGuncelleme istegi:\n${trimmedInstruction}\n\nYanit olarak guncellenmis tum JSON plani dondur.`,
    "robust"
  );
}

