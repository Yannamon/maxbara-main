import assert from "node:assert/strict";
import { test } from "node:test";
import { documentFields, parseDocumentDraft } from "../src/intake/document-fields.ts";
import { checklist, intakeFlags, type Intake } from "../src/intake/documents.ts";

test("provides a separate form schema for every possible checklist document except shareholder IDs", () => {
  const intake: Intake = { answers: { form: "SARL", capital: "1000000", address: "yes", statutes: "notarized", trade: "yes", sector: "services", package: "diaspora" }, flags: Object.fromEntries(intakeFlags.map(flag => [flag, true])) as Intake["flags"] };
  for (const item of checklist(intake)) assert.equal(Boolean(documentFields[item.id]?.length), item.id !== "identity");
});

test("rejects unknown document types, blank and oversized forms, and ignores extra fields", () => {
  const form = new FormData();
  for (const [name] of documentFields.map) form.set(name, "");
  assert.equal(parseDocumentDraft("map", form), null);
  assert.equal(parseDocumentDraft("identity", form), null);
  assert.equal(parseDocumentDraft("__proto__", form), null);
  form.set("address", "Abidjan");
  form.set("case_id", "tampered");
  assert.deepEqual(parseDocumentDraft("map", form), { address: "Abidjan", landmarks: "", coordinates: "" });
  form.set("address", "x".repeat(3001));
  assert.equal(parseDocumentDraft("map", form), null);
});
