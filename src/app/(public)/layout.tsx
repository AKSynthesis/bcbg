import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <Link href="/" className="font-semibold">
          BCBG
        </Link>

        <Show when="signed-in">
          <UserButton />
        </Show>
        <Show when="signed-out">
          <Link href="/sign-in" className="text-sm text-gray-600 hover:underline">
            Sign in
          </Link>
        </Show>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}