"use client";

import { useEffect, useRef, useState } from "react";

export default function StickyCta() {
  const [visible, setVisible] = useState(false);
  const probeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = probeRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setVisible(entry.isIntersecting);
        }
      },
      { rootMargin: "0px 0px -80px 0px", threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={probeRef} className="sticky-probe" aria-hidden="true" />
      <div className={visible ? "sticky-cta is-visible" : "sticky-cta"}>
        <span className="sticky-cta-label">
          Подписка · 54 BYN/мес
        </span>
        <a className="btn btn-primary" href="#zayavka">
          Подать заявку
        </a>
      </div>
    </>
  );
}
