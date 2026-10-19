"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { coffees } from "../data/coffees";
import {
  captureInitialLanding,
  collectAttributionFromWindow,
} from "../lib/attribution-client";

type OrderKind = "one-off" | "subscription";

const kindLabels: Record<OrderKind, string> = {
  "one-off": "Разовый заказ",
  subscription: "Подписка",
};

type Status =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "ok"; id: number }
  | { state: "error"; message: string };

const MAX_QTY = 20;

export default function OrderForm() {
  const [kind, setKind] = useState<OrderKind>("one-off");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<Status>({ state: "idle" });

  const submitting = status.state === "submitting";
  const done = status.state === "ok";
  const locked = submitting || done;

  useEffect(() => {
    captureInitialLanding();
  }, []);

  const selectionText = useMemo(() => {
    const items = coffees.filter((c) => selection[c.id]);
    if (items.length === 0) return "";
    return items
      .map((c) =>
        kind === "one-off"
          ? `${c.name} ${c.volume} × ${quantities[c.id] ?? 1}`
          : c.name
      )
      .join(", ");
  }, [selection, quantities, kind]);

  function toggleItem(id: string) {
    setSelection((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function changeQty(id: string, delta: number) {
    setQuantities((prev) => {
      const cur = prev[id] ?? 1;
      const next = Math.min(MAX_QTY, Math.max(1, cur + delta));
      return { ...prev, [id]: next };
    });
  }

  function resetFields() {
    setName("");
    setPhone("");
    setSelection({});
    setQuantities({});
    setComment("");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status.state === "submitting" || status.state === "ok") return;
    setStatus({ state: "submitting" });
    try {
      const attribution = collectAttributionFromWindow();
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          kind,
          selection: selectionText,
          comment: comment.trim(),
          utm: attribution.utm,
          utm_original: attribution.utm_original,
          referrer: attribution.referrer,
          original_landing_page: attribution.original_landing_page,
          landing_page: attribution.landing_page,
          captured_at: attribution.captured_at,
        }),
      });
      let data: { ok: boolean; id?: number; error?: string } | null = null;
      try {
        data = (await res.json()) as {
          ok: boolean;
          id?: number;
          error?: string;
        };
      } catch {
        data = null;
      }
      if (
        res.status === 201 &&
        data &&
        data.ok &&
        typeof data.id === "number"
      ) {
        setStatus({ state: "ok", id: data.id });
        resetFields();
      } else {
        setStatus({
          state: "error",
          message: data?.error ?? "Не удалось отправить заявку",
        });
      }
    } catch {
      setStatus({ state: "error", message: "Не удалось отправить заявку" });
    }
  }

  return (
    <section id="zayavka" className="section" aria-labelledby="zayavka-title">
      <p className="section-index">06 / заявка</p>
      <h2 id="zayavka-title" className="section-title">
        Подать заявку
      </h2>
      <p className="form-intro">
        Оставьте заявку — свяжемся с вами, чтобы уточнить состав заказа.
      </p>
      <form className="order-form" onSubmit={handleSubmit}>
        <div className="field" role="radiogroup" aria-label="Тип заявки">
          <span className="field-label">Тип заявки</span>
          <div className="segment">
            {(Object.keys(kindLabels) as OrderKind[]).map((k) => (
              <label key={k} className={kind === k ? "seg is-active" : "seg"}>
                <input
                  type="radio"
                  name="kind"
                  value={k}
                  checked={kind === k}
                  onChange={() => setKind(k)}
                  className="seg-input"
                  disabled={locked}
                />
                {kindLabels[k]}
              </label>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field-label" id="order-items-label">
            {kind === "one-off"
              ? "Товары (количество)"
              : "Сорта для подписки"}
          </span>
          <div className="item-list" aria-labelledby="order-items-label">
            {coffees.map((c) => {
              const checked = !!selection[c.id];
              return (
                <div key={c.id} className={checked ? "item-row is-checked" : "item-row"}>
                  <label className="item-check">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleItem(c.id)}
                      disabled={locked}
                      aria-label={c.name}
                    />
                    <span className="item-name">{c.name}</span>
                    <span className="item-side">
                      <span className="item-volume">{c.volume}</span>
                      <span className="item-price">{c.price} BYN</span>
                    </span>
                  </label>
                  {kind === "one-off" && checked && (
                    <div className="qty">
                      <button
                        type="button"
                        className="qty-btn"
                        aria-label={`Меньше: ${c.name}`}
                        onClick={() => changeQty(c.id, -1)}
                        disabled={locked}
                      >
                        −
                      </button>
                      <span className="qty-value">
                        {quantities[c.id] ?? 1}
                      </span>
                      <button
                        type="button"
                        className="qty-btn"
                        aria-label={`Больше: ${c.name}`}
                        onClick={() => changeQty(c.id, 1)}
                        disabled={locked}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {kind === "subscription" && (
            <p className="field-hint">2 пачки × 250 г в месяц, 54 BYN/мес.</p>
          )}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="order-name">
            Имя
          </label>
          <input
            id="order-name"
            className="field-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            disabled={locked}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="order-phone">
            Телефон
          </label>
          <input
            id="order-phone"
            className="field-input"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            autoComplete="tel"
            placeholder="+375"
            disabled={locked}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="order-comment">
            Комментарий
          </label>
          <textarea
            id="order-comment"
            className="field-input field-textarea"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Состав, адрес, удобное время доставки"
            disabled={locked}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={locked}
        >
          {done
            ? "Заявка отправлена"
            : submitting
              ? "Отправляем…"
              : "Подать заявку"}
        </button>
      </form>

      <p className="form-note" role="status" aria-live="polite">
        {done
          ? `Заявка №${status.id} принята. Мы свяжемся с вами.`
          : status.state === "error"
            ? status.message
            : "Свяжемся с вами по указанному телефону, чтобы уточнить детали."}
      </p>
    </section>
  );
}
