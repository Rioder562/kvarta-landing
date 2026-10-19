import { workshop } from "../data/coffees";

export default function SiteFooter() {
  return (
    <footer id="kontakt" className="site-footer">
      <div className="footer-grid">
        <div>
          <h2 className="footer-title">Контакт</h2>
          <p className="footer-line">
            {workshop.city}, {workshop.address}
          </p>
          <p className="footer-line">Самовывоз:</p>
          <p className="footer-line mono">
            {workshop.pickup.weekdays}
          </p>
          <p className="footer-line mono">{workshop.pickup.weekend}</p>
        </div>
        <div>
          <h2 className="footer-title">Доставка</h2>
          <p className="footer-line">
            {workshop.city}: по пятницам, бесплатно при заказе от{" "}
            {workshop.freeDeliveryFrom} BYN.
          </p>
          <p className="footer-line">Зерно приходит через 1–3 дня.</p>
        </div>
        <div>
          <h2 className="footer-title">Ритм</h2>
          <p className="footer-line">
            Обжарка — {workshop.roastDay}, {workshop.batchKg} кг.
          </p>
          <p className="footer-line">В обжарке с {workshop.since} года.</p>
        </div>
      </div>
      <p className="footer-wordmark mono">кварта · Минск</p>
    </footer>
  );
}
