import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import type { NewOrder } from "../lib/db.ts";

// lib/db.ts держит БД в модульной переменной `db`, поэтому для каждого
// теста берём отдельный экземпляр модуля через уникальный query-string.
async function loadDbModule(instance: string) {
  return await import(`../lib/db.ts?instance=${instance}`);
}

function makeLegacyDb(dbFile: string, withRow: boolean) {
  const legacy = new Database(dbFile);
  legacy.exec(
    `CREATE TABLE orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('one-off', 'subscription')),
      selection TEXT NOT NULL,
      comment TEXT NOT NULL
    )`
  );
  if (withRow) {
    legacy
      .prepare(
        `INSERT INTO orders (created_at, name, phone, kind, selection, comment)
         VALUES ('2026-01-01 10:00:00', 'Аня', '375295554433', 'one-off', 'Эфиопия Иргачеффе 250 г × 1', 'тестовая запись')`
      )
      .run();
  }
  legacy.close();
}

function emptyAttribution() {
  return {
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_term: "",
    utm_content: "",
    click_id: "",
    referrer: "",
    original_landing_page: "",
    landing_page: "",
    captured_at: "",
  };
}

async function inOwnDir<T>(fn: (dbFile: string) => Promise<T>): Promise<T> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kvarta-db-test-"));
  const dbFile = path.join(dir, "orders.db");
  try {
    return await fn(dbFile);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("legacy 7-column orders DB is migrated to 17 columns, data preserved", () =>
  inOwnDir(async (dbFile) => {
    makeLegacyDb(dbFile, true);
    process.env.DB_PATH = dbFile;

    const mod = await loadDbModule("migration");
    const db = mod.getDb();
    const cols = db
      .prepare("PRAGMA table_info(orders)")
      .all() as Array<{ name: string }>;
    assert.equal(cols.length, 17);
    for (const n of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "click_id",
      "referrer",
      "original_landing_page",
      "landing_page",
      "captured_at",
    ]) {
      assert.ok(cols.some((c) => c.name === n), `column ${n} missing`);
    }

    const row = db
      .prepare("SELECT * FROM orders WHERE id = 1")
      .get() as Record<string, unknown>;
    assert.equal(row.name, "Аня");
    assert.equal(row.phone, "375295554433");
    assert.equal(row.kind, "one-off");
    assert.equal(row.selection, "Эфиопия Иргачеффе 250 г × 1");
    assert.equal(row.comment, "тестовая запись");
    assert.equal(row.created_at, "2026-01-01 10:00:00");
    assert.equal(row.click_id, "");
    assert.equal(row.utm_source, "");

    const id = mod.createOrder({
      name: "Test Ctr",
      phone: "375251000777",
      kind: "subscription",
      selection: "Колумбия Уила",
      comment: "",
      attribution: {
        ...emptyAttribution(),
        utm_source: "google",
        utm_medium: "cpc",
        click_id: "regress_gclid",
      },
    } satisfies NewOrder);
    assert.equal(id, 2);
    const saved = db
      .prepare("SELECT click_id, utm_source FROM orders WHERE id = 2")
      .get() as { click_id: string; utm_source: string };
    assert.equal(saved.click_id, "regress_gclid");
    assert.equal(saved.utm_source, "google");
    db.close();
  }));

test("duplicate order within 10 minutes throws", () =>
  inOwnDir(async (dbFile) => {
    makeLegacyDb(dbFile, false);

    process.env.DB_PATH = dbFile;
    const mod = await loadDbModule("dedupe");

    const base = {
      name: "D",
      phone: "375251000888",
      kind: "one-off" as const,
      selection: "",
      comment: "",
      attribution: emptyAttribution(),
    };
    const id = mod.createOrder(base);
    assert.ok(id >= 1);
    assert.throws(() => mod.createOrder(base), mod.DuplicateOrderError);
    mod.getDb().close();
  }));
