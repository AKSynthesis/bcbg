import Link from "next/link";
import { getCurrentStylist } from "@/lib/current-stylist";
import { prisma } from "@/lib/prisma";
import { toggleServiceActive } from "./actions";

export default async function ServicesPage() {
  // admin/layout.tsx already guarantees this exists.
  const stylist = await getCurrentStylist();
  if (!stylist) return null;

  const services = await prisma.service.findMany({
    where: { stylistId: stylist.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Services</h1>
        <Link
          href="/admin/services/new"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
        >
          New Service
        </Link>
      </div>

      {services.length === 0 ? (
        <p className="text-sm text-gray-500">
          You haven&apos;t added any services yet.
        </p>
      ) : (
        <div className="divide-y divide-gray-200 rounded-lg border border-gray-200">
          {services.map((service) => (
            <div key={service.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className={`font-medium ${service.active ? "" : "text-gray-400"}`}>
                  {service.name}
                  {!service.active && (
                    <span className="ml-2 text-xs uppercase text-gray-400">Inactive</span>
                  )}
                </p>
                <p className="text-sm text-gray-500">
                  {service.durationMinutes} min · ${(service.priceCents / 100).toFixed(2)}
                  {service.depositPercentage > 0 && ` · ${service.depositPercentage}% deposit`}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href={`/admin/services/${service.id}/edit`}
                  className="text-sm text-gray-600 hover:underline"
                >
                  Edit
                </Link>
                <form action={toggleServiceActive.bind(null, service.id)}>
                  <button type="submit" className="text-sm text-gray-600 hover:underline">
                    {service.active ? "Deactivate" : "Reactivate"}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}