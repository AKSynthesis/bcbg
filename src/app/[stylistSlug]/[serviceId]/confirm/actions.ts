"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
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
            // Deposits aren't actually collected yet (Stripe isn't wired
            // up) -- every booking is auto-confirmed for now regardless
            // of depositPercentage. Revisit when Stripe is added:
            // services with a deposit requirement should create a
            // PENDING booking that only becomes CONFIRMED after payment
            // succeeds.
            status: "CONFIRMED",
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

  redirect(`/${stylistSlug}/bookings/${bookingId}`);
}