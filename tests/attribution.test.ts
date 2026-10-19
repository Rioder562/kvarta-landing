import test from "node:test";
import assert from "node:assert/strict";
import { collectAttribution } from "../lib/attribution.ts";
import {
  captureInitialLanding,
  collectAttributionFromWindow,
} from "../lib/attribution-client.ts";

const STORE_KEY = "kvarta-landing-attribution-v1";
const BASE = "http://localhost:3000";

function baseInput() {
  return {
    utm: {} as Record<string, unknown>,
    utm_original: {} as Record<string, unknown>,
    referrer: "",
    original_landing_page: "",
    landing_page: "",
    captured_at: "",
  };
}

let session: Map<string, string> = new Map();

function installWindow(url: string, referrer = "") {
  const sessionStorage = {
    getItem: (k: string) => (session.has(k) ? session.get(k)! : null),
    setItem: (k: string, v: string) => void session.set(k, v),
    removeItem: (k: string) => void session.delete(k),
  };
  const g = globalThis as unknown as Record<string, unknown>;
  g.location = { href: url, origin: BASE };
  g.document = { referrer };
  g.window = { sessionStorage };
}

const gclid = { gclid: "abc123" };

test("server: valid UTM from both sources, original takes precedence", () => {
  const a = collectAttribution({
    ...baseInput(),
    utm: { utm_source: "current", utm_medium: "cpc" },
    utm_original: { utm_source: "google", utm_campaign: "autumn-2026" },
    referrer: "https://google.com/search?q=coffee",
    original_landing_page: "/?utm_source=google",
    landing_page: "/?utm_source=current",
    captured_at: "2026-10-19T04:47:24.987Z",
  });
  assert.equal(a.utm_source, "google");
  assert.equal(a.utm_medium, "cpc");
  assert.equal(a.utm_campaign, "autumn-2026");
  assert.equal(a.referrer, "https://google.com/search?q=coffee");
  assert.equal(a.captured_at, "2026-10-19T04:47:24.987Z");
});

test("server: click id from utm_original is preferred over click id from utm", () => {
  const a = collectAttribution({
    ...baseInput(),
    utm: { gclid: "g_current" },
    utm_original: { gclid: "g_original", fbclid: "f_fb" },
  });
  assert.equal(a.click_id, "g_original");

  const b = collectAttribution({
    ...baseInput(),
    utm: { gclid: "g_only_current" },
    utm_original: {},
  });
  assert.equal(b.click_id, "g_only_current");
});

test("server: malformed and unknown click values are dropped", () => {
  const a = collectAttribution({
    ...baseInput(),
    utm: { gclid: "bad id<", fbclid: "fb_ok" },
  });
  assert.equal(a.click_id, "fb_ok");

  const b = collectAttribution({
    ...baseInput(),
    utm: { clickid: "nope", unknown: "x" },
  });
  assert.equal(b.click_id, "");
});

test("server: malformed UTM values are dropped", () => {
  const a = collectAttribution({
    ...baseInput(),
    utm: { utm_source: "google; DROP TABLE orders", utm_medium: "cpc" },
  });
  assert.equal(a.utm_source, "");
  assert.equal(a.utm_medium, "cpc");
});

test("client: UTM and click id are collected from current URL", () => {
  session = new Map();
  installWindow(
    `${BASE}/?utm_source=google&utm_medium=cpc&utm_campaign=autumn&gclid=abc123`
  );
  const r = collectAttributionFromWindow();
  assert.equal(r.utm.utm_source, "google");
  assert.equal(r.utm.utm_medium, "cpc");
  assert.equal(r.utm.utm_campaign, "autumn");
  assert.equal(r.utm.gclid, "abc123");
  assert.deepEqual(r.utm_original, {});
});

test("client: click id from the initial landing page survives in-page navigation", () => {
  session = new Map();
  installWindow(`${BASE}/?utm_source=google&utm_medium=cpc&gclid=orig_gclid`);
  captureInitialLanding();
  installWindow(`${BASE}/#zayavka`);
  const r = collectAttributionFromWindow();
  assert.equal(r.utm_original.utm_source, "google");
  assert.equal(r.utm_original.gclid, "orig_gclid");
  assert.deepEqual(r.utm, {});
  assert.equal(r.original_landing_page, `${BASE}/?utm_source=google&utm_medium=cpc&gclid=orig_gclid`);
});

test("client: unknown query parameters are not forwarded", () => {
  session = new Map();
  installWindow(`${BASE}/?utm_source=google&foo=bar&bar=1`);
  const r = collectAttributionFromWindow();
  assert.deepEqual(r.utm, { utm_source: "google" });
  assert.ok(!("foo" in r.utm));
  assert.ok(!("bar" in r.utm));
});

test("end-to-end: URL -> client -> server keeps utm_source and click_id", () => {
  session = new Map();
  installWindow(
    `${BASE}/?utm_source=google&utm_medium=cpc&gclid=abc123`,
    "https://google.com/search?q=coffee&gclid=abc123"
  );
  const client = collectAttributionFromWindow();
  assert.equal(client.utm.gclid, "abc123", "client must keep gclid (regression)");
  const server = collectAttribution({
    utm: client.utm,
    utm_original: client.utm_original,
    referrer: client.referrer,
    original_landing_page: client.original_landing_page,
    landing_page: client.landing_page,
    captured_at: client.captured_at,
  });
  assert.equal(server.utm_source, "google");
  assert.equal(server.utm_medium, "cpc");
  assert.equal(server.click_id, "abc123");
  assert.equal(server.referrer, "https://google.com/search?q=coffee&gclid=abc123");
});
