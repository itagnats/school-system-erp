import type { ReactNode } from "react";
import { PetalField } from "@/components/decor";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";

/**
 * Sidebar + header + main content (scaffold.md §8).
 *
 * The shell is generic: it knows about navigation and theme, and nothing about
 * courses, enrollment, cost or evaluation. Pages supply their own PageHeader.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    // data-print="app" is the hook the report print rule keys off: printing a
    // report hides the application and leaves the document. See globals.css.
    <div data-print="app" className="flex min-h-svh bg-background">
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
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main
          id="main-content"
          // Focusable only as a skip-link target, so focus actually lands in
          // the content rather than being left on a link to it.
          tabIndex={-1}
          className="flex-1 outline-none"
          style={{ padding: "var(--page-py) var(--page-px)" }}
        >
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
