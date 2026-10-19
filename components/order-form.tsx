"use client";

import { FormEvent, useState } from "react";

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

export default function OrderForm() {
  const [kind, setKind] = useState<OrderKind>("one-off");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<Status>({ state: "idle" });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status.state === "submitting" || status.state === "ok") return;
    setStatus({ state: "submitting" });
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          kind,
          selection: comment.trim(),
          comment: "",
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        id?: number;
        error?: string;
      };
      if (res.status === 201 && data.ok && typeof data.id === "number") {
        setStatus({ state: "ok", id: data.id });
        setName("");
        setPhone("");
        setComment("");
      } else {
        setStatus({
          state: "error",
          message: data.error ?? "Не удалось отправить заявку",
        });
      }
    } catch {
      setStatus({ state: "error", message: "Не удалось отправить заявку" });
    }
  }

  const submitting = status.state === "submitting";
  const done = status.state === "ok";

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
                  disabled={submitting || done}
                />
                {kindLabels[k]}
              </label>
            ))}
          </div>
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
            disabled={submitting || done}
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
            disabled={submitting || done}
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
            placeholder={
              kind === "one-off"
                ? "Сорта и количество"
                : "Сорта для подписки"
            }
            disabled={submitting || done}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={submitting || done}
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
