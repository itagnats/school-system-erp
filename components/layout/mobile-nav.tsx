"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { routes } from "@/lib/constants";
import { Brand } from "./brand";
import { SidebarNav } from "./sidebar-nav";

/**
 * Navigation below the lg breakpoint. The drawer is a real navigation surface,
 * not a shrunken sidebar: it closes on selection so the user is never left
 * looking at the menu after choosing a destination.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);

  // Close on route change, which covers back/forward navigation as well as the
  // onNavigate click. Adjusted during render rather than in an effect, so the
  // drawer is never painted open over the new page.
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[17rem] bg-sidebar p-0 text-sidebar-foreground">
        <SheetHeader className="px-4 hairline-b" style={{ height: "var(--header-h)" }}>
          <SheetTitle asChild>
            <Link href={routes.dashboard()} className="flex items-center">
              <Brand />
            </Link>
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100%-var(--header-h))]">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
