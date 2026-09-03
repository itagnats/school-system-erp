"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAVIGATION, findActiveNavItem } from "@/config/navigation";
import { cn } from "@/lib/utils";

/**
 * The navigation list itself, shared by the desktop sidebar and the mobile
 * drawer so there is exactly one place where nav markup and active state live.
 *
 * The active item is a filled pink pill — the one solid shape in the
 * navigation — with a pink icon to match. Nothing else in the list carries
 * colour, so the eye finds the current page immediately.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = findActiveNavItem(pathname);

  return (
    <nav aria-label="Main" className="flex flex-col gap-4 px-2 py-3">
      {NAVIGATION.map((section, index) => (
        <div key={section.label ?? `section-${index}`} className="flex flex-col gap-0.5">
          {section.label ? (
            <h2 className="px-3 pb-1.5 text-[10px] font-medium tracking-[0.1em] text-sidebar-muted-foreground uppercase">
              {section.label}
            </h2>
          ) : null}

          {section.items.map((item) => {
            const isActive = active?.href === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground",
                )}
                style={{ minHeight: "var(--control-h)" }}
              >
                <Icon
                  aria-hidden
                  className={cn(
                    "size-4 shrink-0",
                    isActive ? "text-sidebar-accent-foreground" : "text-sidebar-muted-foreground",
                  )}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
