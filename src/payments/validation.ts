import { createHmac, timingSafeEqual } from "node:crypto";

export function paystackAmount(fcfa: number): number {
  if (!Number.isSafeInteger(fcfa) || fcfa < 1 || !Number.isSafeInteger(fcfa * 100)) throw new Error("Invalid payment amount.");
  return fcfa * 100;
}

function sameSignature(expected: string, received: string): boolean {
  return /^[0-9a-f]{128}$/i.test(received) && timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
}

export function validPaystackSignature(body: string, headers: { modern: string | null; legacy: string | null },
  secrets: { api: string; webhook?: string }, now = Math.floor(Date.now() / 1000)): boolean {
  if (secrets.webhook) {
    // Do not downgrade to the legacy signature when a dedicated secret is configured.
    const parts = (headers.modern ?? "").split(",").map(part => part.trim());
    const timestamps = parts.filter(part => part.startsWith("t="));
    if (timestamps.length !== 1 || !/^t=\d+$/.test(timestamps[0])) return false;
    const timestamp = Number(timestamps[0].slice(2));
    if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > 300) return false;
    const expected = createHmac("sha512", secrets.webhook).update(`${timestamp}.${body}`).digest("hex");
    return parts.filter(part => part.startsWith("v1=whk_")).some(part => {
      const colon = part.indexOf(":");
      return colon > 0 && sameSignature(expected, part.slice(colon + 1));
    });
  }
  return Boolean(headers.legacy && sameSignature(createHmac("sha512", secrets.api).update(body).digest("hex"), headers.legacy));
}

export type VerifiedTransaction = { status: string; reference: string; amount: number; currency: string; domain: string;
  metadata: { payment_id?: string } | null; paid_at: string | null };

export function paymentMatches(data: VerifiedTransaction, expected: { reference: string; amountFcfa: number; paymentId: string; mode: "test" | "live" }): boolean {
  return data.status === "success" && data.reference === expected.reference && data.currency === "XOF"
    && data.amount === paystackAmount(expected.amountFcfa) && data.domain === expected.mode
    && data.metadata?.payment_id === expected.paymentId && Boolean(data.paid_at && Number.isFinite(Date.parse(data.paid_at)));
}
