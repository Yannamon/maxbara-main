"use client";

import { useRef, type ReactNode } from "react";

export function PackageCard({ title, summary, benefits, detailsLabel, scope, children }: {
  title: string; summary: string; benefits: readonly string[]; detailsLabel: string; scope: string; children: ReactNode;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  const pinned = useRef(false);
  return <article className="price-card" onPointerEnter={event => { if (event.pointerType === "mouse" && details.current) details.current.open = true; }}
    onPointerLeave={event => { if (event.pointerType === "mouse" && details.current && !pinned.current && !details.current.contains(document.activeElement)) details.current.open = false; }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null) && !pinned.current && details.current && !event.currentTarget.matches(":hover")) details.current.open = false; }}
    onKeyDown={event => { if (event.key === "Escape" && details.current) { details.current.open = false; pinned.current = false; } }}>
    <h3>{title}</h3>
    <p className="package-summary">{summary}</p>
    {children}
    <details ref={details} className="package-benefits">
      <summary onClick={() => { pinned.current = !details.current?.open; }}>{detailsLabel}</summary>
      <div className="package-benefits-content"><ul>{benefits.map(benefit => <li key={benefit}>{benefit}</li>)}</ul><small>{scope}</small></div>
    </details>
  </article>;
}
