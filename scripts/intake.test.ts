import assert from "node:assert/strict";
import { test } from "node:test";
import { checklist, documentMime, intakeFlags, type Intake } from "../src/intake/documents.ts";
import { ivorianPhone } from "../src/intake/phone.ts";

const baseline: Intake = {
  answers: { form: "SARL", capital: "1000000", address: "yes", statutes: "private",
    trade: "no", sector: "services", package: "essentiel" },
  flags: Object.fromEntries(intakeFlags.map((flag) => [flag, false])) as Intake["flags"],
};

test("accepts common spellings of a Côte d’Ivoire number and rejects other country codes", () => {
  assert.equal(ivorianPhone("07 00 00 00 00"), "+2250700000000");
  assert.equal(ivorianPhone("+225 (07) 00-00-00-00"), "+2250700000000");
  assert.equal(ivorianPhone("002250700000000"), "+2250700000000");
  assert.equal(ivorianPhone("+2290700000000"), null);
  assert.equal(ivorianPhone("+225+0700000000"), null);
});

test("adds notarial and conditional documents without requiring an existing domiciliation agreement", () => {
  const initial = checklist(baseline);
  assert.equal(initial.find((item) => item.id === "address")?.required, true);
  assert.equal(initial.some((item) => item.id === "notarySlip"), false);
  const result = checklist({
    answers: { ...baseline.answers, address: "no", statutes: "notarized" },
    flags: { ...baseline.flags, companyPartner: true, inKind: true },
  });
  assert.equal(result.find((item) => item.id === "address")?.required, false);
  for (const id of ["notarySlip", "parentStatutes", "parentRegistration", "compliance"]) {
    assert.ok(result.some((item) => item.id === id && item.required));
  }
});

test("accepts supported file signatures and rejects text disguised as a document", () => {
  assert.equal(documentMime(Buffer.from("%PDF-1.4")), "application/pdf");
  assert.equal(documentMime(Buffer.from([0xff, 0xd8, 0xff, 0xd9])), "image/jpeg");
  assert.equal(documentMime(Buffer.from("<script>")), null);
});
