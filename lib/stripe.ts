import Stripe from "stripe";

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const STRIPE_PRICE_IDS = {
  pro: process.env.STRIPE_PRICE_PRO_MONTHLY || "",
  studio: process.env.STRIPE_PRICE_STUDIO_MONTHLY || "",
  free: ""
} as const;
