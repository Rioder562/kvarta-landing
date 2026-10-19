import { workshop } from "../data/coffees";

const links = [
  { href: "#cofe", label: "Кофе" },
  { href: "#podpiska", label: "Подписка" },
  { href: "#dostavka", label: "Доставка" },
  { href: "#kontakt", label: "Контакт" },
];

export default function Header() {
  return (
    <header className="site-header">
      <a className="wordmark" href="#top" aria-label="Кварта — к началу страницы">
        <span className="wordmark-text">Кварта</span>
        <span className="wordmark-sub">обжарочный цех</span>
      </a>
      <p className="header-tagline">
        {workshop.city} · обжарка по четвергам
      </p>
      <nav className="site-nav" aria-label="Основная навигация">
        <ul>
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href}>{l.label}</a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
