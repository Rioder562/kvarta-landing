"use client";

// Собирает рекламную атрибуцию на клиенте: UTM-параметры, рекламные
// click ID, referrer, первоначальную и текущую страницы.
// Данные клиента считаются ненадёжными: на сервере значения дополнительно
// фильтруются по whitelist (lib/attribution.ts).

const UTM_KEYS: readonly string[] = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utmsource",
  "utmmedium",
  "utmcampaign",
  "utmterm",
  "utmcontent",
];

const CLICK_ID_KEYS: readonly string[] = [
  "gbraid",
  "gclid",
  "gclsrc",
  "fbclid",
  "twclid",
  "msclkid",
  "yclid",
];

const STORE_KEY = "kvarta-landing-attribution-v1";
const MAX = 2000;

function cleanString(v: unknown): string {
  if (typeof v !== "string") return "";
  const s = v.trim().slice(0, MAX);
  return s === "null" || s === "undefined" ? "" : s;
}

function readParams(url: string): Record<string, string> {
  const abs =
    url.startsWith("http://") || url.startsWith("https://")
      ? url
      : location.origin + url;
  const hashIdx = abs.indexOf("#");
  const beforeHash = hashIdx >= 0 ? abs.slice(0, hashIdx) : abs;
  const queryIdx = beforeHash.indexOf("?");
  const query = queryIdx >= 0 ? beforeHash.slice(queryIdx + 1) : "";
  const out: Record<string, string> = {};
  for (const pair of query.split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    const key = eq >= 0 ? pair.slice(0, eq) : pair;
    const value = eq >= 0 ? pair.slice(eq + 1) : "";
    const k = key.toLowerCase();
    if (UTM_KEYS.includes(k) || CLICK_ID_KEYS.includes(k)) {
      out[key] = decodeURIComponent(value).slice(0, 200);
    }
  }
  return out;
}

export function collectAttributionFromWindow(): {
  utm: Record<string, string>;
  utm_original: Record<string, string>;
  referrer: string;
  original_landing_page: string;
  landing_page: string;
  captured_at: string;
} {
  const stored = readStored();
  const currentParams = readParams(location.href);
  const originalParams = stored ? readParams(stored.original_landing_page) : {};

  const utm: Record<string, string> = {};
  const utm_original: Record<string, string> = {};
  for (const key of [...UTM_KEYS, ...CLICK_ID_KEYS]) {
    if (currentParams[key] !== undefined) utm[key] = currentParams[key];
    if (originalParams[key] !== undefined) utm_original[key] = originalParams[key];
  }

  return {
    utm,
    utm_original,
    referrer: cleanString(document.referrer).slice(0, 1024),
    original_landing_page: stored
      ? stored.original_landing_page
      : cleanString(location.href),
    landing_page: cleanString(location.href),
    captured_at: new Date().toISOString(),
  };
}

function readStored(): { original_landing_page: string } | null {
  try {
    const raw = window.sessionStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { original_landing_page?: unknown };
    const page =
      typeof data.original_landing_page === "string"
        ? data.original_landing_page.slice(0, MAX)
        : "";
    if (!page) return null;
    return { original_landing_page: page };
  } catch {
    return null;
  }
}

function saveStored(page: string): void {
  try {
    window.sessionStorage.setItem(
      STORE_KEY,
      JSON.stringify({ original_landing_page: page.slice(0, MAX) })
    );
  } catch {
    // sessionStorage может быть недоступен; атрибуция просто будет
    // без первоначальной страницы.
  }
}

/** Запоминает первоначальную страницу (с параметрами рекламного клика)
 *  в sessionStorage по первому приходу в этой сессии. */
export function captureInitialLanding(): void {
  try {
    if (window.sessionStorage.getItem(STORE_KEY)) return;
    saveStored(location.href);
  } catch {
    // игнорируем
  }
}
