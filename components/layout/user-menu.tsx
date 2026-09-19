"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, LogOut, UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/api/session";
import type { DemoPrincipal } from "@/types";

/**
 * Who you are, in the header (direction.md §3a).
 *
 * This used to read "Teacher" from two hardcoded strings and offer a disabled
 * Sign out. The application claimed an identity on every screen and nothing in
 * it respected the claim - which is the sort of placeholder that survives
 * because it looks finished.
 *
 * It now shows the principal the server resolved from the session cookie, and
 * both items work. Signing out and switching role are the same operation from
 * the user's side, so they are two items rather than a submenu of roles: the
 * list of accounts belongs to the sign-in screen, which is the one place that
 * explains what each role can see before you pick one.
 */
export function UserMenu({ principal }: Readonly<{ principal: DemoPrincipal }>) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  /**
   * Sign out, then go to the door.
   *
   * Switching role does *not* go through here. The sign-in screen is reachable
   * while signed in and marks the current account, so switching is a
   * navigation; dropping the cookie first would only mean arriving there as
   * nobody and losing the mark.
   */
  async function leave() {
    setLeaving(true);
    try {
      await signOut();
    } catch {
      // The cookie may already be gone, or the request may have failed. Either
      // way the destination is the sign-in screen, which is the one place that
      // can recover from both - so the failure is not worth a banner here.
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 gap-2 pr-2 pl-1.5"
          aria-label={`Account menu — signed in as ${principal.displayName}`}
        >
          <Avatar className="size-6">
            <AvatarFallback className="bg-secondary text-[10px] font-medium text-secondary-foreground">
              {initials(principal.displayName)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-40 truncate text-sm sm:inline">
            {principal.displayName}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-medium">{principal.displayName}</span>
          <span className="block text-xs text-muted-foreground">{principal.title}</span>
          {principal.context ? (
            <span className="block text-xs text-muted-foreground">
              {principal.context}
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="gap-2">
          <Link href="/login">
            <UserRound className="size-4" aria-hidden />
            Switch role
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2" disabled={leaving} onSelect={() => void leave()}>
          <LogOut className="size-4" aria-hidden />
          Sign out
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {/* The same sentence the sign-in screen carries. Somebody who arrives
            on a deep link never sees that screen, and this is the only other
            place the application can say what this identity is worth. */}
        <DropdownMenuLabel className="flex gap-2 py-1.5 font-normal text-xs text-muted-foreground">
          <Check className="mt-0.5 size-3 shrink-0" aria-hidden />
          <span>A demo identity, not a sign-in. Any role may be chosen.</span>
        </DropdownMenuLabel>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Two letters at most: one word gives one, several give the outer two. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}
