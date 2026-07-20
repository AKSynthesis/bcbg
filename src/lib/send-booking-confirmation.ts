import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend";

// Fire-and-forget: a failed email send should never block or roll back a
// booking. Errors are logged, not thrown -- by the time this runs, the
// booking itself has already succeeded (either the immediate-confirm path,
// or the Stripe webhook after a deposit clears).
export async function sendBookingConfirmationEmail(bookingId: string) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { stylist: true, service: true, customer: true },
    });
    if (!booking) return;

    const apptStart = new Date(
      booking.startAt.getTime() + booking.service.bufferBeforeMinutes * 60_000,
    );
    const localDateTime = format(
      toZonedTime(apptStart, booking.stylist.timezone),
      "EEEE, MMMM d 'at' h:mm a",
    );

    // onboarding@resend.dev works without a verified sending domain --
    // fine for dev/testing, but only deliverable to the Resend account's
    // own verified email in that mode. Set RESEND_FROM_EMAIL once a real
    // domain is verified.
    const fromAddress = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

    await resend.emails.send({
      from: `${booking.stylist.businessName} <${fromAddress}>`,
      to: booking.customer.email,
      subject: `Booking confirmed: ${booking.service.name}`,
      html: `
        <p>Your booking is confirmed.</p>
        <p><strong>${booking.service.name}</strong> with ${booking.stylist.businessName}</p>
        <p>${localDateTime}</p>
        ${
          booking.depositAmountCents > 0
            ? `<p>Deposit paid: $${(booking.depositAmountCents / 100).toFixed(2)}</p>`
            : ""
        }
      `,
    });
  } catch (err) {
    console.error("Failed to send booking confirmation email:", err);
  }
}