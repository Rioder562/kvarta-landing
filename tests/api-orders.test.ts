import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { NextRequest } from "next/server";
import { POST } from "../../.next/server/app/api/orders/route.js";

// Тестируем скомпилированный роут (.next), чтобы покрыть весь реальный
 // пайплайн: JSON-парсинг тела → валидация → collectAttribution → SQLite.

let instanceCounter = 0;

async function loadDbModule(tag: string) {
  instanceCounter += 1;
  return await import(`../../lib/db.ts?instance=${tag}-${instanceCounter}`);
}

async function withDbFile<T>(fn: (dbFile: string) => Promise<T>): Promise<T> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kvarta-api-test-"));
  const dbFile = path.join(dir, "orders.db");
  process.env.DB_PATH = dbFile;
  const dbMod = await loadDbModule("audit");
  try {
    return await fn(dbFile);
  } finally {
    dbMod.getDb().close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function uniquePhone(): string {
  const stamp = Date.now().toString().slice(-6);
  return `37529${stamp}${Math.floor(100 + Math.random() * 900)}`;
}

function post(body: unknown) {
  const req = new NextRequest("http://localhost/api/orders", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
  return POST(req);
}

function rawPost(body: string) {
  const req = new NextRequest("http://localhost/api/orders", {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
  });
  return POST(req);
}

async function jsonBody(resp: Response): Promise<Record<string, unknown>> {
  const text = await resp.text();
  return JSON.parse(text) as Record<string, unknown>;
}

function query(dbFile: string, phone: string): Record<string, string> | undefined {
  const db = new Database(dbFile, { readonly: true });
  const row = db
    .prepare(
      `SELECT name, phone, kind, selection, comment,
        utm_source, utm_medium, utm_campaign, utm_term, utm_content,
        click_id, referrer, original_landing_page, landing_page, captured_at, created_at
       FROM orders WHERE phone = ?`
    )
    .get(phone) as Record<string, string> | undefined;
  db.close();
  return row;
}

function insertLegacy(dbFile: string, phone: string, createdAt: string): void {
  const db = new Database(dbFile);
  db.exec(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('one-off', 'subscription')),
    selection TEXT NOT NULL,
    comment TEXT NOT NULL
  )`);
  db.prepare(`INSERT INTO orders (created_at, name, phone, kind, selection, comment)
              VALUES (?, ?, ?, 'one-off', '', '')`).run(createdAt, "Legacy", phone);
  db.close();
}

// 1. Тело запроса: некорректный JSON, scalar/массив/null

test("body: invalid JSON text is rejected with 400 and field=body", () =>
  withDbFile(async () => {
    for (const raw of ["", "not-json{", "null", "42", "[]"]) {
      const resp = await rawPost(raw);
      assert.equal(resp.status, 400, `raw=${raw}`);
      const data = await jsonBody(resp);
      assert.equal(data.ok, false);
      assert.equal(data.field, "body");
      assert.ok(typeof data.error === "string" && data.error.length > 0);
    }
  }));

test("body: top-level JSON scalar/null/array are rejected with 400", () =>
  withDbFile(async () => {
    for (const body of [42, "text", true, null, [1, 2], {"0": "a"}]) {
      const resp = await post(body);
      assert.equal(resp.status, 400, `body=${JSON.stringify(body)}`);
      const data = await jsonBody(resp);
      assert.equal(data.ok, false);
      assert.equal(data.field, "body");
    }
  }));

// 2. name: обязательность, типы, пробелы, лимит 100

test("name: missing/empty/whitespace/non-string -> 400; 100 ok, 101 rejected; stored trimmed", () =>
  withDbFile(async (dbFile) => {
    for (const name of [undefined, "", "   ", "\t \n", 42, null, true]) {
      const resp = await post({ name, phone: "375291111111", kind: "one-off" });
      assert.equal(resp.status, 400, `name=${JSON.stringify(name)}`);
      assert.equal((await jsonBody(resp)).field, "name");
    }
    const ok = await post({ name: "  " + "А".repeat(100) + "  ", phone: "375291111111", kind: "one-off" });
    assert.equal(ok.status, 201);
    const long = await post({ name: "А".repeat(101), phone: "375291111112", kind: "one-off" });
    assert.equal(long.status, 400);
    assert.equal((await jsonBody(long)).field, "name");
    const row = query(dbFile, "375291111111");
    assert.equal(row?.name, "А".repeat(100), "leading/trailing spaces trimmed before storage");
  }));

// 3. phone: нормализация и проверка белорусского номера

test("phone: all supported Belarus forms normalize to E.164 and are stored normalized", () =>
  withDbFile(async (dbFile) => {
    const cases: Array<[string, string]> = [
      ["+375291234567", "375291234567"],
      ["375251112255", "375251112255"],
      ["80299876543", "375299876543"],
      ["+375 29 123-45-67", "375291234567"],
      ["(25) 111-22-33", "375251112233"],
      ["171234567", "375171234567"],
      ["291234567", "375291234567"],
      ["331234567", "375331234567"],
      ["441234567", "375441234567"],
    ];
    for (const [raw, normalized] of cases) {
      const resp = await post({ name: "Т", phone: raw, kind: "one-off" });
      assert.equal(resp.status, 201, `raw=${raw}`);
      const row = query(dbFile, normalized);
      assert.ok(row, `stored normalized ${normalized}`);
      assert.equal(row?.phone, normalized);
    }
  }));

test("phone: empty/whitespace/non-string/non-Belarusian/too-short/too-long -> 400 field=phone", () =>
  withDbFile(async () => {
    const bad: unknown[] = [
      undefined,
      null,
      "",
      "   ",
      375291234567,
      ["+375291234567"],
      "12345",
      "3751234567",
      "3751234567890",
      "80012345678",
      "801234567890",
      "00123456789",
      "+0123456789",
      "+12345678901",
      "+4930112345678",
      "+79161234567",
      "451234567",
      "01234567",
    ];
    for (const raw of bad) {
      const resp = await post({ name: "Т", phone: raw, kind: "one-off" });
      assert.equal(resp.status, 400, `phone=${JSON.stringify(raw)}`);
      assert.equal((await jsonBody(resp)).field, "phone");
    }
  }));

// 4. kind: только точные допустимые значения

test("kind: 'one-off' and 'subscription' accepted; other types/case/padding -> 400 field=kind", () =>
  withDbFile(async (dbFile) => {
    const oneOff = await post({ name: "Т", phone: "375295550001", kind: "one-off" });
    assert.equal(oneOff.status, 201);
    const sub = await post({ name: "Т", phone: "375295550002", kind: "subscription" });
    assert.equal(sub.status, 201);
    assert.equal(query(dbFile, "375295550001")?.kind, "one-off");
    assert.equal(query(dbFile, "375295550002")?.kind, "subscription");
    const bad: unknown[] = [undefined, null, "", " One-Off ", "ONE-OFF", "subscription ", "one-off\n", 1, true, [], "oneoff"];
    for (const kind of bad) {
      const resp = await post({ name: "Т", phone: "375295550003", kind });
      assert.equal(resp.status, 400, `kind=${JSON.stringify(kind)}`);
      assert.equal((await jsonBody(resp)).field, "kind");
    }
  }));

// 5. selection/comment: необязательные, trim, трим-нечётные, лимиты 500/1000

test("selection/comment: empty ok (stored as ''), non-string -> '', trimmed, truncated server-side", () =>
  withDbFile(async (dbFile) => {
    const p1 = uniquePhone();
    const r1 = await post({
      name: "Т",
      phone: p1,
      kind: "one-off",
      selection: "  " + "к".repeat(600) + " ",
      comment: "  " + "с".repeat(1200) + " ",
    });
    assert.equal(r1.status, 201);
    const row1 = query(dbFile, p1);
    assert.equal(row1?.selection, "к".repeat(500));
    assert.equal(row1?.comment, "с".repeat(1000));

    const p2 = uniquePhone();
    const r2 = await post({ name: "Т", phone: p2, kind: "subscription" });
    assert.equal(r2.status, 201);
    const row2 = query(dbFile, p2);
    assert.equal(row2?.selection, "");
    assert.equal(row2?.comment, "");

    const p3 = uniquePhone();
    const r3 = await post({ name: "Т", phone: p3, kind: "one-off", selection: 42, comment: null });
    assert.equal(r3.status, 201);
    const row3 = query(dbFile, p3);
    assert.equal(row3?.selection, "");
    assert.equal(row3?.comment, "");
  }));

// 6. Atribution: whitelist ключей, значения, типы

test("attribution: utm whitelist + aliases + case/underscore-insensitivity; unknown keys dropped", () =>
  withDbFile(async (dbFile) => {
    const p = uniquePhone();
    const r = await post({
      name: "Т",
      phone: p,
      kind: "one-off",
      utm: {
        utm_source: "google",
        " UTM_MEDIUM ": "cpc",
        utmcampaign: "autumn",
        utmterm: "grain",
        utmcontent: "a.b",
        unknown_key: "nope",
        utm_source_injection: "google; DROP TABLE orders;--",
        bad_value: "has spaces <script>",
      },
    });
    assert.equal(r.status, 201);
    const row = query(dbFile, p);
    assert.equal(row?.utm_source, "google");
    assert.equal(row?.utm_medium, "cpc");
    assert.equal(row?.utm_campaign, "autumn");
    assert.equal(row?.utm_term, "grain");
    assert.equal(row?.utm_content, "a.b");
  }));

test("attribution: original precedence over current for utm and click id", () =>
  withDbFile(async (dbFile) => {
    const p = uniquePhone();
    const r = await post({
      name: "Т",
      phone: p,
      kind: "one-off",
      utm: { utm_source: "current", gclid: "g_current" },
      utm_original: { utm_source: "original", fbclid: "f_original" },
    });
    assert.equal(r.status, 201);
    const row = query(dbFile, p);
    assert.equal(row?.utm_source, "original");
    assert.equal(row?.click_id, "f_original");
  }));

test("attribution: values with whitespace are trimmed; values beyond 200 chars truncated; 'null'/'undefined' literals dropped", () =>
  withDbFile(async (dbFile) => {
    const p = uniquePhone();
    const r = await post({
      name: "Т",
      phone: p,
      kind: "one-off",
      utm: {
        utm_source: "  padded  ",
        gclid: " " + "c".repeat(250) + " ",
        utm_medium: "null",
        utm_campaign: "undefined",
      },
    });
    assert.equal(r.status, 201);
    const row = query(dbFile, p);
    assert.equal(row?.utm_source, "padded");
    assert.equal(row?.click_id, "c".repeat(200));
    assert.equal(row?.utm_medium, "");
    assert.equal(row?.utm_campaign, "");
  }));

test("attribution: non-string utm dict values are dropped (no crash, no stored)", () =>
  withDbFile(async (dbFile) => {
    const p = uniquePhone();
    const r = await post({
      name: "Т",
      phone: p,
      kind: "one-off",
      utm: {
        utm_source: 42,
        gclid: { v: 1 },
        fbclid: [1, 2],
        yclid: null,
      },
    });
    assert.equal(r.status, 201);
    const row = query(dbFile, p);
    assert.equal(row?.utm_source, "");
    assert.equal(row?.click_id, "");
  }));

test("attribution: utm/utm_original of wrong top-level type become empty", () =>
  withDbFile(async (dbFile) => {
    const p = uniquePhone();
    const r = await post({
      name: "Т",
      phone: p,
      kind: "one-off",
      utm: "utm_source=google",
      utm_original: [1, 2],
      referrer: 42,
      referrer_text: "https://ignored.example",
      original_landing_page: null,
      landing_page: null,
      captured_at: { t: 1 },
    });
    assert.equal(r.status, 201);
    const row = query(dbFile, p);
    assert.equal(row?.utm_source, "");
    assert.equal(row?.click_id, "");
    assert.equal(row?.referrer, "");
    assert.equal(row?.original_landing_page, "");
    assert.equal(row?.landing_page, "");
    assert.equal(row?.captured_at, "");
  }));

test("attribution: referrer only http(s); landing pages sanitized; captured_at ISO only", () =>
  withDbFile(async (dbFile) => {
    const p = uniquePhone();
    const r = await post({
      name: "Т",
      phone: p,
      kind: "one-off",
      referrer: "javascript:alert(1)",
      original_landing_page: "http://a b?x=1",
      landing_page: "https://kvarta.by/?utm_source=google&gclid=g#zayavka",
      captured_at: "19/10/2026 04:47",
    });
    assert.equal(r.status, 201);
    const row = query(dbFile, p);
    assert.equal(row?.referrer, "");
    assert.equal(row?.original_landing_page, "");
    assert.equal(row?.landing_page, "https://kvarta.by/?utm_source=google&gclid=g#zayavka");
    assert.equal(row?.captured_at, "");

    const p2 = uniquePhone();
    const r2 = await post({
      name: "Т",
      phone: p2,
      kind: "one-off",
      referrer: "https://google.com/search?q=coffee&gclid=g",
      landing_page: "/?utm_source=google",
      captured_at: "2026-10-19T04:47:24.987Z",
    });
    assert.equal(r2.status, 201);
    const row2 = query(dbFile, p2);
    assert.equal(row2?.referrer, "https://google.com/search?q=coffee&gclid=g");
    assert.equal(row2?.landing_page, "/?utm_source=google");
    assert.equal(row2?.captured_at, "2026-10-19T04:47:24.987Z");
  }));

test("attribution: click id whitelist order (gbraid, gclid, gclsrc, fbclid, twclid, msclkid, yclid); malformed dropped", () =>
  withDbFile(async (dbFile) => {
    const p1 = uniquePhone();
    const r1 = await post({ name: "Т", phone: p1, kind: "one-off", utm: { gclid: "gg", fbclid: "ff" } });
    assert.equal(r1.status, 201);
    assert.equal(query(dbFile, p1)?.click_id, "gg");

    const p2 = uniquePhone();
    const r2 = await post({
      name: "Т",
      phone: p2,
      kind: "one-off",
      utm: { gclid: "bad id<", fbclid: "fb_ok", clickid: "ignored" },
    });
    assert.equal(r2.status, 201);
    assert.equal(query(dbFile, p2)?.click_id, "fb_ok");

    const p3 = uniquePhone();
    const r3 = await post({ name: "Т", phone: p3, kind: "one-off", utm: { unknown_key: "x" } });
    assert.equal(r3.status, 201);
    assert.equal(query(dbFile, p3)?.click_id, "");
  }));

// 7. Десуликация и повторные заявки

test("dedupe: phone with order older than 10 min -> 201; immediate repeat -> 409; other phone -> 201", () =>
  withDbFile(async (dbFile) => {
    const p = uniquePhone();
    insertLegacy(dbFile, p, "2020-01-01 00:00:00");
    const fresh = await post({ name: "Т", phone: p, kind: "one-off" });
    assert.equal(fresh.status, 201, "old order (days ago) must not block a new one");
    const repeat = await post({ name: "Т", phone: p, kind: "one-off" });
    assert.equal(repeat.status, 409, "repeat within 10 min must be rejected");
    const data = await jsonBody(repeat);
    assert.equal(data.ok, false);
    assert.ok(typeof data.error === "string" && data.error.length > 0);
    const other = await post({ name: "Т2", phone: uniquePhone(), kind: "subscription" });
    assert.equal(other.status, 201);
  }));
