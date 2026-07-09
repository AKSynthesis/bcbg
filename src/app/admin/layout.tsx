import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // proxy.ts already guarantees userId + orgId exist for anything under
  // /admin, but it can't guarantee a Stylist row exists yet — that's a
  // DB fact, not a Clerk session fact. This layout is the actual source
  // of truth for "has this stylist finished onboarding."
  const { orgId } = await auth();

  const stylist = orgId
    ? await prisma.stylist.findUnique({ where: { clerkOrgId: orgId } })
    : null;

  if (!stylist) {
    redirect("/onboarding/timezone");
  }

  const navLinks = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/services", label: "Services" },
    { href: "/admin/availability", label: "Availability" },
    { href: "/admin/bookings", label: "Bookings" },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <p className="text-sm text-gray-500">{stylist.businessName}</p>
        </div>
        <UserButton />
      </header>

      <div className="flex flex-1">
        <nav className="w-48 shrink-0 border-r border-gray-200 px-4 py-6">
          <ul className="space-y-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}