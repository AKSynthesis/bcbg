type ServiceFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  defaultValues?: {
    name: string;
    durationMinutes: number;
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
    priceDollars: number;
    depositPercentage: number;
  };
  submitLabel?: string;
};

export function ServiceForm({ action, defaultValues, submitLabel = "Save" }: ServiceFormProps) {
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Name</label>
        <input
          type="text"
          name="name"
          defaultValue={defaultValues?.name}
          required
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Duration (minutes)</label>
          <input
            type="number"
            name="durationMinutes"
            min={5}
            max={480}
            defaultValue={defaultValues?.durationMinutes ?? 30}
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Price ($)</label>
          <input
            type="number"
            name="priceDollars"
            min={0}
            step="0.01"
            defaultValue={defaultValues?.priceDollars ?? 0}
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Buffer before (minutes)</label>
          <input
            type="number"
            name="bufferBeforeMinutes"
            min={0}
            max={120}
            defaultValue={defaultValues?.bufferBeforeMinutes ?? 0}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Buffer after (minutes)</label>
          <input
            type="number"
            name="bufferAfterMinutes"
            min={0}
            max={120}
            defaultValue={defaultValues?.bufferAfterMinutes ?? 0}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Deposit (%)</label>
        <input
          type="number"
          name="depositPercentage"
          min={0}
          max={100}
          defaultValue={defaultValues?.depositPercentage ?? 0}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">
          Percentage of the price charged upfront to confirm a booking. 0
          means no deposit required.
        </p>
      </div>

      <button
        type="submit"
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
      >
        {submitLabel}
      </button>
    </form>
  );
}