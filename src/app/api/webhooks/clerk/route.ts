import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Clerk delivers webhooks via Svix, which uses at-least-once delivery — the
// same event can arrive more than once. Every handler below uses upsert
// keyed on the Clerk ID so re-delivery is a no-op, not a duplicate/crash.
export async function POST(request: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(request);
  } catch (err) {
    console.error("Clerk webhook verification failed:", err);
    return new Response("Webhook verification failed", { status: 400 });
  }

  switch (evt.type) {
    case "organization.created": {
      const { id, name, slug } = evt.data;
      await prisma.stylist.upsert({
        where: { clerkOrgId: id },
        create: {
          clerkOrgId: id,
          businessName: name,
          slug: slug ?? id, // Clerk orgs can technically omit a slug; fall back to id
          timezone: "UTC", // placeholder — stylist sets their real timezone during onboarding
        },
        update: {}, // already exists (duplicate delivery) — nothing to do
      });
      break;
    }

    case "organization.updated": {
      const { id, name, slug } = evt.data;
      await prisma.stylist.updateMany({
        where: { clerkOrgId: id },
        data: {
          businessName: name,
          ...(slug ? { slug } : {}),
        },
      });
      break;
    }

    // organization.deleted is intentionally NOT handled yet — deleting a
    // Stylist has real implications for existing Bookings (onDelete:
    // Restrict in the schema will block it if any exist). This needs a
    // proper deactivation flow, not a blind sync-delete. Revisit later.

    case "user.created": {
      const { id, email_addresses, phone_numbers } = evt.data;
      const email = email_addresses[0]?.email_address;
      if (!email) break; // shouldn't happen, but Customer.email is required

      await prisma.customer.upsert({
        where: { clerkUserId: id },
        create: {
          clerkUserId: id,
          email,
          phone: phone_numbers[0]?.phone_number ?? null,
        },
        update: {}, // duplicate delivery — nothing to do
      });
      break;
    }

    case "user.updated": {
      const { id, email_addresses, phone_numbers } = evt.data;
      const email = email_addresses[0]?.email_address;

      await prisma.customer.updateMany({
        where: { clerkUserId: id },
        data: {
          ...(email ? { email } : {}),
          phone: phone_numbers[0]?.phone_number ?? null,
        },
      });
      break;
    }

    // user.deleted: same reasoning as organization.deleted above — a
    // Customer may have Booking history (onDelete: Restrict). Deferred.

    default:
      break; // ignore event types we don't act on
  }

  return new Response("OK", { status: 200 });
}