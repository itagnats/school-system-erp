"use client";

import { LogOut, Settings, User } from "lucide-react";
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

/**
 * Profile area in the header.
 *
 * PRIME has no authentication (direction.md §33 rules out real SSO and identity
 * integration), so this is presentational: the shell needs a user affordance,
 * and the items are inert placeholders. If auth is ever added, the menu items
 * become the only thing that changes here.
 */
export function UserMenu() {
  const displayName = "Teacher";
  const role = "Teacher";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 gap-2 pr-2 pl-1.5"
          aria-label="Account menu"
        >
          <Avatar className="size-6">
            <AvatarFallback className="bg-secondary text-[10px] font-medium text-secondary-foreground">
              TE
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm sm:inline">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-medium">{displayName}</span>
          <span className="block text-xs text-muted-foreground">{role}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="gap-2">
          <User className="size-4" aria-hidden />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="gap-2">
          <Settings className="size-4" aria-hidden />
          Preferences
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="gap-2">
          <LogOut className="size-4" aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
