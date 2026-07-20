"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { ensureCurrentCustomer } from "@/lib/current-customer";

export async function createBooking(stylistSlug: string, serviceId: string, slot: string) {
  const customer = await ensureCurrentCustomer();

  const stylist = await prisma.stylist.findUnique({ where: { slug: stylistSlug } });
  if (!stylist) throw new Error("Stylist not found.");

  const service = await prisma.service.findFirst({
    where: { id: serviceId, stylistId: stylist.id, active: true },
  });
  if (!service) throw new Error("Service not found.");

  const apptStart = new Date(slot);
  if (Number.isNaN(apptStart.getTime())) {
    throw new Error("Invalid time slot.");
  }

  const blockStart = new Date(apptStart.getTime() - service.bufferBeforeMinutes * 60_000);
  const blockEnd = new Date(
    apptStart.getTime() + (service.durationMinutes + service.bufferAfterMinutes) * 60_000,
  );

  const depositAmountCents = Math.round((service.priceCents * service.depositPercentage) / 100);

  // Deposit collection only applies if the service actually requires one
  // AND the stylist has a Stripe account that can accept charges. If a
  // stylist sets a deposit % before connecting Stripe, bookings fall back
  // to auto-confirming without payment -- not ideal, but avoids blocking
  // bookings entirely on an incomplete Stripe setup. Worth revisiting:
  // maybe Services CRUD should prevent depositPercentage > 0 until
  // Stripe is connected.
  let collectsDeposit = false;
  if (depositAmountCents > 0 && stylist.stripeConnectAccountId) {
    const account = await stripe.accounts.retrieve(stylist.stripeConnectAccountId);
    collectsDeposit = account.charges_enabled;
  }

  let bookingId: string;
  try {
    const booking = await prisma.$transaction(
      async (tx) => {
        // Atomic double-booking check: re-verify no overlapping booking
        // exists for this stylist inside the SAME transaction that
        // creates the new one. Serializable isolation is what actually
        // makes this race-safe -- under the default (Read Committed),
        // two concurrent requests could both pass this check before
        // either commits. Under Serializable, Postgres detects the
        // conflict and one of the two transactions fails with a
        // serialization error, which we catch below.
        const overlapping = await tx.booking.findFirst({
          where: {
            stylistId: stylist.id,
            status: { notIn: ["CANCELLED"] },
            startAt: { lt: blockEnd },
            endAt: { gt: blockStart },
          },
        });
        if (overlapping) {
          throw new Error("SLOT_TAKEN");
        }

        return tx.booking.create({
          data: {
            stylistId: stylist.id,
            customerId: customer.id,
            serviceId: service.id,
            startAt: blockStart,
            endAt: blockEnd,
            // If a deposit needs collecting, the booking stays PENDING
            // until the Stripe webhook confirms payment -- see
            // src/app/api/webhooks/stripe/route.ts for the transition
            // to CONFIRMED. KNOWN GAP: an abandoned Checkout leaves this
            // slot blocked as PENDING indefinitely -- there's no
            // stale-booking expiry job yet. Worth adding before launch.
            status: collectsDeposit ? "PENDING" : "CONFIRMED",
            depositAmountCents,
            depositPaid: false,
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
    bookingId = booking.id;
  } catch (err) {
    const isConflict =
      err instanceof Error &&
      (err.message === "SLOT_TAKEN" || (err as { code?: string }).code === "P2034");
    if (isConflict) {
      redirect(`/${stylistSlug}/${serviceId}?error=slot-taken`);
    }
    throw err;
  }

  if (!collectsDeposit) {
    redirect(`/${stylistSlug}/bookings/${bookingId}`);
  }

  // Deposit required: the booking is already secured (PENDING) at this
  // point -- Checkout just collects payment. The webhook, not this
  // redirect, is what actually confirms the booking; a customer could
  // navigate to success_url without paying, so nothing here trusts that.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: depositAmountCents,
          product_data: { name: `Deposit: ${service.name}` },
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      transfer_data: { destination: stylist.stripeConnectAccountId! },
      metadata: { bookingId },
    },
    metadata: { bookingId },
    success_url: `${appUrl}/${stylistSlug}/bookings/${bookingId}`,
    cancel_url: `${appUrl}/${stylistSlug}/${serviceId}/confirm?slot=${encodeURIComponent(slot)}`,
  });

  redirect(checkoutSession.url!);
}