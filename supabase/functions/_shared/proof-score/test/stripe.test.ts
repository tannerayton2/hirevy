// Stripe adapter checks. Run: node --experimental-strip-types test/stripe.test.ts
import assert from "node:assert/strict";
import { stripeToCoachInput } from "../stripe.ts";

const NOW = Date.UTC(2026, 10, 17) / 1000;
const DAY = 86400;
const input = stripeToCoachInput({
  now: NOW,
  ownEmails: ["coach@example.com"],
  charges: [
    // Same customer: first charge has no fingerprint, second does → both must be one client.
    { id: "ch1", amount: 50000, amount_refunded: 0, created: NOW - 100 * DAY, status: "succeeded", paid: true, customer: "cus_A", disputed: false, invoice: { id: "in1", subscription: "sub_plan" } },
    { id: "ch2", amount: 50000, amount_refunded: 0, created: NOW - 70 * DAY, status: "succeeded", paid: true, customer: "cus_A", disputed: true, payment_method_details: { card: { fingerprint: "FP1" } }, invoice: { id: "in2", subscription: "sub_plan" } },
    // Failed payment: ignored.
    { id: "ch3", amount: 50000, amount_refunded: 0, created: NOW - 40 * DAY, status: "failed", paid: false, customer: "cus_A", disputed: false },
    // Coach paying themself.
    { id: "ch4", amount: 99900, amount_refunded: 0, created: NOW - 10 * DAY, status: "succeeded", paid: true, customer: "cus_ME", disputed: false, billing_details: { email: "Coach@Example.com" }, payment_method_details: { card: { fingerprint: "FP_ME" } } },
  ],
  disputes: [{ id: "dp1", charge: "ch2", reason: "product_not_received", status: "lost" }],
  subscriptions: [
    // 6-month payment plan: cancel_at fixed 6 intervals out.
    { id: "sub_plan", customer: "cus_A", start_date: NOW - 100 * DAY, ended_at: NOW - 40 * DAY, canceled_at: NOW - 40 * DAY, cancel_at: NOW - 100 * DAY + 6 * 30 * DAY, cancel_at_period_end: false, status: "canceled",
      items: { data: [{ price: { recurring: { interval: "month", interval_count: 1 } } }] } },
  ],
});

assert.equal(input.charges.length, 3, "failed charge dropped");
assert.equal(input.charges[0].clientKey, "fp:FP1", "customer merged onto card fingerprint");
assert.equal(input.charges[1].clientKey, "fp:FP1");
assert.equal(input.charges[1].disputeReason, "product_not_received");
assert.equal(input.charges[1].disputeStatus, "lost");
assert.equal(input.charges[0].kind, "installment");
assert.equal(input.plans[0].kind, "installment");
assert.equal(input.plans[0].totalPayments, 6);
assert.equal(input.plans[0].clientKey, "fp:FP1", "plan lines up with the same client");
assert.deepEqual(input.ownClientKeys, ["fp:FP_ME"], "coach's own card detected by email");
console.log("Stripe adapter checks passed.");
