import { notFound, redirect } from "next/navigation";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomer } from "@/lib/current-customer";

export default async function BookingConfirmedPage({
  params,
}: {
  params: Promise<{ stylistSlug: string; bookingId: string }>;
}) {
  const { stylistSlug, bookingId } = await params;

  const customer = await getCurrentCustomer();
  if (!customer) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(`/${stylistSlug}/bookings/${bookingId}`)}`);
  }

  const stylist = await prisma.stylist.findUnique({ where: { slug: stylistSlug } });
  if (!stylist) notFound();

  // Isolation: only show this booking if it belongs to BOTH the stylist
  // implied by the URL slug AND the currently signed-in customer.
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, stylistId: stylist.id, customerId: customer.id },
    include: { service: true },
  });
  if (!booking) notFound();

  const apptStart = new Date(booking.startAt.getTime() + booking.service.bufferBeforeMinutes * 60_000);
  const localDateTime = format(toZonedTime(apptStart, stylist.timezone), "EEEE, MMMM d 'at' h:mm a");

  return (
    <div className="mx-auto max-w-md px-6 py-12 text-center">
      <h1 className="text-2xl font-semibold">You&apos;re booked!</h1>
      <p className="mt-2 text-gray-600">
        {booking.service.name} with {stylist.businessName}
      </p>
      <p className="mt-1 text-gray-600">{localDateTime}</p>
      {booking.depositAmountCents > 0 && (
        <p className="mt-4 text-sm text-gray-500">
          A ${(booking.depositAmountCents / 100).toFixed(2)} deposit will be required to secure this
          appointment.
        </p>
      )}
    </div>
  );
}