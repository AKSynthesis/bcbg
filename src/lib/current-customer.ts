import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { Customer } from "@prisma/client";

// Mirrors getCurrentStylist() -- resolves the signed-in Clerk user's
// Customer row. Returns null if not signed in, or (edge case) if the
// user.created webhook hasn't landed yet.
export async function getCurrentCustomer(): Promise<Customer | null> {
  const { userId } = await auth();
  if (!userId) return null;
  return prisma.customer.findUnique({ where: { clerkUserId: userId } });
}

// For the booking flow specifically: a customer's very first action after
// signing up could be attempting to book before user.created has been
// delivered. Same reasoning as onboarding's stylist upsert -- don't trust
// webhook timing for a synchronous flow the customer is actively waiting
// on. Fetches from Clerk directly and upserts if the row doesn't exist yet.
export async function ensureCurrentCustomer(): Promise<Customer> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in.");

  const existing = await prisma.customer.findUnique({ where: { clerkUserId: userId } });
  if (existing) return existing;

  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  const email =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ??
    user.emailAddresses[0]?.emailAddress;
  if (!email) throw new Error("No email address on file for this account.");

  const phone =
    user.phoneNumbers.find((p) => p.id === user.primaryPhoneNumberId)?.phoneNumber ?? null;

  return prisma.customer.upsert({
    where: { clerkUserId: userId },
    create: { clerkUserId: userId, email, phone },
    update: {}, // exists now (race with the webhook) -- nothing to do
  });
}