"use client";

import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useBreadcrumbTrail } from "./use-breadcrumb-trail";

/**
 * The pathname this document was opened on.
 *
 * Module scope, so a full page load resets it — which is exactly the boundary
 * that matters. A deep link, a pasted URL or a fresh tab starts here with no
 * in-app history behind it, and `router.back()` there either leaves the app or
 * does nothing at all.
 */
let entryPathname: string | null = null;

/**
 * Up one level, shown on every breadcrumbed page that has a parent.
 *
 * ## Why it is not simply `router.back()`
 *
 * History back is the right behaviour when the visitor walked here — it undoes
 * a sideways move a parent link cannot, such as switching tabs within a page.
 * But the same call on a deep link walks out of the application, which is the
 * one thing a back control inside the application must not do. So: back when
 * this document has navigated since it loaded, and a push to the parent crumb
 * otherwise. The fallback is the deterministic one, and it is the one that runs
 * in the uncertain case.
 *
 * The button is absent, not disabled, on a top-level page. There is nothing to
 * explain and nothing to enable — `useBreadcrumbTrail` reports no parent.
 *
 * ## Where it sits
 *
 * `AppShell` renders it at the top of the content column, above the page title,
 * rather than beside the breadcrumbs. The trail is a statement of where you
 * are, and the header is already carrying the global controls; a second
 * navigation affordance in that slot competes with both. Above the h1 the
 * control belongs to the page it will leave, on the same left edge as the title.
 */
export function BackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const trail = useBreadcrumbTrail();
  const parentHref = trail?.parentHref ?? null;

  useEffect(() => {
    entryPathname ??= pathname;
  }, [pathname]);

  if (!parentHref) return null;

  // An arrow function created after the guard, not a hoisted declaration: a
  // declaration is hoisted above the narrowing and loses it, so parentHref
  // would read as string | null inside it.
  const goBack = () => {
    // Standing on the entry pathname means either nothing has been navigated
    // yet, or the visitor has already walked back to where they came in. Both
    // are cases where history back leaves the app.
    if (entryPathname !== null && pathname !== entryPathname) {
      router.back();
      return;
    }
    router.push(withPersona(parentHref));
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      // -ml-2 pulls the ghost padding back so the chevron sits on the same left
      // edge as the h1 below it; mb-2 separates it from the title without
      // reaching for --section-gap, which is the gap between blocks of content.
      className="-ml-2 mb-2 text-muted-foreground"
      // Chrome, not content: a printed page carries the document, not the way
      // back to the list it came from.
      data-print="hide"
      // Labelled rather than an icon alone. The word is the accessible name, and
      // it stays "Back" rather than naming the parent, because the destination
      // depends on history at click time and could be announced wrongly.
      onClick={goBack}
    >
      <ChevronLeft data-icon="inline-start" aria-hidden />
      Back
    </Button>
  );
}

/**
 * Carry `?as=` up to the parent route.
 *
 * Identity, not a filter: dropping it on the way out of an assignment would
 * land the evaluator on a queue that no longer knows who they are. Read from
 * `window.location` at click time rather than through `useSearchParams`, which
 * would opt every page holding the header out of static rendering.
 *
 * Only `as` is carried. A detail page's filters and sort belong to that page.
 */
function withPersona(href: string): string {
  const persona = new URLSearchParams(window.location.search).get("as");
  if (!persona) return href;
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}as=${encodeURIComponent(persona)}`;
}
