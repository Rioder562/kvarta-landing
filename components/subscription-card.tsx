import { subscription } from "../data/coffees";

export default function SubscriptionCard() {
  return (
    <section id="podpiska" className="section" aria-labelledby="podpiska-title">
      <p className="section-index">03 / подписка</p>
      <h2 id="podpiska-title" className="section-title">
        Подписка на свежую обжарку
      </h2>
      <div className="subscription-card">
        <p className="subscription-big">
          {subscription.packs} пачки × {subscription.packVolume} / месяц
        </p>
        <p className="subscription-price">
          {subscription.pricePerMonth} {subscription.currency}/мес
        </p>
        <ul className="subscription-benefits">
          <li>входит в каждую обжарочную партию</li>
          <li>доставка по Минску — бесплатно</li>
          <li>отправка — по пятницам, с четверговой обжарки</li>
        </ul>
        <a className="btn btn-primary" href="#zayavka">
          Подписаться
        </a>
        <p className="subscription-note">
          Оформить подписку можно в форме заявки — отметьте тип «Подписка».
        </p>
      </div>
    </section>
  );
}
