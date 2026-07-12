"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentStylist } from "@/lib/current-stylist";
import { parseTimeToMinutes } from "@/lib/time";

// --- Weekly recurring rules ------------------------------------------------

const ruleFormSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
});

export async function addAvailabilityRule(formData: FormData) {
  const stylist = await getCurrentStylist();
  if (!stylist) redirect("/onboarding/business");

  const parsed = ruleFormSchema.safeParse({
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const { dayOfWeek } = parsed.data;
  const startMinutes = parseTimeToMinutes(parsed.data.startTime);
  const endMinutes = parseTimeToMinutes(parsed.data.endTime);

  if (startMinutes >= endMinutes) {
    throw new Error("Start time must be before end time.");
  }

  // Reject overlap with any existing block on the same day for this
  // stylist. Two ranges [a,b) and [c,d) overlap iff a < d && c < b.
  const existingSameDay = await prisma.availabilityRule.findMany({
    where: { stylistId: stylist.id, dayOfWeek },
  });
  const overlaps = existingSameDay.some(
    (rule) => rule.startMinutes < endMinutes && startMinutes < rule.endMinutes,
  );
  if (overlaps) {
    throw new Error("This overlaps with an existing block on that day.");
  }

  await prisma.availabilityRule.create({
    data: { stylistId: stylist.id, dayOfWeek, startMinutes, endMinutes },
  });

  revalidatePath("/admin/availability");
}

export async function deleteAvailabilityRule(ruleId: string) {
  const stylist = await getCurrentStylist();
  if (!stylist) redirect("/onboarding/business");

  // Tenant isolation: deleteMany with both id and stylistId in the filter
  // means this is a no-op (not an error, not a mutation) if the rule
  // doesn't belong to this stylist -- never trust the id alone.
  await prisma.availabilityRule.deleteMany({
    where: { id: ruleId, stylistId: stylist.id },
  });

  revalidatePath("/admin/availability");
}

// --- Date-specific exceptions -----------------------------------------------

const exceptionFormSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
    isClosed: z.string().optional(), // checkbox: "on" if checked, undefined if not
    startTime: z.string().optional(),
    endTime: z.string().optional(),
  })
  .transform((data) => ({ ...data, isClosed: data.isClosed === "on" }));

export async function upsertAvailabilityException(formData: FormData) {
  const stylist = await getCurrentStylist();
  if (!stylist) redirect("/onboarding/business");

  const parsed = exceptionFormSchema.safeParse({
    date: formData.get("date"),
    isClosed: formData.get("isClosed"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const { date, isClosed } = parsed.data;

  let startMinutes: number | null = null;
  let endMinutes: number | null = null;

  if (!isClosed) {
    if (!parsed.data.startTime || !parsed.data.endTime) {
      throw new Error("Start and end time are required for special hours.");
    }
    startMinutes = parseTimeToMinutes(parsed.data.startTime);
    endMinutes = parseTimeToMinutes(parsed.data.endTime);
    if (startMinutes >= endMinutes) {
      throw new Error("Start time must be before end time.");
    }
  }

  // date-only string -> UTC midnight Date, which is what @db.Date expects
  // (no time-of-day or timezone semantics for this column at all).
  const parsedDate = new Date(date);

  // Upsert, not create: picking a date that already has an exception
  // should replace it, not error.
  await prisma.availabilityException.upsert({
    where: { stylistId_date: { stylistId: stylist.id, date: parsedDate } },
    create: { stylistId: stylist.id, date: parsedDate, isClosed, startMinutes, endMinutes },
    update: { isClosed, startMinutes, endMinutes },
  });

  revalidatePath("/admin/availability");
}

export async function deleteAvailabilityException(exceptionId: string) {
  const stylist = await getCurrentStylist();
  if (!stylist) redirect("/onboarding/business");

  await prisma.availabilityException.deleteMany({
    where: { id: exceptionId, stylistId: stylist.id },
  });

  revalidatePath("/admin/availability");
}