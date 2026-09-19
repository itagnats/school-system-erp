"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Briefcase, GraduationCap, Presentation, UserRound } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { NAV_ITEM_TOTAL, navItemCountFor } from "@/config/navigation";
import { canOpenPath, landingPathFor, safeReturnPath } from "@/lib/access";
import { signIn } from "@/lib/api/session";
import { cn } from "@/lib/utils";
import type { AppRole, DemoAccount } from "@/types";

/**
 * One card per demo account.
 *
 * Each card states what that role can reach before it is chosen - "3 of 14
 * sections" - because the point of the screen is the difference between the
 * roles, and a reader who has to sign in four times to discover it has been
 * told nothing. The count is derived from the same access table the sidebar and
 * `proxy.ts` read, so it cannot drift from what actually happens next.
 */

const ICON: Record<AppRole, typeof UserRound> = {
  administrator: Briefcase,
  teacher: Presentation,
  ta: UserRound,
  student: GraduationCap,
};

export function SignInCards({
  accounts,
  currentAccountId,
}: Readonly<{ accounts: DemoAccount[]; currentAccountId?: string }>) {
  const router = useRouter();
  const params = useSearchParams();
  const [pendingId, setPendingId] = useState<string>();
  const [failed, setFailed] = useState(false);

  async function choose(account: DemoAccount) {
    setPendingId(account.id);
    setFailed(false);

    try {
      await signIn(account.id);
      // The return path is whatever the proxy recorded when it turned somebody
      // away - and it is checked before use, because a parameter that decides
      // where a browser goes next is the shape of an open redirect. A role that
      // cannot open where they were headed lands on their own home instead.
      const wanted = safeReturnPath(params.get("next"), landingPathFor(account.role));
      const target = canOpenPath(account.role, wanted)
        ? wanted
        : landingPathFor(account.role);

      // replace, not push: the sign-in screen should not be a place the back
      // button returns to after signing in.
      router.replace(target);
      // The shell is server-rendered from the cookie, so the new identity only
      // appears once the server renders again.
      router.refresh();
    } catch {
      setFailed(true);
      setPendingId(undefined);
    }
  }

  return (
    <div className="mt-8 flex flex-col gap-3">
      {failed ? (
        <Alert variant="destructive">
          <AlertDescription>
            That did not work. Check the application is running and try again.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {accounts.map((account) => {
          const Icon = ICON[account.role];
          const isCurrent = account.id === currentAccountId;

          return (
            <div
              key={account.id}
              className={cn(
                "flex flex-col gap-3 rounded-lg border-hairline bg-card p-4 shadow-xs",
                isCurrent && "ring-2 ring-ring/50",
              )}
            >
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <Icon aria-hidden className="size-4" />
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-base font-medium text-foreground">
                    {account.displayName}
                  </span>
                  <span className="text-sm text-muted-foreground">{account.title}</span>
                  {account.context ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {account.context}
                    </span>
                  ) : null}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                {describeReach(account)}
              </p>

              <Button
                onClick={() => choose(account)}
                loading={pendingId === account.id}
                disabled={pendingId !== undefined && pendingId !== account.id}
                className="w-full"
              >
                {isCurrent ? "Continue as this role" : "Sign in"}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="pt-2 text-center text-xs text-muted-foreground">
        A demo identity, not authentication. It is a plain cookie, anyone may
        pick any role, and nothing here protects real data.
      </p>
    </div>
  );
}

/**
 * How much of the navigation this account can open, counted from the real table.
 *
 * Counted through `navItemCountFor`, which is the function the sidebar itself
 * uses - so a card promising five sections is promising the five that will be
 * there. The denominator is every item any role could see, which is why it does
 * not move between cards.
 */
function describeReach(account: DemoAccount): string {
  const open = navItemCountFor(account);
  return `Sees ${open} of ${NAV_ITEM_TOTAL} sections`;
}
