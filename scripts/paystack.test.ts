import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { paystackAmount, paymentMatches, validPaystackSignature, type VerifiedTransaction } from "../src/payments/validation.ts";

test("converts whole FCFA to Paystack units without rounding or overflow", () => {
  assert.equal(paystackAmount(149000), 14900000);
  for (const value of [0, -1, 1.5, NaN, Number.MAX_SAFE_INTEGER]) assert.throws(() => paystackAmount(value));
});

test("only accepts a successful matching payment, amount, currency, mode and metadata", () => {
  const expected = { reference: "MBP-example", paymentId: "payment-id", amountFcfa: 149000, mode: "test" as const };
  const data: VerifiedTransaction = { status: "success", reference: expected.reference, amount: 14900000, currency: "XOF", domain: "test", metadata: { payment_id: expected.paymentId }, paid_at: "2026-11-24T12:00:00Z" };
  assert.equal(paymentMatches(data, expected), true);
  for (const changes of [{ amount: 149000 }, { currency: "NGN" }, { reference: "other" }, { domain: "live" }, { metadata: null }, { metadata: { payment_id: "other" } }, { status: "pending" }, { paid_at: "invalid" }]) {
    assert.equal(paymentMatches({ ...data, ...changes }, expected), false);
  }
});

test("verifies timestamped raw-body webhook signatures and rotation; blocks replay and downgrade", () => {
  const body = '{"event":"charge.success"}';
  const secret = "whsec_test_example";
  const now = 1800000000;
  const signature = createHmac("sha512", secret).update(`${now}.${body}`).digest("hex");
  const headers = { modern: `t=${now},v1=whk_old:${"0".repeat(128)},v1=whk_new:${signature}`, legacy: null };
  assert.equal(validPaystackSignature(body, headers, { api: "sk_test_example", webhook: secret }, now), true);
  assert.equal(validPaystackSignature(body + " ", headers, { api: "sk_test_example", webhook: secret }, now), false);
  assert.equal(validPaystackSignature(body, headers, { api: "sk_test_example", webhook: secret }, now + 301), false);
  assert.equal(validPaystackSignature(body, { modern: null, legacy: createHmac("sha512", "sk_test_example").update(body).digest("hex") }, { api: "sk_test_example", webhook: secret }, now), false);
});

test("supports legacy signatures when no dedicated webhook secret is configured", () => {
  const body = '{ "event": "charge.success" }';
  const secret = "sk_test_example";
  const signature = createHmac("sha512", secret).update(body).digest("hex");
  assert.equal(validPaystackSignature(body, { modern: null, legacy: signature }, { api: secret }), true);
  assert.equal(validPaystackSignature(body, { modern: null, legacy: "bad" }, { api: secret }), false);
});
