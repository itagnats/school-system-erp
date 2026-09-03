"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

/**
 * Three-state theme control. A plain light/dark switch cannot express
 * "follow the OS", which is the default, so this is a menu rather than a
 * toggle. The trigger icon is rendered from `theme` (the stored preference),
 * not `resolvedTheme`, so the button reflects what the user actually chose.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const current = OPTIONS.find((o) => o.value === theme) ?? OPTIONS[2];
  const CurrentIcon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={`Theme: ${current.label}`}
        >
          {/* Suppress hydration mismatch: the stored theme is unknown on the
              server, so the first paint may pick a different icon. */}
          <CurrentIcon className="size-4" suppressHydrationWarning />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-32">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={cn("gap-2", theme === option.value && "font-medium")}
            >
              <Icon className="size-4 text-muted-foreground" aria-hidden />
              {option.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
