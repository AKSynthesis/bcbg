import Stripe from "stripe";

// apiVersion intentionally omitted -- lets the SDK use the version it was
// built/pinned against, rather than hardcoding a version string that could
// drift out of sync with the installed package over time.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);