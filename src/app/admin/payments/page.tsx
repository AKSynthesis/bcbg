import Link from "next/link";
import { getCurrentStylist } from "@/lib/current-stylist";
import { stripe } from "@/lib/stripe";
import { connectStripeAccount } from "./actions";

export default async function PaymentsPage() {
  // admin/layout.tsx already guarantees this exists.
  const stylist = await getCurrentStylist();
  if (!stylist) return null;

  let chargesEnabled = false;
  let detailsSubmitted = false;

  if (stylist.stripeConnectAccountId) {
    const account = await stripe.accounts.retrieve(stylist.stripeConnectAccountId);
    chargesEnabled = account.charges_enabled;
    detailsSubmitted = account.details_submitted;
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">Payments</h1>

      {!stylist.stripeConnectAccountId ? (
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">
            Connect a Stripe account to collect deposits directly from customers when they book.
          </p>
          <form action={connectStripeAccount} className="mt-4">
            <button
              type="submit"
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
            >
              Connect with Stripe
            </button>
          </form>
        </div>
      ) : chargesEnabled ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">Stripe account connected</p>
          <p className="mt-1 text-sm text-green-700">
            You can now collect deposits on services that require them.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm font-medium text-yellow-800">
            {detailsSubmitted ? "Verification in progress" : "Setup incomplete"}
          </p>
          <p className="mt-1 text-sm text-yellow-700">
            {detailsSubmitted
              ? "Stripe is reviewing your information. This usually only takes a few minutes."
              : "You started connecting a Stripe account but didn't finish. Continue below."}
          </p>
          {detailsSubmitted ? (
            <Link href="/admin/payments" className="mt-4 inline-block text-sm underline">
              Refresh status
            </Link>
          ) : (
            <form action={connectStripeAccount} className="mt-4">
              <button
                type="submit"
                className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
              >
                Continue setup
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}