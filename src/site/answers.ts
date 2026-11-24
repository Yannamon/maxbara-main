import { createHash } from "node:crypto";
import { pricing } from "../config/pricing";
import { computeQuote, QuoteError, type QuoteRequest } from "../server/quote";

export type Locale = "fr" | "en";
export type Query = Record<string, string | string[] | undefined>;
export type Package = QuoteRequest["package"];

export const legalForms = ["SARL", "SAS", "SA", "other"] as const;
export const sectors = ["services", "commerce", "technology", "industry", "agriculture", "other"] as const;

type Answers = {
  form: (typeof legalForms)[number];
  capital: string;
  address: "yes" | "no";
  statutes: "private" | "notarized";
  trade: "yes" | "no";
  sector: (typeof sectors)[number];
  package: Package;
};

const defaults: Answers = {
  form: pricing.scenario.legalForm,
  capital: String(pricing.scenario.capitalFcfa),
  address: "yes",
  statutes: "private",
  trade: "no",
  sector: "services",
  package: "essentiel",
};

export type Estimate = ReturnType<typeof computeQuote>;

export function readQuiz(query: Query) {
  const submitted = query.estimate === "1";
  const { form, capital, address, statutes, trade, sector, package: plan } = query;
  const isForm = (value: unknown): value is Answers["form"] =>
    legalForms.some((item) => item === value);
  const isSector = (value: unknown): value is Answers["sector"] =>
    sectors.some((item) => item === value);
  const isPlan = (value: unknown): value is Package =>
    typeof value === "string" && Object.hasOwn(pricing.packages, value);
  const isYesNo = (value: unknown): value is "yes" | "no" =>
    value === "yes" || value === "no";
  const isStatutes = (value: unknown): value is Answers["statutes"] =>
    value === "private" || value === "notarized";
  const isCapital = (value: unknown): value is string =>
    typeof value === "string" && /^[0-9]{1,15}$/.test(value) && Number(value) > 0;

  const answers: Answers = {
    form: isForm(form) ? form : defaults.form,
    capital: isCapital(capital) ? String(Number(capital)) : defaults.capital,
    address: isYesNo(address) ? address : defaults.address,
    statutes: isStatutes(statutes) ? statutes : defaults.statutes,
    trade: isYesNo(trade) ? trade : defaults.trade,
    sector: isSector(sector) ? sector : defaults.sector,
    package: isPlan(plan) ? plan : defaults.package,
  };

  if (!submitted) return { answers, state: "draft" as const, suffix: isPlan(plan) ? `?package=${plan}` : "" };

  if (
    !isForm(form) || !isCapital(capital) || !isYesNo(address) || !isStatutes(statutes)
    || !isYesNo(trade) || !isSector(sector) || !isPlan(plan)
  ) {
    return { answers, state: "invalid" as const, suffix: "" };
  }

  const suffix = `?${new URLSearchParams({ ...answers, estimate: "1" }).toString()}`;
  const reference = `MB-EST-${createHash("sha256").update(suffix).digest("hex").slice(0, 8).toUpperCase()}`;

  try {
    const quote = computeQuote({
      legalForm: answers.form,
      capitalFcfa: Number(answers.capital),
      package: answers.package,
      hasAddress: answers.address === "yes",
      notarized: answers.statutes === "notarized",
      needsImportExport: answers.trade === "yes",
    });
    return { answers, state: "quoted" as const, suffix, reference, quote };
  } catch (error) {
    if (!(error instanceof QuoteError)) throw error;
    return { answers, state: "review" as const, suffix, reference };
  }
}

export type Quiz = ReturnType<typeof readQuiz>;
export type QuizAnswers = Quiz["answers"];
