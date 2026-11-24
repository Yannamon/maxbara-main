import { confirmPaystack, paystackConfig } from "../../../../../payments/paystack";
import { validPaystackSignature } from "../../../../../payments/validation";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const config = paystackConfig();
  if (!config) return new Response("Unavailable", { status: 503 });
  if (Number(request.headers.get("content-length")) > 262144) return new Response("Too large", { status: 413 });
  const body = await request.text();
  if (Buffer.byteLength(body) > 262144) return new Response("Too large", { status: 413 });
  if (!validPaystackSignature(body, { modern: request.headers.get("paystack-signature"), legacy: request.headers.get("x-paystack-signature") },
    { api: config.secret, webhook: process.env.PAYSTACK_WEBHOOK_SECRET?.trim() })) return new Response("Invalid signature", { status: 401 });
  let event;
  try { event = JSON.parse(body); } catch { return new Response("Invalid JSON", { status: 400 }); }
  if (event?.event !== "charge.success") return Response.json({ received: true });
  if (typeof event.data?.reference !== "string") return new Response("Invalid reference", { status: 400 });
  try { await confirmPaystack(event.data.reference); }
  catch { return new Response("Retry later", { status: 503 }); }
  return Response.json({ received: true });
}
