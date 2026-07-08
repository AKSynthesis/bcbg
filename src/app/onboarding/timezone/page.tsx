import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { completeStylistOnboarding } from "./actions";

export default async function OnboardingTimezonePage() {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/onboarding/timezone");
  }

  if (!orgId) {
    redirect("/onboarding/business");
  }

  const timezones = Intl.supportedValuesOf("timeZone");

  // Best-effort guess at the browser/server's local timezone, just to
  // preselect something sensible — the stylist can change it.
  const guessedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <form action={completeStylistOnboarding} className="w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-lg font-semibold">One more thing</h1>
          <p className="text-sm text-gray-500">
            What timezone is your business in? This determines how your
            availability and booking times are displayed to customers.
          </p>
        </div>

        <select
          name="timezone"
          defaultValue={timezones.includes(guessedTimezone) ? guessedTimezone : "UTC"}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          required
        >
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Finish setup
        </button>
      </form>
    </div>
  );
}