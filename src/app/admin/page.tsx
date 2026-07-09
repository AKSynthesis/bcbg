import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export default async function AdminOverviewPage() {
  // Re-fetched here rather than threaded down from the layout — a single
  // indexed lookup is cheap, and it keeps this page independently correct
  // if the layout's data-fetching ever changes. Worth revisiting with
  // React's cache() if this pattern repeats across more admin pages.
  const { orgId } = await auth();
  const stylist = await prisma.stylist.findUniqueOrThrow({
    where: { clerkOrgId: orgId! },
  });

  const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/${stylist.slug}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {stylist.businessName}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Timezone: {stylist.timezone} · Your booking page:{" "}
          <a href={bookingUrl} className="underline">
            {bookingUrl}
          </a>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 p-4">
          <h2 className="font-medium">Services</h2>
          <p className="mt-1 text-sm text-gray-500">
            Define what customers can book. Coming soon.
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 p-4">
          <h2 className="font-medium">Availability</h2>
          <p className="mt-1 text-sm text-gray-500">
            Set your weekly hours and exceptions. Coming soon.
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 p-4">
          <h2 className="font-medium">Bookings</h2>
          <p className="mt-1 text-sm text-gray-500">
            See upcoming and past appointments. Coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}