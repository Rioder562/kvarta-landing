import { coffees, workshop } from "../data/coffees";

export default function RoastTicket() {
  return (
    <section id="top" className="ticket" aria-labelledby="ticket-title">
      <p className="ticket-stamp">талон обжарочной партии</p>
      <h1 id="ticket-title" className="ticket-title">
        Обжарка — {workshop.roastDay}
      </h1>
      <dl className="ticket-rows">
        <div>
          <dt>Партия</dt>
          <dd>{workshop.batchKg} кг</dd>
        </div>
        <div>
          <dt>Цех</dt>
          <dd>
            {workshop.city}, {workshop.address}
          </dd>
        </div>
        <div>
          <dt>Зерно у вас</dt>
          <dd>через 1–3 дня после обжарки</dd>
        </div>
      </dl>
      <h2 className="ticket-subtitle">В этой обжарке:</h2>
      <ul className="ticket-varieties" aria-label="Сорта в партии">
        {coffees.map((c) => (
          <li key={c.id}>
            <span className="ticket-index">{c.index}</span>
            <span>{c.name}</span>
            <span className="ticket-dots" aria-hidden="true" />
            <span className="ticket-price">{c.price} BYN</span>
          </li>
        ))}
      </ul>
      <div className="ticket-cta">
        <a className="btn btn-primary" href="#zayavka">
          Подать заявку
        </a>
        <a className="btn btn-ghost" href="#cofe">
          Смотреть кофе
        </a>
      </div>
    </section>
  );
}
