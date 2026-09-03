"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { NAV_ANCHOR_IDS, NAV_GROUPS } from "./nav-model";

/**
 * In-page table of contents for the design system.
 *
 * The page is one long document rather than a set of tabs, so every component
 * is on screen and in the server-rendered HTML. This nav is the way around it.
 * The active entry is tracked from the anchors themselves, so it cannot drift
 * from what is actually rendered.
 */
export function SectionNav() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const targets = NAV_ANCHOR_IDS.map((id) => document.getElementById(id)).filter(
      (element): element is HTMLElement => element !== null,
    );
    if (targets.length === 0) return;

    // Visible anchors are collected and the topmost one wins, so scrolling
    // upward highlights the section being entered rather than the one left.
    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const first = NAV_ANCHOR_IDS.find((id) => visible.has(id));
        if (first) setActive(first);
      },
      {
        // Ignore the band under the sticky header, and treat the top third of
        // the viewport as "current".
        rootMargin: "-15% 0px -60% 0px",
        threshold: 0,
      },
    );

    for (const target of targets) observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Design system contents"
      className="sticky max-h-[calc(100svh-var(--header-h)-3rem)] overflow-y-auto pr-2"
      style={{ top: "calc(var(--header-h) + 1rem)" }}
    >
      <ol className="flex flex-col gap-4 text-xs">
        {NAV_GROUPS.map((group) => (
          <li key={group.id}>
            <a
              href={`#${group.id}`}
              className={cn(
                "block px-2 py-1 text-[10px] font-medium tracking-[0.08em] uppercase",
                active === group.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {group.label}
            </a>
            <ol className="mt-0.5 flex flex-col">
              {group.items.map((item) => {
                const isActive = active === item.id;
                return (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        "block border-l px-2 py-1 transition-colors",
                        isActive
                          ? "border-seal bg-surface-sunken font-medium text-foreground"
                          : "border-hairline text-muted-foreground hover:border-hairline-strong hover:text-foreground",
                      )}
                    >
                      {item.label}
                    </a>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
    </nav>
  );
}
