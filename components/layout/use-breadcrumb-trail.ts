"use client";

import { usePathname } from "next/navigation";
import { NAVIGATION, findActiveNavItem } from "@/config/navigation";
import { humanizeKey } from "@/lib/utils";

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
 */
export function useBreadcrumbTrail(): BreadcrumbTrail | null {
  const pathname = usePathname();
  const active = findActiveNavItem(pathname);

  if (!active) return null;

  const section = NAVIGATION.find((s) =>
    s.items.some((item) => item.href === active.href),
  );

  const remainder = pathname
    .slice(active.href.length)
    .split("/")
    .filter(Boolean);

  const crumbs: BreadcrumbCrumb[] = [
    {
      label: active.label,
      href: remainder.length === 0 ? undefined : active.href,
    },
    ...remainder.map((segment, index) => ({
      label: humanizeKey(decodeURIComponent(segment)),
      href:
        index === remainder.length - 1
          ? undefined
          : `${active.href}/${remainder.slice(0, index + 1).join("/")}`,
    })),
  ];

  // The crumb before the current page. On a top-level list page the trail is a
  // single unlinked crumb, so this is undefined and no back control is shown.
  const parentHref = crumbs[crumbs.length - 2]?.href ?? null;

  return { sectionLabel: section?.label, crumbs, parentHref };
}
