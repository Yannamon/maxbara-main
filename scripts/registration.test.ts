import assert from "node:assert/strict";
import { test } from "node:test";
import { registrationDetails, registrationFields } from "../src/intake/registration.ts";

function application() {
  const form = new FormData();
  for (const key of registrationFields) form.set(key, "");
  Object.entries({ name: "Awa Example", email: "awa@example.com", contactPhone: "+33 6 12 34 56 78", country: "France",
    company: "Example SARL", activity: "Consulting", turnover: "5000000", employees: "0",
    shareholders: "Awa Example, 100%, cash contribution", managers: "Awa Example, manager", address: "no" }).forEach(([key, value]) => form.set(key, value));
  return form;
}

test("accepts an overseas applicant without an existing Ivorian office", () => {
  const parsed = registrationDetails(application());
  assert.equal(parsed?.country, "France");
  assert.equal(parsed?.employees, "0");
  assert.equal(parsed?.registeredAddress, "");
});

test("requires the representative identity and contact only when representation is selected", () => {
  const form = application();
  form.set("representative", "on");
  assert.equal(registrationDetails(form), null);
  form.set("representativeName", "Local representative");
  form.set("representativeContact", "representative@example.com");
  assert.ok(registrationDetails(form));
});

test("rejects missing office evidence and invalid or oversized applicant data", () => {
  const form = application();
  form.set("address", "yes");
  assert.equal(registrationDetails(form), null);
  form.set("registeredAddress", "Abidjan, Cocody; lease");
  assert.ok(registrationDetails(form));
  form.set("email", "invalid");
  assert.equal(registrationDetails(form), null);
  form.set("email", "awa@example.com");
  form.set("company", "x".repeat(121));
  assert.equal(registrationDetails(form), null);
});

test("rejects fractional headcount and negative projected turnover", () => {
  const form = application();
  form.set("employees", "1.5");
  assert.equal(registrationDetails(form), null);
  form.set("employees", "1");
  form.set("turnover", "-1");
  assert.equal(registrationDetails(form), null);
});
