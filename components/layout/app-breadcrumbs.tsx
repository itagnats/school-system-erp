"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useBreadcrumbTrail } from "./use-breadcrumb-trail";

/**
 * Breadcrumbs derived from the pathname and the navigation config.
 *
 * The trail is section -> nav item -> remaining segments. It is built by
 * `useBreadcrumbTrail`, which `BackButton` reads too, so the two cannot
 * disagree about where up is.
 */
export function AppBreadcrumbs() {
  const trail = useBreadcrumbTrail();

  if (!trail) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList className="text-sm">
        {trail.sectionLabel ? (
          <>
            <BreadcrumbItem>
              <span className="text-muted-foreground">{trail.sectionLabel}</span>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        ) : null}

        {trail.crumbs.map((crumb, index) => (
          <span key={crumb.href ?? `page:${crumb.label}`} className="contents">
            {index > 0 ? <BreadcrumbSeparator /> : null}
            <BreadcrumbItem>
              {crumb.href ? (
                <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
