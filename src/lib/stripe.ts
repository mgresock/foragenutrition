import Stripe from "stripe";

// Lazy getter — only throws when actually called, not at import time.
// This lets the app run fine without Stripe env vars until billing is set up.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set. Add it to .env.local to enable billing.");
  }
  if (!_stripe) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-11-20.acacia" as any });
  }
  return _stripe;
}

export const STRIPE_PRICES = {
  monthly: process.env.STRIPE_MONTHLY_PRICE_ID ?? "",
  yearly: process.env.STRIPE_YEARLY_PRICE_ID ?? "",
};
