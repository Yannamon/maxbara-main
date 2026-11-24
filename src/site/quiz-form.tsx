import { legalForms, sectors, type Locale, type Package, type QuizAnswers } from "./answers";
import { copy, paths } from "./copy";

function Choices({
  name,
  title,
  items,
  value,
}: {
  name: string;
  title: string;
  items: { value: string; label: string }[];
  value: string;
}) {
  return (
    <fieldset className="choice-field">
      <legend>{title}</legend>
      <div className="choice-row">
        {items.map((item) => (
          <label key={item.value}>
            <input name={name} type="radio" value={item.value} defaultChecked={item.value === value} required />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function QuizForm({ locale, answers, submitted = false }: {
  locale: Locale;
  answers: QuizAnswers;
  submitted?: boolean;
}) {
  const t = copy[locale];
  const labels = t.quiz;
  const yesNo = [{ value: "yes", label: labels.yes }, { value: "no", label: labels.no }];
  const packages = Object.keys(t.packages) as Package[];

  return (
    <form className="quiz-form" action={`${paths[locale].quote}#resultat`} method="get">
      <input type="hidden" name="estimate" value="1" />
      <div className="form-grid">
        <label className="form-field select-field">
          <span>{labels.form}</span>
          <select name="form" defaultValue={answers.form}>
            {legalForms.map((form) => <option key={form} value={form}>{form === "other" ? labels.other : form}</option>)}
          </select>
        </label>
        <label className="form-field">
          <span>{labels.capital}</span>
          <span className="currency-field">
            <input aria-label={`${labels.capital} (FCFA)`} name="capital" type="text" inputMode="numeric"
              pattern="[0-9]{1,15}" maxLength={15} defaultValue={answers.capital} required />
            <span aria-hidden="true">FCFA</span>
          </span>
        </label>
        <label className="form-field select-field">
          <span>{labels.sector}</span>
          <select name="sector" defaultValue={answers.sector}>
            {sectors.map((sector) => <option key={sector} value={sector}>{labels.sectors[sector]}</option>)}
          </select>
        </label>
        <label className="form-field select-field">
          <span>{labels.plan}</span>
          <select name="package" defaultValue={answers.package}>
            {packages.map((plan) => <option key={plan} value={plan}>{t.packages[plan]}</option>)}
          </select>
        </label>
      </div>
      <Choices name="address" title={labels.address} items={yesNo} value={answers.address} />
      <Choices name="statutes" title={labels.statutes} value={answers.statutes}
        items={[{ value: "private", label: labels.private }, { value: "notarized", label: labels.notarized }]} />
      <Choices name="trade" title={labels.trade} items={yesNo} value={answers.trade} />
      <button className="button form-submit" type="submit">{submitted ? labels.update : labels.estimate}</button>
    </form>
  );
}
