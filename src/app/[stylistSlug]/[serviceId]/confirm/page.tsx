import { redirect, notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getAvailableSlots } from "@/lib/availability";
import { createBooking } from "./actions";

export default async function ConfirmBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ stylistSlug: string; serviceId: string }>;
  searchParams: Promise<{ slot?: string }>;
}) {
  const { stylistSlug, serviceId } = await params;
  const { slot } = await searchParams;

  const { userId } = await auth();
  if (!userId) {
    const returnTo = `/${stylistSlug}/${serviceId}/confirm?slot=${encodeURIComponent(slot ?? "")}`;
    redirect(`/sign-in?redirect_url=${encodeURIComponent(returnTo)}`);
  }

  if (!slot) notFound();
  const apptStart = new Date(slot);
  if (Number.isNaN(apptStart.getTime())) notFound();

  const stylist = await prisma.stylist.findUnique({ where: { slug: stylistSlug } });
  if (!stylist) notFound();

  const service = await prisma.service.findFirst({
    where: { id: serviceId, stylistId: stylist.id, active: true },
  });
  if (!service) notFound();

  // Re-verify the slot is still actually available before showing a
  // confirm button -- a nicety, not the real enforcement. The atomic
  // check inside createBooking's transaction is what actually prevents
  // a double-booking; this just avoids showing a stale/dead slot.
  const dateStr = format(toZonedTime(apptStart, stylist.timezone), "yyyy-MM-dd");
  const stillAvailable = (
    await getAvailableSlots({ stylist, service, date: dateStr })
  ).some((s) => s.getTime() === apptStart.getTime());

  const localDateTime = format(toZonedTime(apptStart, stylist.timezone), "EEEE, MMMM d 'at' h:mm a");
  const depositCents = Math.round((service.priceCents * service.depositPercentage) / 100);

  const confirmBookingWithContext = createBooking.bind(null, stylistSlug, serviceId, slot);

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-semibold">Confirm your booking</h1>

      <div className="mt-6 space-y-2 rounded-lg border border-gray-200 p-4">
        <p className="font-medium">{service.name}</p>
        <p className="text-sm text-gray-500">with {stylist.businessName}</p>
        <p className="text-sm text-gray-500">{localDateTime}</p>
        <p className="text-sm text-gray-500">
          {service.durationMinutes} min · ${(service.priceCents / 100).toFixed(2)}
        </p>
        {depositCents > 0 && (
          <p className="text-sm text-gray-500">
            ${(depositCents / 100).toFixed(2)} deposit required to confirm
          </p>
        )}
      </div>

      {!stillAvailable ? (
        <p className="mt-6 text-sm text-red-600">
          Sorry, this time is no longer available. Please go back and pick another slot.
        </p>
      ) : (
        <form action={confirmBookingWithContext} className="mt-6">
          <button
            type="submit"
            className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Confirm Booking
          </button>
        </form>
      )}
    </div>
  );
}