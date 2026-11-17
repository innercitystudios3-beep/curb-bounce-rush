// Pure purchase rules (no network) so they can be unit-tested.
export type WebhookAction =
  | { kind: "grant"; sessionId: string }
  | { kind: "fail"; sessionId: string }
  | { kind: "revoke"; paymentIntentId: string; reason: "refunded" | "disputed" }
  | { kind: "restore"; paymentIntentId: string }
  | { kind: "ignore" };

// deno-lint-ignore no-explicit-any
export function classifyEvent(event: { type: string; data: { object: any } }): WebhookAction {
  const o = event.data.object;
  const pi = (v: unknown) => (typeof v === "string" ? v : (v as { id?: string } | null)?.id ?? "");
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return { kind: "grant", sessionId: o.id };
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired":
      return { kind: "fail", sessionId: o.id };
    case "charge.refunded":
      // Only full refunds revoke the item.
      if (o.refunded === true || (o.amount_refunded ?? 0) >= (o.amount ?? Infinity)) {
        return { kind: "revoke", paymentIntentId: pi(o.payment_intent), reason: "refunded" };
      }
      return { kind: "ignore" };
    case "charge.dispute.created":
      return { kind: "revoke", paymentIntentId: pi(o.payment_intent), reason: "disputed" };
    case "charge.dispute.closed":
      if (o.status === "won") return { kind: "restore", paymentIntentId: pi(o.payment_intent) };
      return { kind: "ignore" };
    default:
      return { kind: "ignore" };
  }
}

/** A session can grant an item only when Stripe says it is paid and it names a known buyer + item. */
export function canGrant(s: { payment_status?: string | null; metadata?: Record<string, string> | null }): boolean {
  return s.payment_status === "paid" && !!s.metadata?.user_id && !!s.metadata?.item_id && !!s.metadata?.item_type;
}
