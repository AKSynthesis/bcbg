import { getCurrentStylist } from "@/lib/current-stylist";
import { prisma } from "@/lib/prisma";
import { DAY_NAMES, formatMinutesToTime } from "@/lib/time";
import {
  addAvailabilityRule,
  deleteAvailabilityRule,
  upsertAvailabilityException,
  deleteAvailabilityException,
} from "./actions";

export default async function AvailabilityPage() {
  // admin/layout.tsx already guarantees this exists.
  const stylist = await getCurrentStylist();
  if (!stylist) return null;

  const [rules, exceptions] = await Promise.all([
    prisma.availabilityRule.findMany({
      where: { stylistId: stylist.id },
      orderBy: [{ dayOfWeek: "asc" }, { startMinutes: "asc" }],
    }),
    // Simplification for v1: shows every exception ever created, not just
    // upcoming ones -- filtering to "upcoming" needs "today" computed in
    // the stylist's own timezone, not the server's, which adds real
    // complexity for a list a stylist can just prune manually for now.
    prisma.availabilityException.findMany({
      where: { stylistId: stylist.id },
      orderBy: { date: "asc" },
    }),
  ]);

  const rulesByDay = DAY_NAMES.map((name, dayOfWeek) => ({
    dayOfWeek,
    name,
    blocks: rules.filter((rule) => rule.dayOfWeek === dayOfWeek),
  }));

  return (
    <div className="max-w-2xl space-y-12">
      {/* --- Weekly hours ------------------------------------------------ */}
      <section className="space-y-4">
        <h1 className="text-xl font-semibold">Weekly Hours</h1>

        <div className="divide-y divide-gray-200 rounded-lg border border-gray-200">
          {rulesByDay.map(({ dayOfWeek, name, blocks }) => (
            <div key={dayOfWeek} className="px-4 py-3">
              <p className="font-medium">{name}</p>
              {blocks.length === 0 ? (
                <p className="text-sm text-gray-400">Unavailable</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {blocks.map((block) => (
                    <li key={block.id} className="flex items-center gap-3 text-sm text-gray-600">
                      <span>
                        {formatMinutesToTime(block.startMinutes)} – {formatMinutesToTime(block.endMinutes)}
                      </span>
                      <form action={deleteAvailabilityRule.bind(null, block.id)}>
                        <button type="submit" className="text-gray-400 hover:text-gray-700 hover:underline">
                          Remove
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <form action={addAvailabilityRule} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm font-medium">Day</label>
            <select
              name="dayOfWeek"
              defaultValue={1}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {DAY_NAMES.map((name, index) => (
                <option key={index} value={index}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Start</label>
            <input
              type="time"
              name="startTime"
              defaultValue="09:00"
              required
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">End</label>
            <input
              type="time"
              name="endTime"
              defaultValue="17:00"
              required
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Add Block
          </button>
        </form>
      </section>

      {/* --- Exceptions ---------------------------------------------------- */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Exceptions</h2>
          <p className="text-sm text-gray-500">
            Override your weekly hours for a specific date — a day off, or
            shortened hours.
          </p>
        </div>

        {exceptions.length === 0 ? (
          <p className="text-sm text-gray-500">No exceptions yet.</p>
        ) : (
          <div className="divide-y divide-gray-200 rounded-lg border border-gray-200">
            {exceptions.map((exception) => (
              <div key={exception.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium">
                    {exception.date.toISOString().slice(0, 10)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {exception.isClosed
                      ? "Closed all day"
                      : `${formatMinutesToTime(exception.startMinutes!)} – ${formatMinutesToTime(exception.endMinutes!)}`}
                  </p>
                </div>
                <form action={deleteAvailabilityException.bind(null, exception.id)}>
                  <button type="submit" className="text-sm text-gray-600 hover:underline">
                    Remove
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <form action={upsertAvailabilityException} className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-sm font-medium">Date</label>
              <input
                type="date"
                name="date"
                required
                className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" name="isClosed" defaultChecked />
              Closed all day
            </label>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-sm font-medium">
                Start <span className="text-gray-400">(ignored if closed)</span>
              </label>
              <input
                type="time"
                name="startTime"
                className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">
                End <span className="text-gray-400">(ignored if closed)</span>
              </label>
              <input
                type="time"
                name="endTime"
                className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
            >
              Save Exception
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}