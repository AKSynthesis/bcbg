import { notFound } from "next/navigation";
import Link from "next/link";
import { toZonedTime } from "date-fns-tz";
import { format, addDays, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getAvailableSlots } from "@/lib/availability";

export default async function ServiceBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ stylistSlug: string; serviceId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { stylistSlug, serviceId } = await params;
  const { date: dateParam } = await searchParams;

  const stylist = await prisma.stylist.findUnique({ where: { slug: stylistSlug } });
  if (!stylist) notFound();

  const service = await prisma.service.findFirst({
    where: { id: serviceId, stylistId: stylist.id, active: true },
  });
  if (!service) notFound();

  // Default to "today" in the STYLIST's timezone, not the server's or the
  // visiting customer's -- their business day is what defines the
  // calendar date these slots are computed against.
  const todayInStylistTz = format(toZonedTime(new Date(), stylist.timezone), "yyyy-MM-dd");
  const date = dateParam ?? todayInStylistTz;

  // For prev/next nav -- constructed from the date string's own parts
  // (not re-derived from "now"), so navigating doesn't drift.
  const [y, m, d] = date.split("-").map(Number);
  const asDate = new Date(y, m - 1, d);
  const prevDate = format(subDays(asDate, 1), "yyyy-MM-dd");
  const nextDate = format(addDays(asDate, 1), "yyyy-MM-dd");

  const slots = await getAvailableSlots({ stylist, service, date });

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link href={`/${stylistSlug}`} className="text-sm text-gray-500 hover:underline">
        &larr; {stylist.businessName}
      </Link>

      <h1 className="mt-2 text-2xl font-semibold">{service.name}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {service.durationMinutes} min · ${(service.priceCents / 100).toFixed(2)}
        {service.depositPercentage > 0 && ` · ${service.depositPercentage}% deposit required`}
      </p>

      <div className="mt-8 flex items-center justify-between">
        <Link
          href={`/${stylistSlug}/${serviceId}?date=${prevDate}`}
          className="text-sm text-gray-600 hover:underline"
        >
          &larr; Previous day
        </Link>
        <p className="font-medium">{date}</p>
        <Link
          href={`/${stylistSlug}/${serviceId}?date=${nextDate}`}
          className="text-sm text-gray-600 hover:underline"
        >
          Next day &rarr;
        </Link>
      </div>

      {slots.length === 0 ? (
        <p className="mt-8 text-sm text-gray-500">No available times on this date.</p>
      ) : (
        <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {slots.map((slot) => {
            const localTime = format(toZonedTime(slot, stylist.timezone), "h:mm a");
            return (
              <Link
                key={slot.toISOString()}
                href={`/${stylistSlug}/${serviceId}/confirm?slot=${encodeURIComponent(slot.toISOString())}`}
                className="rounded-md border border-gray-300 px-3 py-2 text-center text-sm hover:bg-gray-50"
              >
                {localTime}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}