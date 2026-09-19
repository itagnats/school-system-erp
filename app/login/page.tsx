import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { PetalField } from "@/components/decor";
import { Brand } from "@/components/layout";
import { PRINCIPAL_COOKIE } from "@/lib/access";
import { listDemoAccounts, resolvePrincipal } from "@/server/services";
import { SignInCards } from "./_components/sign-in-cards";

export const metadata: Metadata = { title: "Sign in" };

/**
 * The demo sign-in (direction.md §3a).
 *
 * Outside the `(dashboard)` route group on purpose: there is no shell here,
 * because a sidebar full of destinations is exactly what has not been decided
 * yet. The page is the decision.
 *
 * A server component. The account list is read from the service directly rather
 * than over `/api` - the same call the dashboard makes, and for the same reason:
 * there is nothing to filter, sort or page, so a network hop to the
 * application's own memory buys nothing.
 */
export default async function Page() {
  const accounts = listDemoAccounts();
  const store = await cookies();
  const current = resolvePrincipal(store.get(PRINCIPAL_COOKIE)?.value);

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 py-12">
      <PetalField />

      <div className="relative w-full max-w-3xl">
        <header className="flex flex-col items-center gap-4 text-center">
          <Brand />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-lg font-medium text-foreground">
              Choose who to sign in as
            </h1>
            {/* Said plainly, on the screen, not only in a comment. A demo that
                does not admit what it is would be the wrong thing to build -
                the same argument the invoice sheet makes about its barcode. */}
            <p className="text-sm text-muted-foreground">
              PRIME has no accounts and no passwords. Pick a role to see the
              application as that person sees it — the navigation and the API
              both follow your choice.
            </p>
          </div>
        </header>

        <Suspense fallback={<CardsFallback count={accounts.length} />}>
          <SignInCards accounts={accounts} currentAccountId={current?.accountId} />
        </Suspense>
      </div>
    </div>
  );
}

/**
 * The cards read the return path from the URL, which a prerendered page cannot
 * resolve, so they wait behind a boundary. The fallback holds the same shape so
 * the layout does not jump when they arrive.
 */
function CardsFallback({ count }: { count: number }) {
  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-2">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          aria-hidden
          className="h-28 rounded-lg border-hairline bg-card shadow-xs"
        />
      ))}
    </div>
  );
}
