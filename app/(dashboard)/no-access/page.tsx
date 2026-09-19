import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ShieldX } from "lucide-react";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { PRINCIPAL_COOKIE, landingPathFor, safeReturnPath } from "@/lib/access";
import { resolvePrincipal } from "@/server/services";

export const metadata: Metadata = { title: "Not available" };

interface PageParams {
  searchParams: Promise<{ from?: string }>;
}

/**
 * Where a refusal lands (direction.md §3a).
 *
 * Inside the shell rather than on a bare page, deliberately: somebody who has
 * hit a wall needs the navigation they *do* have, not a dead end. The sidebar
 * beside this page is the answer to "what can I open, then".
 *
 * It states the role rather than the rule. "Not available to a teacher" is
 * true and useful; listing what a teacher may reach would turn a refusal into
 * a directory of the things worth attacking.
 */
export default async function Page({ searchParams }: PageParams) {
  const { from } = await searchParams;
  const store = await cookies();
  const principal = resolvePrincipal(store.get(PRINCIPAL_COOKIE)?.value);

  // Validated before it is printed as well as before it is followed - it
  // arrives in the URL, so it is somebody's text until it is checked.
  const attempted = safeReturnPath(from, "");
  const home = landingPathFor(principal?.role ?? "student");

  return (
    <>
      <PageHeader
        title="Not available to you"
        description={
          principal
            ? `You are signed in as ${principal.displayName} — ${principal.title}.`
            : "You are not signed in."
        }
      />

      <div className="flex max-w-xl flex-col gap-4 rounded-lg border-hairline bg-card p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <ShieldX aria-hidden className="size-4" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-sm text-foreground">
              {attempted
                ? `This role cannot open ${attempted}.`
                : "This role cannot open that page."}
            </p>
            <p className="text-sm text-muted-foreground">
              The navigation shows what is available to you. Signing in as
              another role will show a different application.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={home}>Go to my home page</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Switch role</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
