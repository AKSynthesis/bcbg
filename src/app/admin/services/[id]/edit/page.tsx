import { notFound } from "next/navigation";
import { getCurrentStylist } from "@/lib/current-stylist";
import { prisma } from "@/lib/prisma";
import { updateService } from "../../actions";
import { ServiceForm } from "../../service-form";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const stylist = await getCurrentStylist();
  if (!stylist) return null;

  // Tenant isolation: only fetch if this service belongs to the current
  // stylist -- otherwise 404 rather than leaking whether the id exists
  // under a different stylist.
  const service = await prisma.service.findFirst({
    where: { id, stylistId: stylist.id },
  });

  if (!service) {
    notFound();
  }

  const updateServiceWithId = updateService.bind(null, service.id);

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-xl font-semibold">Edit Service</h1>
      <ServiceForm
        action={updateServiceWithId}
        defaultValues={{
          name: service.name,
          durationMinutes: service.durationMinutes,
          bufferBeforeMinutes: service.bufferBeforeMinutes,
          bufferAfterMinutes: service.bufferAfterMinutes,
          priceDollars: service.priceCents / 100,
          depositPercentage: service.depositPercentage,
        }}
        submitLabel="Save changes"
      />
    </div>
  );
}