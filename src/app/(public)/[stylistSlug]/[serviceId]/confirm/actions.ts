"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { ensureCurrentCustomer } from "@/lib/current-customer";
import { sendBookingConfirmationEmail } from "@/lib/send-booking-confirmation";
import { sendBookingConfirmationSms } from "@/lib/send-booking-confirmation-sms";
import { normalizePhoneToE164 } from "@/lib/phone";

export async function createBooking(
  stylistSlug: string,
  serviceId: string,
  slot: string,
  formData: FormData,
) {
  const customer = await ensureCurrentCustomer();

  // Only ever WRITE phone/smsOptIn forward, never revert opt-in to false
  // just because this particular booking's checkbox was left unchecked --
  // consent revocation should be an explicit action (e.g. replying STOP),
  // not an implicit side effect of an unrelated form submission.
  const rawPhone = formData.get("phone");
  const smsOptInChecked = formData.get("smsOptIn") === "on";
  if (smsOptInChecked) {
    if (typeof rawPhone !== "string" || !rawPhone.trim()) {
      throw new Error("A phone number is required to receive text confirmations.");
    }
    const normalizedPhone = normalizePhoneToE164(rawPhone);
    if (!normalizedPhone) {
      throw new Error("That doesn't look like a valid phone number.");
    }
    await prisma.customer.update({
      where: { id: customer.id },
      data: { phone: normalizedPhone, smsOptIn: true, smsOptInAt: new Date() },
    });
  } else if (typeof rawPhone === "string" && rawPhone.trim()) {
    // Not opting in, but they did provide/update a phone number -- save
    // it without touching smsOptIn.
    const normalizedPhone = normalizePhoneToE164(rawPhone);
    if (normalizedPhone) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { phone: normalizedPhone },
      });
    }
  }

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

  let collectsDeposit = false;
  if (depositAmountCents > 0 && stylist.stripeConnectAccountId) {
    const account = await stripe.accounts.retrieve(stylist.stripeConnectAccountId);
    collectsDeposit = account.charges_enabled;
  }

  let bookingId: string;
  try {
    const booking = await prisma.$transaction(
      async (tx) => {
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
    await Promise.all([sendBookingConfirmationEmail(bookingId), sendBookingConfirmationSms(bookingId)]);
    redirect(`/${stylistSlug}/bookings/${bookingId}`);
  }

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