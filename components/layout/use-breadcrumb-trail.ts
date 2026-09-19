"use client";

import { usePathname } from "next/navigation";
import { NAVIGATION, findActiveNavItem, navigationFor } from "@/config/navigation";
import { PAGE_ACCESS, canOpenPath, mayPassAsOwner } from "@/lib/access";
import { humanizeKey } from "@/lib/utils";
import type { DemoPrincipal } from "@/types";

export interface BreadcrumbCrumb {
  label: string;
  /** Absent on the current page, which is rendered as text rather than a link. */
  href?: string;
}

export interface BreadcrumbTrail {
  /** The navigation section the page sits under. A heading, never a link. */
  sectionLabel?: string;
  /** Section excluded: nav item first, then one crumb per extra path segment. */
  crumbs: BreadcrumbCrumb[];
  /**
   * Where "up one level" goes, or null on a top-level page that has no parent.
   * This is what decides whether a back control is offered at all.
   */
  parentHref: string | null;
}

/**
 * The breadcrumb trail for the current pathname, derived from the navigation
 * config.
 *
 * Both `AppBreadcrumbs` and `BackButton` read this rather than deriving the
 * path twice, so the arrow cannot point somewhere the trail does not show.
 *
 * Ids in a detail route are humanised as a last resort; a page that knows the
 * real name of the record it loaded should render its own trail instead.
 *
 * **Role-aware, because a trail is made of links** (direction.md §3a). A
 * student standing on their own profile has no Student Profiles list to go back
 * to, and offering it sends the one person who can see the control to
 * `/no-access`. So the trail is resolved against the navigation this principal
 * actually has, and any crumb they cannot open loses its link and keeps its
 * label - the reader still sees where they are, and is not invited somewhere
 * they will be refused.
 */
export function useBreadcrumbTrail(principal: DemoPrincipal): BreadcrumbTrail | null {
  const pathname = usePathname();

  const sections = navigationFor(principal);
  const active = findActiveNavItem(
    pathname,
    sections.flatMap((section) => section.items),
  );

  if (!active) return null;

  const section = NAVIGATION.find((s) =>
    s.items.some((item) => item.href === active.href),
  ) ?? sections.find((s) => s.items.some((item) => item.href === active.href));

  const reachable = (href: string) =>
    canOpenPath(principal.role, href) || mayPassAsOwner(PAGE_ACCESS, principal.role, href);

  const remainder = pathname
    .slice(active.href.length)
    .split("/")
    .filter(Boolean);

  const linkIf = (href: string) => (reachable(href) ? href : undefined);

  const crumbs: BreadcrumbCrumb[] = [
    {
      label: active.label,
      href: remainder.length === 0 ? undefined : linkIf(active.href),
    },
    ...remainder.map((segment, index) => {
      if (index === remainder.length - 1) {
        return { label: humanizeKey(decodeURIComponent(segment)) };
      }
      const href = `${active.href}/${remainder.slice(0, index + 1).join("/")}`;
      return { label: humanizeKey(decodeURIComponent(segment)), href: linkIf(href) };
    }),
  ];

  // The crumb before the current page. On a top-level list page the trail is a
  // single unlinked crumb, so this is undefined and no back control is shown -
  // and the same now happens when the parent exists but this role cannot open
  // it, which is the honest outcome: there is nowhere for them to go back to.
  const parentHref = crumbs[crumbs.length - 2]?.href ?? null;

  return { sectionLabel: section?.label, crumbs, parentHref };
}
