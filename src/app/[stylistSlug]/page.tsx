import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function StylistBookingPage({
  params,
}: {
  params: Promise<{ stylistSlug: string }>;
}) {
  const { stylistSlug } = await params;

  const stylist = await prisma.stylist.findUnique({ where: { slug: stylistSlug } });
  if (!stylist) notFound();

  const services = await prisma.service.findMany({
    where: { stylistId: stylist.id, active: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold">{stylist.businessName}</h1>
      <p className="mt-1 text-sm text-gray-500">Book an appointment below.</p>

      {services.length === 0 ? (
        <p className="mt-8 text-sm text-gray-500">
          This stylist hasn&apos;t added any services yet.
        </p>
      ) : (
        <div className="mt-8 divide-y divide-gray-200 rounded-lg border border-gray-200">
          {services.map((service) => (
            <Link
              key={service.id}
              href={`/${stylistSlug}/${service.id}`}
              className="flex items-center justify-between px-4 py-4 hover:bg-gray-50"
            >
              <div>
                <p className="font-medium">{service.name}</p>
                <p className="text-sm text-gray-500">{service.durationMinutes} min</p>
              </div>
              <p className="font-medium">${(service.priceCents / 100).toFixed(2)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}