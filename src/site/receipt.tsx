import type { Locale } from "./answers";
import { copy, money } from "./copy";

export function Receipt({
  locale,
  reference,
  name,
  capital,
  rows,
  total,
  sample = false,
  startingAt = false,
}: {
  locale: Locale;
  reference: string;
  name: string;
  capital: number;
  rows: { label: string; amountFcfa: number; annotation?: string }[];
  total: number;
  sample?: boolean;
  startingAt?: boolean;
}) {
  const t = copy[locale].receipt;
  return (
    <article className={`receipt${sample ? " receipt-sample" : ""}`}>
      <header className="receipt-header">
        <div>
          <p className="eyebrow">{sample ? t.sample : t.estimated}</p>
          <p className="receipt-reference">{reference}</p>
        </div>
        <div className="receipt-stamp" aria-hidden="true">
          <span>MAX BARA</span><b>{t.stamp}</b><span>CI</span>
        </div>
      </header>
      <h3 className="receipt-name">{name}</h3>
      <p className="receipt-capital">{t.summary} · {money(capital, locale)} FCFA</p>
      <dl className="receipt-lines">
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}{row.annotation && <small className="verification-badge receipt-verification">{row.annotation}</small>}</dt>
            <dd>{money(row.amountFcfa, locale)} <span>FCFA</span></dd>
          </div>
        ))}
      </dl>
      <div className="receipt-total">
        <span>{startingAt ? t.from : t.total}</span>
        <strong>{money(total, locale)} <small>FCFA</small></strong>
      </div>
    </article>
  );
}
