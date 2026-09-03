"use client";

import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { NAVIGATION, findActiveNavItem } from "@/config/navigation";
import { humanizeKey } from "@/lib/utils";

/**
 * Breadcrumbs derived from the pathname and the navigation config.
 *
 * The trail is section -> nav item -> remaining segments. Ids in a detail route
 * are shown humanised as a last resort; a page that knows the real name of the
 * record it loaded should render its own trail instead of relying on this.
 */
export function AppBreadcrumbs() {
  const pathname = usePathname();
  const active = findActiveNavItem(pathname);
  const section = NAVIGATION.find((s) =>
    s.items.some((item) => item.href === active?.href),
  );

  if (!active) return null;

  const remainder = pathname
    .slice(active.href.length)
    .split("/")
    .filter(Boolean);

  return (
    <Breadcrumb>
      <BreadcrumbList className="text-sm">
        {section?.label ? (
          <>
            <BreadcrumbItem>
              <span className="text-muted-foreground">{section.label}</span>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        ) : null}

        <BreadcrumbItem>
          {remainder.length === 0 ? (
            <BreadcrumbPage>{active.label}</BreadcrumbPage>
          ) : (
            <BreadcrumbLink href={active.href}>{active.label}</BreadcrumbLink>
          )}
        </BreadcrumbItem>

        {remainder.map((segment, index) => {
          const isLast = index === remainder.length - 1;
          const href = `${active.href}/${remainder.slice(0, index + 1).join("/")}`;
          const label = humanizeKey(decodeURIComponent(segment));
          return (
            <span key={href} className="contents">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
