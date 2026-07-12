import { createService } from "../actions";
import { ServiceForm } from "../service-form";

export default function NewServicePage() {
  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-xl font-semibold">New Service</h1>
      <ServiceForm action={createService} />
    </div>
  );
}