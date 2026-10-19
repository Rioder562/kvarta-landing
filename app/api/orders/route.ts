import { NextRequest, NextResponse } from "next/server";
import {
  createOrder,
  DuplicateOrderError,
  type OrderKind,
} from "@/lib/db";
import { collectAttribution, type Attribution } from "@/lib/attribution";
import { normalizeBelarusPhone } from "@/lib/phone";

const KINDS: OrderKind[] = ["one-off", "subscription"];

function badField(field: string, msg: string) {
  return NextResponse.json({ ok: false, error: msg, field }, { status: 400 });
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

// Клиент присылает словари UTM-параметров; принимает только JSON-объекты
// со строковыми значениями, иначе — пустой словарь.
function asStringRecord(v: unknown): Record<string, unknown> | null {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return null;
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === "string") out[k] = val;
  }
  return out;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badField("body", "Тело запроса должно быть JSON");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return badField("body", "Тело запроса должно быть JSON-объектом");
  }

  const raw = body as Record<string, unknown>;

  const name = (asString(raw.name) ?? "").trim();
  if (!name) return badField("name", "Укажите имя");
  if (name.length > 100)
    return badField("name", "Имя не должно быть длиннее 100 символов");

  const rawPhone = asString(raw.phone);
  if (rawPhone === null || rawPhone.trim() === "") {
    return badField("phone", "Укажите телефон");
  }
  const phone = normalizeBelarusPhone(rawPhone);
  if (!phone) {
    return badField(
      "phone",
      "Телефон должен быть белорусским, например +375291234567"
    );
  }

  const kind = asString(raw.kind);
  if (kind !== "one-off" && kind !== "subscription") {
    return badField(
      "kind",
      "Тип заявки должен быть 'one-off' или 'subscription'"
    );
  }

  const selection = (asString(raw.selection) ?? "").trim().slice(0, 500);
  const comment = (asString(raw.comment) ?? "").trim().slice(0, 1000);

  // Рекламная атрибуция из клиентских данных. Клиентские значения считаются
  // не подтверждёнными и небезопасными: collectAttribution пропускает только
  // whitelist и нормализует формат, всё остальное отбрасывается.
  const attribution: Attribution = collectAttribution({
    utm: asStringRecord(raw.utm) ?? {},
    utm_original: asStringRecord(raw.utm_original) ?? {},
    referrer: asString(raw.referrer) ?? "",
    original_landing_page: asString(raw.original_landing_page) ?? "",
    landing_page: asString(raw.landing_page) ?? "",
    captured_at: asString(raw.captured_at) ?? "",
  });

  try {
    const id = createOrder({ name, phone, kind, selection, comment, attribution });
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    if (err instanceof DuplicateOrderError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Заявка с этим телефоном уже получена, попробуйте позже",
        },
        { status: 409 }
      );
    }
    console.error("POST /api/orders failed:", err);
    return NextResponse.json(
      { ok: false, error: "Не удалось сохранить заявку" },
      { status: 500 }
    );
  }
}
