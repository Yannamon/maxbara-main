import { pricing } from "../config/pricing";
import { computeQuote } from "../server/quote";
import { readQuiz, type Locale, type Package, type Query, type Quiz } from "./answers";
import { copy, money, paths } from "./copy";
import { SiteFrame } from "./frame";
import { QuizForm } from "./quiz-form";
import { Receipt } from "./receipt";
import { HeroBackdrop, HeroBanner } from "./motion";
import { marketing } from "./marketing";
import { PackageCard } from "./package-card";
import { publicSiteOrigin } from "./seo";

export function Landing({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const market = marketing[locale];
  const links = paths[locale];
  const example = computeQuote({ ...pricing.scenario, package: "essentiel", hasAddress: true });
  const [support, formation] = example.lines.reduce(
    ([service, fees], row) => row.code === "service" ? [row.amountFcfa, fees] : [service, fees + row.amountFcfa],
    [0, 0],
  );
  const packages = Object.keys(pricing.packages) as Package[];

  return (
    <SiteFrame locale={locale}>
      <main className="landing">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org", "@type": "Service", name: "Max Bara",
          serviceType: locale === "fr" ? "Accompagnement à la création d’entreprise" : "Company formation support",
          description: market.description, areaServed: { "@type": "Country", name: "Côte d’Ivoire" },
          provider: { "@type": "Organization", name: "Max Bara", ...(publicSiteOrigin() ? { url: publicSiteOrigin() } : {}) },
          ...(publicSiteOrigin() ? { url: `${publicSiteOrigin()}${links.home}` } : {}),
        }).replace(/</g, "\\u003c") }} />
        <HeroBanner>
          <div className="hero-copy">
            <p className="eyebrow hero-eyebrow">{market.eyebrow}</p>
            <h1>{t.hero.title}<br /><em>{t.hero.emphasis}</em></h1>
            <p className="hero-description">{market.description}</p>
            <div className="hero-actions">
              <a className="button" href="#devis">{t.nav.estimate}</a>
              <a className="hero-secondary" href={locale === "fr" ? "/checklist" : "/en/checklist"}>{market.checklist}</a>
              <span>{t.hero.free}</span>
            </div>
          </div>
          <div className="receipt-stage">
            <HeroBackdrop />
            <div className="stage-rule" aria-hidden="true" />
            <Receipt locale={locale} reference={t.receipt.exampleRef} name={t.receipt.exampleName}
              capital={pricing.scenario.capitalFcfa} total={example.totalFcfa} sample
              rows={[{ label: t.receipt.related, amountFcfa: formation }, { label: t.receipt.service, amountFcfa: support }]} />
            <a className="stage-link" href="#devis">{t.receipt.show}</a>
          </div>
        </HeroBanner>

        <section className="shell services" id="services" aria-label={t.nav.services}>
          {t.services.map((item) => (
            <article className="service" key={item.icon}>
              <div className="service-icon" aria-hidden="true"><i className={`icon-${item.icon}`} /></div>
              <div><h2>{item.title}</h2><p>{item.description}</p></div>
            </article>
          ))}
        </section>

        <section className="shell audience-section" aria-labelledby="audience-title">
          <h2 id="audience-title">{market.audienceTitle}</h2>
          <div className="audience-grid">{market.audiences.map(audience => <article key={audience.title}><h3>{audience.title}</h3><p>{audience.description}</p></article>)}</div>
          <a className="text-action" href={locale === "fr" ? "/rendez-vous" : "/en/appointments"}>{market.appointment}</a>
        </section>

        <section className="quiz-band" id="devis" aria-labelledby="quiz-title">
          <div className="shell quiz-grid">
            <div className="quiz-heading">
              <p className="eyebrow">{t.quiz.eyebrow}</p>
              <h2 id="quiz-title">{t.quiz.title}</h2>
              <p>{t.quiz.intro}</p>
              <p className="scope-note">{t.quiz.coverage}</p>
            </div>
            <QuizForm locale={locale} answers={readQuiz({}).answers} />
          </div>
        </section>

        <section className="shell prices" id="tarifs" aria-labelledby="prices-title">
          <header>
            <h2 id="prices-title">{t.prices.title}</h2>
            <p>{market.packageIntro}</p>
          </header>
          <div className="price-grid">
            {packages.map((plan) => (
              <PackageCard key={plan} title={t.packages[plan]} summary={market.packages[plan].summary} benefits={market.packages[plan].benefits} detailsLabel={market.packageDetails} scope={market.packageScope}>
                <p>{plan === "agrement" && <span>{t.receipt.from}</span>}<strong>{money(pricing.packages[plan].amountFcfa, locale)}</strong> <small>FCFA</small></p>
                <a className="button button-outline button-small" aria-label={`${t.prices.select} ${t.packages[plan]}`}
                  href={`${links.quote}?package=${plan}#devis`}>{t.prices.select}</a>
              </PackageCard>
            ))}
          </div>
        </section>
        <section className="shell journey-section" aria-labelledby="journey-title">
          <h2 id="journey-title">{market.processTitle}</h2><p className="journey-intro">{market.processIntro}</p>
          <ol className="journey-grid">{market.steps.map(step => <li key={step.title}><h3>{step.title}</h3><p>{step.description}</p></li>)}</ol>
        </section>
        <section className="shell investor-faq" aria-labelledby="faq-title"><h2 id="faq-title">{market.faqTitle}</h2>
          {market.faq.map(item => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}
          <a className="text-action" href={locale === "fr" ? "/rendez-vous" : "/en/appointments"}>{market.appointment}</a>
        </section>
      </main>
    </SiteFrame>
  );
}

