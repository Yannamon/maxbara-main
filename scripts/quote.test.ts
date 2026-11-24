import assert from "node:assert/strict";
import { test } from "node:test";
import { pricing } from "../src/config/pricing.ts";
import { computeQuote, type QuoteRequest } from "../src/server/quote.ts";

const standard: QuoteRequest = {
  legalForm: "SARL",
  capitalFcfa: 1_000_000,
  package: "essentiel",
  hasAddress: true,
};

test("the standard estimate includes formation fees and defaults to private statutes", () => {
  const quote = computeQuote(standard);
  assert.equal(quote.statutes, "private_deed");
  assert.equal(quote.totalFcfa, 149_000);
  assert.equal(quote.costFloorFcfa, 22_000);
  assert.deepEqual(quote.lines.map((line) => line.code), [
    "gufe", "enregistrement", "dfe", "timbre", "publication", "service",
  ]);
  assert.equal(quote.lines.find((line) => line.code === "enregistrement")?.verifiedOn, null);
  assert.equal(quote.requiresVerification, true);
  assert.ok(quote.lines.every((line) => line.source));
});

test("optional services increase the total and cost floor by the same amount", () => {
  const quote = computeQuote({ ...standard, hasAddress: false, notarized: true });
  assert.equal(quote.statutes, "notarized");
  assert.equal(quote.totalFcfa, 470_600);
  assert.equal(quote.costFloorFcfa, 343_600);
  assert.equal(quote.lines.reduce((sum, line) => sum + line.amountFcfa, 0), quote.totalFcfa);
});

test("each package uses its configured price and Agrément is a starting price", () => {
  const expected = { essentiel: 149_000, serenite: 299_000, diaspora: 450_000, agrement: 750_000 } as const;
  for (const name of Object.keys(expected) as Array<keyof typeof expected>) {
    const quote = computeQuote({ ...standard, package: name });
    assert.equal(quote.totalFcfa, expected[name]);
    assert.equal(quote.kind, name === "agrement" ? "starting_at" : "estimate");
  }
});

test("the import/export code is charged only when requested", () => {
  const quote = computeQuote({ ...standard, needsImportExport: true });
  const trade = quote.lines.find((line) => line.code === "import_export");
  assert.equal(trade?.amountFcfa, 30_000);
  assert.equal(quote.totalFcfa, 179_000);
  assert.equal(quote.costFloorFcfa, 52_000);
  assert.ok(trade?.verifiedOn);
});

test("unsupported inputs do not receive an estimate", () => {
  assert.throws(() => computeQuote({ ...standard, capitalFcfa: 2_000_000 }), { code: "UNSUPPORTED_SCENARIO" });
  assert.throws(() => computeQuote({ ...standard, legalForm: "SA" }), { code: "UNSUPPORTED_SCENARIO" });
  assert.throws(() => computeQuote({ ...standard, package: "constructor" as QuoteRequest["package"] }), {
    code: "INVALID_SELECTION",
  });
});

test("the server refuses a package configured below the cost floor", () => {
  const originalAmount = pricing.packages.essentiel.amountFcfa;
  try {
    pricing.packages.essentiel.amountFcfa = 21_999;
    assert.throws(() => computeQuote({ ...standard, hasAddress: false }), { code: "BELOW_COST_FLOOR" });
    pricing.packages.essentiel.amountFcfa = 22_000;
    assert.equal(computeQuote(standard).totalFcfa, 22_000);
  } finally {
    pricing.packages.essentiel.amountFcfa = originalAmount;
  }
});
