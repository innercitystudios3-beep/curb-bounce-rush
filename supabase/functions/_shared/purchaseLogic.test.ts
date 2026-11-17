import { assertEquals } from "jsr:@std/assert@1";
import { canGrant, classifyEvent } from "./purchaseLogic.ts";

Deno.test("completed checkout grants the item", () => {
  assertEquals(classifyEvent({ type: "checkout.session.completed", data: { object: { id: "cs_1" } } }), { kind: "grant", sessionId: "cs_1" });
});
Deno.test("failed async payment does not grant", () => {
  assertEquals(classifyEvent({ type: "checkout.session.async_payment_failed", data: { object: { id: "cs_1" } } }).kind, "fail");
});
Deno.test("unpaid session cannot grant", () => {
  assertEquals(canGrant({ payment_status: "unpaid", metadata: { user_id: "u", item_id: "soccer-ball", item_type: "ball" } }), false);
});
Deno.test("paid session without a player cannot grant", () => {
  assertEquals(canGrant({ payment_status: "paid", metadata: { item_id: "soccer-ball", item_type: "ball" } }), false);
});
Deno.test("full refund revokes", () => {
  assertEquals(classifyEvent({ type: "charge.refunded", data: { object: { refunded: true, amount: 99, amount_refunded: 99, payment_intent: "pi_1" } } }), { kind: "revoke", paymentIntentId: "pi_1", reason: "refunded" });
});
Deno.test("partial refund keeps the item", () => {
  assertEquals(classifyEvent({ type: "charge.refunded", data: { object: { refunded: false, amount: 299, amount_refunded: 100, payment_intent: "pi_1" } } }).kind, "ignore");
});
Deno.test("dispute revokes, won dispute restores", () => {
  assertEquals(classifyEvent({ type: "charge.dispute.created", data: { object: { payment_intent: "pi_2" } } }).kind, "revoke");
  assertEquals(classifyEvent({ type: "charge.dispute.closed", data: { object: { status: "won", payment_intent: "pi_2" } } }).kind, "restore");
  assertEquals(classifyEvent({ type: "charge.dispute.closed", data: { object: { status: "lost", payment_intent: "pi_2" } } }).kind, "ignore");
});
