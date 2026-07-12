import { fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import type { Stylist, Service } from "@prisma/client";

const SLOT_INTERVAL_MINUTES = 15;

type AvailabilityWindow = { startMinutes: number; endMinutes: number };

/**
 * Computes bookable appointment start times, as UTC instants, for a given
 * stylist/service/calendar date.
 *
 * "date" is the calendar date AS EXPERIENCED BY THE STYLIST (e.g.
 * "2026-08-04" means their business day) -- not a UTC day, which can be a
 * different calendar date near midnight depending on their offset.
 */
export async function getAvailableSlots({
  stylist,
  service,
  date,
}: {
  stylist: Pick<Stylist, "id" | "timezone">;
  service: Pick<Service, "durationMinutes" | "bufferBeforeMinutes" | "bufferAfterMinutes">;
  date: string; // "YYYY-MM-DD"
}): Promise<Date[]> {
  const windows = await getAvailabilityWindows(stylist.id, date);
  if (windows.length === 0) return [];

  const [year, month, day] = date.split("-").map(Number);

  // Converts a stylist-local minutes-from-midnight value on `date` into
  // the equivalent UTC instant.
  //
  // IMPORTANT: fromZonedTime reads a Date's LOCAL (system-timezone)
  // getters, not UTC ones -- confirmed from date-fns-tz's own source and
  // doc example (`new Date(2014, 5, 25, 10, 0, 0)`, not `Date.UTC(...)`).
  // So we must construct the "wall clock" Date the same way: via the
  // plain local constructor. This round-trips correctly regardless of
  // what timezone the Node process itself happens to run in, because we
  // read it back the same way we wrote it.
  const toUtc = (minutesFromMidnight: number): Date => {
    const hours = Math.floor(minutesFromMidnight / 60);
    const minutes = minutesFromMidnight % 60;
    const wallClock = new Date(year, month - 1, day, hours, minutes);
    return fromZonedTime(wallClock, stylist.timezone);
  };

  const blockMinutes =
    service.bufferBeforeMinutes + service.durationMinutes + service.bufferAfterMinutes;

  // Candidate appointment start times, in minutes-from-midnight,
  // stylist-local, stepped at a fixed granularity within each window.
  const candidateStarts: number[] = [];
  for (const window of windows) {
    const latestBlockStart = window.endMinutes - blockMinutes;
    for (
      let blockStart = window.startMinutes;
      blockStart <= latestBlockStart;
      blockStart += SLOT_INTERVAL_MINUTES
    ) {
      candidateStarts.push(blockStart + service.bufferBeforeMinutes);
    }
  }
  if (candidateStarts.length === 0) return [];

  const candidates = candidateStarts.map((apptStart) => ({
    apptStartUtc: toUtc(apptStart),
    // The FULL buffered block -- this is what's compared against
    // existing bookings, and what Booking.startAt/endAt actually store
    // (see schema comment: "includes service duration + buffers").
    blockStartUtc: toUtc(apptStart - service.bufferBeforeMinutes),
    blockEndUtc: toUtc(apptStart + service.durationMinutes + service.bufferAfterMinutes),
  }));

  // Fetch existing bookings in a generously padded UTC window around this
  // day. The padding covers timezone offsets that could shift the
  // stylist's local day into an adjacent UTC calendar day.
  const dayStartUtcGuess = toUtc(0);
  const rangeStart = new Date(dayStartUtcGuess.getTime() - 24 * 60 * 60 * 1000);
  const rangeEnd = new Date(dayStartUtcGuess.getTime() + 48 * 60 * 60 * 1000);

  const existingBookings = await prisma.booking.findMany({
    where: {
      stylistId: stylist.id,
      status: { notIn: ["CANCELLED"] },
      startAt: { lt: rangeEnd },
      endAt: { gt: rangeStart },
    },
    select: { startAt: true, endAt: true },
  });

  return candidates
    .filter(
      ({ blockStartUtc, blockEndUtc }) =>
        !existingBookings.some(
          (booking) => booking.startAt < blockEndUtc && blockStartUtc < booking.endAt,
        ),
    )
    .map(({ apptStartUtc }) => apptStartUtc);
}

// Resolves the availability window(s) for one calendar date: an exception
// (if one exists for that date) entirely REPLACES the weekly rule -- either
// closing the day, or substituting custom hours -- per the schema's
// documented AvailabilityException semantics.
async function getAvailabilityWindows(
  stylistId: string,
  date: string,
): Promise<AvailabilityWindow[]> {
  const exception = await prisma.availabilityException.findUnique({
    where: { stylistId_date: { stylistId, date: new Date(date) } },
  });

  if (exception) {
    if (exception.isClosed) return [];
    return [{ startMinutes: exception.startMinutes!, endMinutes: exception.endMinutes! }];
  }

  // Day of week is a pure calendar concept -- local Date components (not
  // UTC) give the correct weekday regardless of server timezone, since
  // we're constructing from the same y/m/d parts either way.
  const [year, month, day] = date.split("-").map(Number);
  const dayOfWeek = new Date(year, month - 1, day).getDay();

  const rules = await prisma.availabilityRule.findMany({
    where: { stylistId, dayOfWeek },
  });

  return rules.map((rule) => ({ startMinutes: rule.startMinutes, endMinutes: rule.endMinutes }));
}