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
    <div className="flex min-h-svh bg-background">
      <PetalField />
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main
          className="flex-1"
          style={{ padding: "var(--page-py) var(--page-px)" }}
        >
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