function EstimateResult({ locale, quiz }: { locale: Locale; quiz: Quiz }) {
  const t = copy[locale];
  const links = paths[locale];

  if (quiz.state === "invalid" || quiz.state === "draft") {
    return <div className="review-card"><p>{quiz.state === "invalid" ? t.quiz.invalid : t.result.empty}</p></div>;
  }

  return (
    <>
      {quiz.state === "quoted" ? (
        <>
          <Receipt locale={locale} reference={quiz.reference} name={`${quiz.answers.form} · ${t.quiz.sectors[quiz.answers.sector]}`}
            capital={Number(quiz.answers.capital)} total={quiz.quote.totalFcfa} startingAt={quiz.quote.kind === "starting_at"}
            rows={quiz.quote.lines.map((line) => ({
              label: line.code === "service" ? `${t.lines.service} · ${t.packages[quiz.answers.package]}`
                : t.lines[line.code],
              amountFcfa: line.amountFcfa,
            }))} />
          <p className="estimate-note">{t.receipt.notice}</p>
        </>
      ) : (
        <div className="review-card">
          <p className="eyebrow">{quiz.reference}</p>
          <h3>{t.result.review}</h3>
          <p>{t.result.reviewCopy}</p>
        </div>
      )}
      <a className="button result-cta" href={`${links.start}${quiz.suffix}`}>{t.result.start}</a>
      <a className="text-action" href="#devis">{t.result.edit}</a>
    </>
  );
}

export async function EstimatePage({ locale, query }: { locale: Locale; query: Promise<Query> }) {
  const quiz = readQuiz(await query);
  const t = copy[locale];

  return (
    <SiteFrame locale={locale} section="quote" suffix={quiz.suffix}>
      <main className="shell estimate-page">
        <div className="estimate-grid">
          <section className="estimate-input" id="devis" aria-labelledby="quiz-title">
            <p className="eyebrow">{t.quiz.eyebrow}</p>
            <h1 id="quiz-title">{t.quiz.title}</h1>
            <p className="scope-note">{t.quiz.coverage}</p>
            <QuizForm locale={locale} answers={quiz.answers} submitted={quiz.state !== "draft"} />
          </section>
          <section className="estimate-output" id="resultat" aria-labelledby="result-title" tabIndex={-1}>
            <h2 id="result-title">{t.result.title}</h2>
            <EstimateResult locale={locale} quiz={quiz} />
          </section>
        </div>
      </main>
    </SiteFrame>
  );
}
