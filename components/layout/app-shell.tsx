import type { ReactNode } from "react";
import { PetalField } from "@/components/decor";
import type { DemoPrincipal } from "@/types";
import { AppHeader } from "./app-header";
import { BackButton } from "./back-button";
import { AppSidebar } from "./app-sidebar";

/**
 * Sidebar + header + main content (scaffold.md §8).
 *
 * The shell is generic: it knows about navigation and theme, and nothing about
 * courses, enrollment, cost or evaluation. Pages supply their own PageHeader.
 */
export function AppShell({
  children,
  principal,
}: Readonly<{ children: ReactNode; principal: DemoPrincipal }>) {
  return (
    // data-print="app" is the hook the report print rule keys off: printing a
    // report hides the application and leaves the document. See globals.css.
    // h-svh + overflow-hidden, not min-h-svh: the shell owns the viewport so
    // that the sidebar and the content each scroll on their own. With a growing
    // document instead, the whole page scrolls and the sidebar leaves with it.
    <div data-print="app" className="flex h-svh overflow-hidden bg-background">
      {/* First tab stop on every page, and invisible until it is focused.
          Without it, reaching the content means tabbing through the whole
          sidebar again after every navigation. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-md"
      >
        Skip to content
      </a>
      <PetalField />
      <AppSidebar principal={principal} />
      {/* The content column is the scroll container. Putting the overflow here
          rather than on <main> keeps the header sticky at its top, so content
          still passes under its blurred bar. */}
      <div data-app-scroll className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <AppHeader principal={principal} />
        <main
          id="main-content"
          // Focusable only as a skip-link target, so focus actually lands in
          // the content rather than being left on a link to it.
          tabIndex={-1}
          className="flex-1 outline-none"
          style={{ padding: "var(--page-py) var(--page-px)" }}
        >
          {/* Above the page title rather than in the header: every page opens
              with a PageHeader as its first child, so the control sits on the
              same left edge as the h1 and reads as part of the page instead of
              crowding the breadcrumb slot. It renders nothing where the trail
              reports no parent, so no page has to opt in or out. */}
          <div className="mx-auto w-full max-w-[1400px]">
            <BackButton principal={principal} />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
