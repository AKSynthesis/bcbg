"use server";

import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getCurrentStylist } from "@/lib/current-stylist";

export async function connectStripeAccount() {
  const stylist = await getCurrentStylist();
  if (!stylist) redirect("/onboarding/business");

  let accountId = stylist.stripeConnectAccountId;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      // business_type left for the stylist to set during onboarding --
      // most will be individuals/sole proprietors, but not assuming that.
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    accountId = account.id;

    await prisma.stylist.update({
      where: { id: stylist.id },
      data: { stripeConnectAccountId: accountId },
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Account Links are safe to regenerate -- Stripe's hosted onboarding
  // flow only re-asks for whatever is still outstanding, so this same
  // action works whether the stylist is starting fresh or resuming.
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${appUrl}/admin/payments`,
    return_url: `${appUrl}/admin/payments`,
  });

  redirect(accountLink.url);
}