import Database from "better-sqlite3";
import path from "node:path";
import type { Attribution } from "@/lib/attribution";

export type OrderKind = "one-off" | "subscription";

const ATTRIBUTION_COLUMNS: Array<{ name: keyof Attribution; sql: string }> = [
  { name: "utm_source", sql: "utm_source TEXT NOT NULL DEFAULT ''" },
  { name: "utm_medium", sql: "utm_medium TEXT NOT NULL DEFAULT ''" },
  { name: "utm_campaign", sql: "utm_campaign TEXT NOT NULL DEFAULT ''" },
  { name: "utm_term", sql: "utm_term TEXT NOT NULL DEFAULT ''" },
  { name: "utm_content", sql: "utm_content TEXT NOT NULL DEFAULT ''" },
  { name: "click_id", sql: "click_id TEXT NOT NULL DEFAULT ''" },
  { name: "referrer", sql: "referrer TEXT NOT NULL DEFAULT ''" },
  { name: "original_landing_page", sql: "original_landing_page TEXT NOT NULL DEFAULT ''" },
  { name: "landing_page", sql: "landing_page TEXT NOT NULL DEFAULT ''" },
  { name: "captured_at", sql: "captured_at TEXT NOT NULL DEFAULT ''" },
];

export interface NewOrder {
  name: string;
  phone: string;
  kind: OrderKind;
  selection: string;
  comment: string;
  attribution: Attribution;
}

export class DuplicateOrderError extends Error {
  constructor() {
    super("Duplicate order for the same phone within the last 10 minutes");
  }
}

const DEDUPE_WINDOW = "-10 minutes";

let db: Database.Database | null = null;

function dbFile(): string {
  return process.env.DB_PATH ?? path.join(process.cwd(), "data.db");
}

function migrateOrders(d: Database.Database) {
  const rows = d
    .prepare("PRAGMA table_info(orders)")
    .all() as Array<{ name: string }>;
  const existing = new Set(rows.map((r) => r.name));
  for (const col of ATTRIBUTION_COLUMNS) {
    if (!existing.has(col.name)) {
      d.exec(`ALTER TABLE orders ADD COLUMN ${col.sql}`);
    }
  }
}

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbFile());
    db.pragma("journal_mode = WAL");
    db.pragma("busy_timeout = 5000");
    db.exec(
      `CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('one-off', 'subscription')),
        selection TEXT NOT NULL,
        comment TEXT NOT NULL,
        utm_source TEXT NOT NULL DEFAULT '',
        utm_medium TEXT NOT NULL DEFAULT '',
        utm_campaign TEXT NOT NULL DEFAULT '',
        utm_term TEXT NOT NULL DEFAULT '',
        utm_content TEXT NOT NULL DEFAULT '',
        click_id TEXT NOT NULL DEFAULT '',
        referrer TEXT NOT NULL DEFAULT '',
        original_landing_page TEXT NOT NULL DEFAULT '',
        landing_page TEXT NOT NULL DEFAULT '',
        captured_at TEXT NOT NULL DEFAULT ''
      )`
    );
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_orders_phone_created ON orders (phone, created_at)`
    );
    // Миграция для старых БД: добавляем колонки атрибуции, строки не трогаем.
    migrateOrders(db);
  }
  return db;
}

function nowUtc(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

export function createOrder(order: NewOrder): number {
  const d = getDb();
  const findRecent = d.prepare(
    `SELECT 1 AS hit FROM orders
     WHERE phone = ? AND created_at >= datetime('now', ?)
     LIMIT 1`
  );
  const insert = d.prepare(
    `INSERT INTO orders (
      created_at, name, phone, kind, selection, comment,
      utm_source, utm_medium, utm_campaign, utm_term, utm_content,
      click_id, referrer, original_landing_page, landing_page, captured_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const tx = d.transaction((o: NewOrder) => {
    if (findRecent.get(o.phone, DEDUPE_WINDOW)) {
      throw new DuplicateOrderError();
    }
    const a = o.attribution;
    const res = insert.run(
      nowUtc(),
      o.name,
      o.phone,
      o.kind,
      o.selection,
      o.comment,
      a.utm_source ?? "",
      a.utm_medium ?? "",
      a.utm_campaign ?? "",
      a.utm_term ?? "",
      a.utm_content ?? "",
      a.click_id ?? "",
      a.referrer ?? "",
      a.original_landing_page ?? "",
      a.landing_page ?? "",
      a.captured_at ?? ""
    );
    return Number(res.lastInsertRowid);
  });
  return tx.immediate(order);
}
