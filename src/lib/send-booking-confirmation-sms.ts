import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { twilioClient } from "@/lib/twilio";

// Fire-and-forget, same reasoning as sendBookingConfirmationEmail -- a
// failed send must never block or roll back a booking that already
// succeeded.
export async function sendBookingConfirmationSms(bookingId: string) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { stylist: true, service: true, customer: true },
    });
    if (!booking) return;

    // TCPA compliance: only send if the customer explicitly opted in AND
    // has a phone number on file. Never send based on phone presence
    // alone -- smsOptIn is the actual consent signal.
    if (!booking.customer.smsOptIn || !booking.customer.phone) return;

    const fromNumber = process.env.TWILIO_FROM_NUMBER;
    if (!fromNumber) {
      console.error("TWILIO_FROM_NUMBER is not set -- skipping SMS send.");
      return;
    }

    const apptStart = new Date(
      booking.startAt.getTime() + booking.service.bufferBeforeMinutes * 60_000,
    );
    const localDateTime = format(
      toZonedTime(apptStart, booking.stylist.timezone),
      "EEE, MMM d 'at' h:mm a",
    );

    await twilioClient.messages.create({
      to: booking.customer.phone,
      from: fromNumber,
      body: `${booking.stylist.businessName}: your ${booking.service.name} appointment is confirmed for ${localDateTime}. Reply STOP to opt out.`,
    });
  } catch (err) {
    console.error("Failed to send booking confirmation SMS:", err);
  }
}