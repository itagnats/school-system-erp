import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { APP } from "@/config/app";
import { routes } from "@/lib/constants";
import { Brand } from "./brand";
import { SidebarNav } from "./sidebar-nav";

/**
 * Desktop sidebar. Fixed width from --sidebar-w, separated from the content by
 * a hairline rather than a shadow.
 */
export function AppSidebar() {
  return (
    <aside
      className="hidden shrink-0 flex-col bg-sidebar text-sidebar-foreground hairline-r lg:flex"
      style={{ width: "var(--sidebar-w)" }}
    >
      <div
        className="flex shrink-0 items-center px-4 hairline-b"
        style={{ height: "var(--header-h)" }}
      >
        <Link href={routes.dashboard()} className="rounded-sm">
          <Brand />
        </Link>
      </div>

      <ScrollArea className="flex-1">
        <SidebarNav />
      </ScrollArea>

      {/* Writes are validated and shaped but never stored, so every load starts
          from the same seed. Saying so here is what makes a vanished edit read
          as a scoping decision rather than a bug. See docs/decisions/why-bff.md. */}
      <div
        className="shrink-0 px-4 py-2.5 text-[10px] text-sidebar-muted-foreground hairline-t"
        data-print="hide"
      >
        <p>
          {APP.name} v{APP.version}
        </p>
        <p className="mt-0.5">Demo data resets on reload</p>
      </div>
    </aside>
  );
}
