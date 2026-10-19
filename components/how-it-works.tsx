import { workshop } from "../data/coffees";

const steps = [
  {
    n: "1",
    title: "Обжарка",
    text: `Обжариваем по четвергам партиями по ${workshop.batchKg} кг.`,
  },
  {
    n: "2",
    title: "Доставка по Минску",
    text: `По пятницам отправляем заказы по Минску — бесплатно при заказе от ${workshop.freeDeliveryFrom} BYN.`,
  },
  {
    n: "3",
    title: "Самовывоз",
    text: `Цех: ${workshop.city}, ${workshop.address}. ${workshop.pickup.weekdays}; ${workshop.pickup.weekend}.`,
  },
];

export default function HowItWorks() {
  return (
    <section id="dostavka" className="section" aria-labelledby="how-title">
      <p className="section-index">04 / как это устроено</p>
      <h2 id="how-title" className="section-title">
        От обжарки до вашей чашки
      </h2>
      <ol className="steps">
        {steps.map((s) => (
          <li key={s.n} className="step">
            <span className="step-n" aria-hidden="true">
              {s.n}
            </span>
            <div>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-text">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="steps-note">
        Зерно приходит через 1–3 дня после обжарки — и в доставку, и в
        самовывоз.
      </p>
    </section>
  );
}
