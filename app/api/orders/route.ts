import { NextRequest, NextResponse } from "next/server";
import {
  createOrder,
  DuplicateOrderError,
  type OrderKind,
} from "@/lib/db";
import { normalizeBelarusPhone } from "@/lib/phone";

const KINDS: OrderKind[] = ["one-off", "subscription"];

function badField(field: string, msg: string) {
  return NextResponse.json({ ok: false, error: msg, field }, { status: 400 });
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
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

  try {
    const id = createOrder({ name, phone, kind, selection, comment });
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
