"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentStylist } from "@/lib/current-stylist";

const serviceFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  durationMinutes: z.coerce.number().int().min(5, "Minimum 5 minutes").max(480, "Maximum 8 hours"),
  bufferBeforeMinutes: z.coerce.number().int().min(0).max(120),
  bufferAfterMinutes: z.coerce.number().int().min(0).max(120),
  priceDollars: z.coerce.number().min(0, "Price can't be negative").max(10000),
  depositPercentage: z.coerce.number().int().min(0).max(100),
});

function parseServiceForm(formData: FormData) {
  const parsed = serviceFormSchema.safeParse({
    name: formData.get("name"),
    durationMinutes: formData.get("durationMinutes"),
    bufferBeforeMinutes: formData.get("bufferBeforeMinutes"),
    bufferAfterMinutes: formData.get("bufferAfterMinutes"),
    priceDollars: formData.get("priceDollars"),
    depositPercentage: formData.get("depositPercentage"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }

  const { priceDollars, ...rest } = parsed.data;
  return { ...rest, priceCents: Math.round(priceDollars * 100) };
}

export async function createService(formData: FormData) {
  const stylist = await getCurrentStylist();
  if (!stylist) redirect("/onboarding/business");

  const data = parseServiceForm(formData);

  await prisma.service.create({
    data: { ...data, stylistId: stylist.id },
  });

  revalidatePath("/admin/services");
  redirect("/admin/services");
}

export async function updateService(serviceId: string, formData: FormData) {
  const stylist = await getCurrentStylist();
  if (!stylist) redirect("/onboarding/business");

  // Tenant isolation: confirm this service actually belongs to the
  // authenticated stylist before allowing any mutation. Never trust a
  // serviceId alone -- someone could hand-craft a request referencing
  // another stylist's service.
  const existing = await prisma.service.findFirst({
    where: { id: serviceId, stylistId: stylist.id },
  });
  if (!existing) {
    throw new Error("Service not found.");
  }

  const data = parseServiceForm(formData);

  await prisma.service.update({
    where: { id: serviceId },
    data,
  });

  revalidatePath("/admin/services");
  redirect("/admin/services");
}

export async function toggleServiceActive(serviceId: string) {
  const stylist = await getCurrentStylist();
  if (!stylist) redirect("/onboarding/business");

  const existing = await prisma.service.findFirst({
    where: { id: serviceId, stylistId: stylist.id },
  });
  if (!existing) {
    throw new Error("Service not found.");
  }

  // Deliberately a toggle, not a hard delete. Service.bookings has
  // onDelete: Restrict -- a service with any booking history can't be
  // deleted anyway, and even for one with none, "stop offering this" is
  // the real-world action a stylist wants, not erasing the record.
  await prisma.service.update({
    where: { id: serviceId },
    data: { active: !existing.active },
  });

  revalidatePath("/admin/services");
}