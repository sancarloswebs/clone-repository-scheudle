import { errorResponse, json } from "@/lib/api";

export const dynamic = "force-dynamic";

const INFO_DOLAR_URLS = [
  "https://www.infodolar.com/cotizacion-dolar-blue.aspx",
  "https://www.infodolar.com/",
];

const JINA_FALLBACK_URLS = [
  "https://r.jina.ai/https://www.infodolar.com/cotizacion-dolar-blue.aspx",
  "https://r.jina.ai/https://www.infodolar.com/",
];

const CACHE_MAX_AGE_MS = 15 * 60 * 1000;

type BlueRate = {
  compra: number;
  venta: number;
  promedio: number;
  source: "InfoDolar";
  fetchedAt: string;
};

type GlobalWithBlueRateCache = typeof globalThis & {
  __blueRateCache?: BlueRate;
};

function parseMoney(value: string): number | null {
  const cleaned = value.replace(/[^0-9.,-]/g, "").trim();
  if (!cleaned) return null;

  // Argentina: 1.525,00 -> 1525.00. También soporta 1525.00 y 1525.
  let normalized = cleaned;
  if (cleaned.includes(",")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if ((cleaned.match(/\./g) ?? []).length > 1) {
    normalized = cleaned.replace(/\./g, "");
  }

  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&oacute;/gi, "ó")
    .replace(/&#243;/gi, "ó")
    .replace(/&#xF3;/gi, "ó")
    .replace(/&aacute;/gi, "á")
    .replace(/&#225;/gi, "á")
    .replace(/&eacute;/gi, "é")
    .replace(/&#233;/gi, "é")
    .replace(/&iacute;/gi, "í")
    .replace(/&#237;/gi, "í")
    .replace(/&oacute;/gi, "ó")
    .replace(/&uacute;/gi, "ú")
    .replace(/&#250;/gi, "ú")
    .replace(/&#252;/gi, "ü")
    .replace(/&#241;/gi, "ñ")
    .replace(/&#xF1;/gi, "ñ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value: string): string {
  return stripHtml(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function firstMoney(value: string): number | null {
  const text = stripHtml(value);
  const match = text.match(/(?:\$\s*)?\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?|(?:\$\s*)?\d+(?:,\d{1,2})?/);
  return match ? parseMoney(match[0]) : null;
}

function validRates(compra: number | null, venta: number | null): boolean {
  return compra != null && venta != null && compra > 0 && venta > 0;
}

function extractFromHtml(html: string): { compra: number; venta: number } | null {
  // 1) Ruta principal: localizar una tabla que tenga los encabezados Compra/Venta
  // y, dentro de ella, la fila Dólar Blue. Se usan los índices reales de las
  // columnas, no posiciones fijas.
  const tables = html.match(/<table\b[^>]*>[\s\S]*?<\/table>/gi) ?? [];

  for (const table of tables) {
    const headerRows = [...table.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)];
    for (const headerMatch of headerRows) {
      const headerHtml = headerMatch[0];
      const headerCells = [...headerHtml.matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((m) => normalizeText(m[1]));
      const compraIndex = headerCells.findIndex((cell) => cell === "compra");
      const ventaIndex = headerCells.findIndex((cell) => cell === "venta");
      if (compraIndex < 0 || ventaIndex < 0) continue;

      const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1]);
      for (const row of rows) {
        const rowText = normalizeText(row);
        if (!/dolar\s+blue(?:\s+infodolar)?\b/.test(rowText)) continue;

        const cells = [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => m[1]);
        if (!cells.length) continue;

        // Cuando la fila tiene una celda adicional para "Entidad", los índices
        // de Compra/Venta quedan desplazados una posición.
        const offset = cells.length >= headerCells.length + 1 ? 1 : 0;
        const compra = firstMoney(cells[compraIndex + offset] ?? "");
        const venta = firstMoney(cells[ventaIndex + offset] ?? "");
        if (validRates(compra, venta)) return { compra: compra as number, venta: venta as number };
      }
    }
  }

  // 2) Fallback HTML: la fila de InfoDolar contiene Dólar Blue + Compra + Venta
  // + variaciones. Tomamos solamente los importes >= 100, por lo que los +$5
  // de variación no pueden confundirse con la cotización.
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1]);
  for (const row of rows) {
    if (!/dolar\s+blue\b/i.test(normalizeText(row))) continue;
    const cells = [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => m[1]);
    const values = cells.map(firstMoney).filter((v): v is number => v != null && v >= 100);
    if (values.length >= 2) return { compra: values[0], venta: values[1] };
  }

  return null;
}

function extractFromPlainText(text: string): { compra: number; venta: number } | null {
  // Jina devuelve una versión de texto/Markdown de InfoDolar si Vercel no puede
  // acceder directamente al HTML. La línea relevante suele ser:
  // Dólar Blue InfoDolar | $ 1.525,00 $ 5,00 | $ 1.545,00 $ 5,00 | ...
  const match = text.match(/d[óo]lar\s+blue(?:\s+infodolar)?\b/i);
  if (!match || match.index == null) return null;

  const section = text.slice(match.index, match.index + 1200);
  const matches = [...section.matchAll(/(?:\$\s*)?\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?|(?:\$\s*)?\d+(?:,\d{1,2})?/g)];
  const values = matches.map((m) => parseMoney(m[0])).filter((v): v is number => v != null && v >= 100);
  if (values.length >= 2) return { compra: values[0], venta: values[1] };
  return null;
}

function saveCache(rates: { compra: number; venta: number }): BlueRate {
  const value: BlueRate = {
    compra: rates.compra,
    venta: rates.venta,
    promedio: (rates.compra + rates.venta) / 2,
    source: "InfoDolar",
    fetchedAt: new Date().toISOString(),
  };
  (globalThis as GlobalWithBlueRateCache).__blueRateCache = value;
  return value;
}

function getFreshCachedRate(): BlueRate | null {
  const cached = (globalThis as GlobalWithBlueRateCache).__blueRateCache;
  if (!cached) return null;
  const age = Date.now() - Date.parse(cached.fetchedAt);
  return Number.isFinite(age) && age >= 0 && age <= CACHE_MAX_AGE_MS ? cached : null;
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
        Referer: "https://www.google.com/",
        "Cache-Control": "no-cache",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    if (!text || text.length < 200) throw new Error("Respuesta vacía o incompleta");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const errors: string[] = [];

  // Primero intentamos directamente InfoDolar. Se hacen dos intentos por URL
  // para tolerar errores transitorios de red/CDN.
  for (const url of INFO_DOLAR_URLS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const text = await fetchText(url);
        const rates = extractFromHtml(text);
        if (rates) return json(saveCache(rates));
        errors.push(`${url}: no se encontró Compra/Venta del Dólar Blue`);
      } catch (error) {
        errors.push(`${url}: ${error instanceof Error ? error.message : "error desconocido"}`);
      }
    }
  }

  // Segundo intento: proxy de lectura. El contenido sigue siendo el de InfoDolar,
  // pero evita que un bloqueo de salida de Vercel o del CDN de InfoDolar impida
  // obtener la cotización.
  for (const url of JINA_FALLBACK_URLS) {
    try {
      const text = await fetchText(url);
      const rates = extractFromHtml(text) ?? extractFromPlainText(text);
      if (rates) return json(saveCache(rates));
      errors.push(`${url}: no se encontró Compra/Venta del Dólar Blue`);
    } catch (error) {
      errors.push(`${url}: ${error instanceof Error ? error.message : "error desconocido"}`);
    }
  }

  // Si hubo una lectura correcta reciente en la misma instancia de Vercel,
  // usamos ese último valor durante hasta 15 minutos en lugar de hacer fallar
  // la carga del formulario. No se inventa una cotización nueva.
  const cached = getFreshCachedRate();
  if (cached) return json({ ...cached, stale: true, warning: "Se usó la última cotización de InfoDolar obtenida correctamente." });

  return json({ error: "No se pudo leer la cotización del dólar blue de InfoDolar.", details: errors.slice(-4) }, 502);
}
