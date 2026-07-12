import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { Stylist } from "@prisma/client";

// Resolves the currently authenticated stylist's DB row, keyed on their
// active Clerk Organization. Returns null if there's no signed-in user, no
// active org, or (edge case) an org that hasn't finished onboarding yet --
// callers decide how to handle that (redirect, 404, throw) since the right
// behavior differs between a layout guard and a server action.
export async function getCurrentStylist(): Promise<Stylist | null> {
  const { orgId } = await auth();
  if (!orgId) return null;
  return prisma.stylist.findUnique({ where: { clerkOrgId: orgId } });
}