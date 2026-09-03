import { AppBreadcrumbs } from "./app-breadcrumbs";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

/**
 * Application header. Sticky, hairline-separated, and deliberately thin: the
 * page title belongs to PageHeader inside the content area, so this bar carries
 * only breadcrumbs and global controls.
 */
export function AppHeader() {
  return (
    <header
      className="sticky top-0 z-30 flex shrink-0 items-center gap-2 bg-background/85 px-4 backdrop-blur hairline-b"
      style={{ height: "var(--header-h)" }}
      data-print="hide"
    >
      <MobileNav />
      <div className="min-w-0 flex-1">
        <AppBreadcrumbs />
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
