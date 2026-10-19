import { workshop } from "../data/coffees";

export default function About() {
  return (
    <section id="masterskaya" className="section" aria-labelledby="about-title">
      <p className="section-index">05 / мастерская</p>
      <h2 id="about-title" className="section-title">
        Мастерская
      </h2>
      <div className="about-grid">
        <div className="about-text">
          <p>
            «Кварта» — небольшая обжарочная мастерская в Минске. Основатели —
            Аня и Дмитрий, бывшие бариста, с 2019 года обжаривают свежее зерно
            партиями по {workshop.batchKg} кг.
          </p>
          <p>
            Обжарка — по четвергам, отправка — по пятницам. Держим ассортимент
            коротким: несколько сортов, которые готовы к чашке, без сложных
            программ лояльности.
          </p>
        </div>
        <dl className="about-facts">
          <div>
            <dt>Адрес цеха</dt>
            <dd>
              {workshop.city}, {workshop.address}
            </dd>
          </div>
          <div>
            <dt>В обжарке</dt>
            <dd>с {workshop.since} года</dd>
          </div>
          <div>
            <dt>Ритм</dt>
            <dd>
              обжарка — {workshop.roastDay}, отправка — {workshop.deliveryDay}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
