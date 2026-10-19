"use client";

import { useEffect, useState } from "react";
import { subscription } from "../data/coffees";

export default function StickyCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const ticket = document.getElementById("top");
    if (!ticket || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setVisible(!entry.isIntersecting);
        }
      },
      { rootMargin: "0px 0px -80px 0px", threshold: 0 }
    );
    observer.observe(ticket);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={visible ? "sticky-cta is-visible" : "sticky-cta"}>
      <div className="sticky-cta-inner">
        <span className="sticky-cta-label">
          Подписка · {subscription.pricePerMonth} {subscription.currency}/мес
        </span>
        <a className="btn btn-primary" href="#zayavka">
          Подать заявку
        </a>
      </div>
    </div>
  );
}
