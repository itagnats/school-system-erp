"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useMounted } from "@/hooks";

/**
 * A binary light/dark switch.
 *
 * The default is still **system**: the provider keeps `defaultTheme="system"`
 * and `enableSystem`, so an untouched app follows the OS. What this control
 * dropped is the *option* to pick "follow the OS" explicitly - it was a
 * three-item menu, and a menu is a heavy way to express two states.
 *
 * The consequence is worth knowing: the first click writes an explicit
 * preference, and from then on the app no longer follows the OS. There is no
 * route back to "system" from the UI. That is the trade the two-state control
 * makes, and it is deliberate.
 *
 * ## Why the icon swaps in CSS rather than JavaScript
 *
 * Both icons are rendered and CSS picks one, because `next-themes` writes the
 * `.dark` class onto `<html>` in a pre-paint script - before React runs. So the
 * correct icon is right on the very first paint, with no flash of the wrong
 * one.
 *
 * Deriving it from `resolvedTheme` instead would mean reading browser-only
 * state, which is `undefined` on the server. That is a hydration mismatch if
 * rendered directly, and a visible icon swap if deferred with `useMounted`.
 * CSS avoids both.
 *
 * `useMounted` is still needed for the accessible name, which is an attribute
 * and cannot be swapped by a stylesheet. A screen reader gets the generic name
 * for one frame and the specific one after mount - invisible, and better than
 * announcing the wrong direction.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  const isDark = resolvedTheme === "dark";
  const target = isDark ? "light" : "dark";
  const label = mounted
    ? `Switch to ${target} mode`
    : "Switch between light and dark mode";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8"
      // A switch rather than a toggle button: it reports the state it is in,
      // not merely that it was pressed.
      role="switch"
      aria-checked={mounted ? isDark : undefined}
      aria-label={label}
      title={label}
      onClick={() => setTheme(target)}
    >
      <Sun aria-hidden className="size-4 dark:hidden" />
      <Moon aria-hidden className="hidden size-4 dark:block" />
    </Button>
  );
}
