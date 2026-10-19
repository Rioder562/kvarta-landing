// Рекламная атрибуция: собираем только доверенные (whitelist) параметры
// из клиентских данных. Данные клиента считаются не подтверждёнными и
// небезопасными: значения вне формата отбрасываются.

export interface Attribution {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  click_id: string;
  referrer: string;
  original_landing_page: string;
  landing_page: string;
  captured_at: string;
}

export interface AttributionInput {
  utm: Record<string, unknown>;
  utm_original: Record<string, unknown>;
  referrer: string;
  original_landing_page: string;
  landing_page: string;
  captured_at: string;
}

const UTM_VALUE_RE = /^[A-Za-z0-9._\-%]{1,200}$/;
const CLICK_ID_RE = /^[A-Za-z0-9._\-]{1,200}$/;
const URL_RE = /^https?:\/\/.+/;
const PAGE_RE = /^[A-Za-z0-9._\/\-?&=%#@\+]{1,2000}$/;
const TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/;

const UTM_KEYS = ["source", "medium", "campaign", "term", "content"] as const;
type UtmName = (typeof UTM_KEYS)[number];
type UtmField = `utm_${UtmName}`;

const UTM_ALIASES: Record<string, UtmName> = {
  utm_source: "source",
  utmsource: "source",
  utm_medium: "medium",
  utmmedium: "medium",
  utm_campaign: "campaign",
  utmcampaign: "campaign",
  utm_term: "term",
  utmterm: "term",
  utm_content: "content",
  utmcontent: "content",
};

const CLICK_ID_KEYS: readonly string[] = [
  "gbraid",
  "gclid",
  "gclsrc",
  "fbclid",
  "twclid",
  "msclkid",
  "yclid",
];

function cleanText(v: unknown, re: RegExp, max: number): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s || s === "null" || s === "undefined") return "";
  if (!re.test(s)) return "";
  return s.slice(0, max);
}

function cleanUrl(v: unknown): string {
  return cleanText(v, URL_RE, 1024);
}

function cleanPage(v: unknown): string {
  return cleanText(v, PAGE_RE, 2000);
}

function cleanTime(v: unknown): string {
  return cleanText(v, TIME_RE, 40);
}

function pickUtm(params: Record<string, unknown>): Record<UtmField, string> {
  const out: Record<UtmField, string> = {
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_term: "",
    utm_content: "",
  };
  for (const rawKey of Object.keys(params ?? {})) {
    const key = rawKey.trim().toLowerCase();
    const name = UTM_ALIASES[key];
    if (!name) continue;
    const field = ("utm_" + name) as UtmField;
    if (!out[field]) {
      out[field] = cleanText(params[rawKey], UTM_VALUE_RE, 200);
    }
  }
  return out;
}

function pickClickId(params: Record<string, unknown>): string {
  for (const key of CLICK_ID_KEYS) {
    const v = cleanText(params[key], CLICK_ID_RE, 200);
    if (v) return v;
  }
  return "";
}

/**
 * Собирает нормализованную атрибуцию.
 * Atribution из первоначальной (первой) страницы приоритетнее текущей.
 */
export function collectAttribution(input: AttributionInput): Attribution {
  const utmOriginal = pickUtm(input.utm_original);
  const utmCurrent = pickUtm(input.utm);
  const utm: Record<UtmField, string> = {
    utm_source: utmOriginal.utm_source || utmCurrent.utm_source,
    utm_medium: utmOriginal.utm_medium || utmCurrent.utm_medium,
    utm_campaign: utmOriginal.utm_campaign || utmCurrent.utm_campaign,
    utm_term: utmOriginal.utm_term || utmCurrent.utm_term,
    utm_content: utmOriginal.utm_content || utmCurrent.utm_content,
  };

  return {
    utm_source: utm.utm_source,
    utm_medium: utm.utm_medium,
    utm_campaign: utm.utm_campaign,
    utm_term: utm.utm_term,
    utm_content: utm.utm_content,
    click_id: pickClickId(input.utm_original) || pickClickId(input.utm),
    referrer: cleanUrl(input.referrer),
    original_landing_page: cleanPage(input.original_landing_page),
    landing_page: cleanPage(input.landing_page),
    captured_at: cleanTime(input.captured_at),
  };
}
