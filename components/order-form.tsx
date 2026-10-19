"use client";

import { FormEvent, useState } from "react";

type OrderKind = "one-off" | "subscription";

const kindLabels: Record<OrderKind, string> = {
  "one-off": "Разовый заказ",
  subscription: "Подписка",
};

export default function OrderForm() {
  const [kind, setKind] = useState<OrderKind>("one-off");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [prepared, setPrepared] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPrepared(true);
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
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block">
          Подготовить заявку
        </button>
      </form>

      <p className="form-note" role="status">
        {prepared &&
          `Заявка (${kindLabels[kind]}) подготовлена, но не сохранена: форма пока в режиме превью — приём заявок появится на следующем этапе.`}
      </p>
    </section>
  );
}
