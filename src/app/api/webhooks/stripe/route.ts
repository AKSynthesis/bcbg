import { NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { sendBookingConfirmationEmail } from "@/lib/send-booking-confirmation";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  // Stripe signature verification requires the exact raw request bytes --
  // request.json() would re-serialize the body and break verification.
  const rawBody = await request.text();

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const bookingId = session.metadata?.bookingId;
      if (!bookingId) break;

      // This is the actual source of truth for "the deposit was paid" --
      // the Checkout success_url redirect (which sends the customer back
      // to the booking page) is NOT trusted for this, since a customer
      // could navigate there without ever completing payment. Only
      // transition PENDING -> CONFIRMED here, from a verified webhook.
      const result = await prisma.booking.updateMany({
        where: { id: bookingId, status: "PENDING" },
        data: {
          status: "CONFIRMED",
          depositPaid: true,
          stripePaymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id,
        },
      });

      // Stripe (like Clerk) uses at-least-once delivery. Only send the
      // email if THIS call is what actually flipped the booking to
      // CONFIRMED (count > 0) -- otherwise a re-delivered webhook for an
      // already-confirmed booking would send a duplicate confirmation.
      if (result.count > 0) {
        await sendBookingConfirmationEmail(bookingId);
      }
      break;
    }

    default:
      break; // ignore event types we don't act on
  }

  return new Response("OK", { status: 200 });
}