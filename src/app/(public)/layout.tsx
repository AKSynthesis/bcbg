import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-paper text-ink">
      <header className="flex items-center justify-between border-b border-ink/10 px-6 py-4">
        <Link href="/" className="font-display text-lg font-semibold tracking-tight">
          BCBG
        </Link>

        <Show when="signed-in">
          <UserButton />
        </Show>
        <Show when="signed-out">
          <Link href="/sign-in" className="text-sm text-ink/70 hover:text-ink hover:underline">
            Sign in
          </Link>
        </Show>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}