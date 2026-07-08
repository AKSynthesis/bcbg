"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function completeStylistOnboarding(formData: FormData) {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/onboarding/timezone");
  }

  if (!orgId) {
    // They haven't created an org yet (or it's not active in this session).
    redirect("/onboarding/business");
  }

  const timezone = formData.get("timezone");
  if (typeof timezone !== "string" || !Intl.supportedValuesOf("timeZone").includes(timezone)) {
    throw new Error("Invalid timezone selected.");
  }

  // Don't trust that the organization.created webhook has landed by now —
  // webhooks are eventually consistent, and this is a synchronous flow the
  // user is actively waiting on. Fetch the org directly from Clerk instead.
  const client = await clerkClient();
  const org = await client.organizations.getOrganization({ organizationId: orgId });

  await prisma.stylist.upsert({
    where: { clerkOrgId: orgId },
    create: {
      clerkOrgId: orgId,
      businessName: org.name,
      slug: org.slug ?? orgId,
      timezone,
    },
    // If the webhook DID already create the row, this just fills in the
    // timezone it couldn't have known. If the row exists with a timezone
    // already (re-running onboarding), this overwrites it — acceptable,
    // since the user is explicitly resubmitting this form.
    update: { timezone },
  });

  redirect("/admin");
}