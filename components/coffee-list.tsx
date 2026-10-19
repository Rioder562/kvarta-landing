import { coffees } from "../data/coffees";

export default function CoffeeList() {
  return (
    <section id="cofe" className="section" aria-labelledby="cofe-title">
      <p className="section-index">02 / каталог</p>
      <h2 id="cofe-title" className="section-title">
        Что в этой обжарке
      </h2>
      <div className="coffee-grid">
        {coffees.map((c, i) => (
          <article
            key={c.id}
            className="coffee-card"
            aria-label={`${c.name}, ${c.price} BYN`}
          >
            <div className="coffee-head">
              <span className="coffee-index">{c.index}</span>
              <span className="coffee-volume">{c.volume}</span>
            </div>
            <h3 className="coffee-name">{c.name}</h3>
            <p className="coffee-notes">{c.notes}</p>
            {c.roast && <p className="coffee-tag">{c.roast}</p>}
            {c.use && <p className="coffee-tag">{c.use}</p>}
            <p className="coffee-price">{c.price} BYN</p>
          </article>
        ))}
      </div>
    </section>
  );
}
