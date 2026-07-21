import Link from "next/link";

const scheduleMock = [
  { time: "9:00", label: "Color + Cut", status: "booked" as const },
  { time: "11:30", label: "Blowout", status: "open" as const },
  { time: "1:00", label: "Trim", status: "booked" as const },
  { time: "3:30", label: "Balayage", status: "open" as const },
];

const steps = [
  {
    n: "01",
    title: "Open your page",
    body: "Set your hours and services once. Your booking link is ready in minutes.",
  },
  {
    n: "02",
    title: "Clients book themselves",
    body: "They pick an open time in their own timezone, and pay a deposit if you require one.",
  },
  {
    n: "03",
    title: "Everyone's reminded",
    body: "Confirmations and reminders go out by email and text — automatically.",
  },
];

const features = [
  "Deposits via Stripe",
  "Email & SMS reminders",
  "No double-bookings",
  "Your own booking page",
];

export default function Home() {
  return (
    <div className="flex-1">
      {/* Hero */}
      <section className="mx-auto grid max-w-5xl gap-12 px-6 py-20 sm:py-28 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-brass uppercase">
            Bon chic, bon genre
          </p>
          <h1 className="mt-4 font-display text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
            Booking, kept in good form.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-ink/70">
            One link for your chair. Clients pick a time, pay their deposit, and get reminded —
            automatically.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/sign-up"
              className="rounded-sm bg-wine px-5 py-3 text-sm font-medium text-paper transition-colors hover:bg-wine-dark"
            >
              List your chair
            </Link>
            <Link
              href="/sign-in"
              className="text-sm font-medium text-ink/70 hover:text-ink hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Signature element: a stylized day sheet, standing in for the
            actual availability/slot picker the product is built on. */}
        <div className="rounded-sm border border-ink/15 bg-paper-dark/60 p-6 shadow-[6px_6px_0_0_rgba(33,28,24,0.08)]">
          <div className="flex items-baseline justify-between border-b border-ink/15 pb-3">
            <p className="font-display text-lg italic">Tuesday</p>
            <p className="font-mono text-xs text-ink/50">14 JUL</p>
          </div>
          <ul className="divide-y divide-ink/10">
            {scheduleMock.map((slot) => (
              <li key={slot.time} className="flex items-center justify-between py-3">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-sm text-ink/50">{slot.time}</span>
                  <span className="text-sm">{slot.label}</span>
                </div>
                <span
                  className={
                    slot.status === "booked"
                      ? "font-mono text-xs tracking-wide text-brass uppercase"
                      : "font-mono text-xs tracking-wide text-ink/40 uppercase"
                  }
                >
                  {slot.status === "booked" ? "Booked" : "Open"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works -- numbered because it IS a sequence: the order is
          literally the order a stylist and their client move through. */}
      <section className="border-t border-ink/10 bg-paper-dark/40">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <div className="grid gap-10 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.n}>
                <p className="font-mono text-sm text-brass">{step.n}</p>
                <h2 className="mt-2 font-display text-xl font-semibold">{step.title}</h2>
                <p className="mt-2 text-sm leading-6 text-ink/70">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <ul className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-center">
          {features.map((feature) => (
            <li key={feature} className="font-mono text-xs tracking-wide text-ink/60 uppercase">
              {feature}
            </li>
          ))}
        </ul>
      </section>

      {/* Final CTA */}
      <section className="border-t border-ink/10 bg-wine text-paper">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center sm:py-20">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Your chair, your hours, your terms.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-paper/80">
            Free to start. Connect Stripe when you&apos;re ready to collect deposits.
          </p>
          <Link
            href="/sign-up"
            className="mt-8 inline-block rounded-sm bg-paper px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-paper-dark"
          >
            List your chair
          </Link>
        </div>
      </section>
    </div>
  );
}