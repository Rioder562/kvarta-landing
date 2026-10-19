import Database from "better-sqlite3";
import path from "node:path";

export type OrderKind = "one-off" | "subscription";

export interface NewOrder {
  name: string;
  phone: string;
  kind: OrderKind;
  selection: string;
  comment: string;
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
        comment TEXT NOT NULL
      )`
    );
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_orders_phone_created ON orders (phone, created_at)`
    );
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
    `INSERT INTO orders (created_at, name, phone, kind, selection, comment)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const tx = d.transaction((o: NewOrder) => {
    if (findRecent.get(o.phone, DEDUPE_WINDOW)) {
      throw new DuplicateOrderError();
    }
    const res = insert.run(
      nowUtc(),
      o.name,
      o.phone,
      o.kind,
      o.selection,
      o.comment
    );
    return Number(res.lastInsertRowid);
  });
  return tx.immediate(order);
}
