"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Light and dark mode. The class strategy is used because the token file
 * defines dark values under `.dark`, and `disableTransitionOnChange` stops
 * every hairline and surface from animating during the swap.
 *
 * ## The "script tag while rendering React component" warning
 *
 * Next's development react-dom logs this once per session, pointing here:
 *
 *   > Encountered a script tag while rendering React component. Scripts inside
 *   > React components are never executed when rendering on the client.
 *
 * **It is development-only noise, not a defect. Do not "fix" it by removing
 * this provider or hand-rolling the theme.** Investigated 2026-09-07:
 *
 * - The message exists only in Next's `*.development.js` react-dom bundles and
 *   in none of the `*.production.js` ones, so it cannot reach a user.
 * - It is gated behind `didWarnScriptTags`, so it fires once, not in a loop.
 * - `next-themes` renders an inline pre-paint `<script>` that reads the stored
 *   preference and writes the class onto `<html>` before the first paint. That
 *   script was verified present in the served HTML in both dev and a production
 *   build, and `script-src` carries `'unsafe-inline'`, so it runs. Losing it
 *   would bring back the flash of the wrong theme on every load.
 * - `<html>` therefore has no `dark` class in the server HTML - the script adds
 *   it during parse, which is exactly what `suppressHydrationWarning` on
 *   `<html>` in `app/layout.tsx` is for.
 *
 * There is no clean way to silence it. React exempts only script tags with a
 * non-executable `type` (`application/json` and friends), which this one cannot
 * have; `next-themes` 0.4.6 is the latest release and exports only
 * `ThemeProvider` and `useTheme`, with no separate script component to render
 * from a server layout instead.
 *
 * The one real consequence is confined to development: on the client-create
 * path that triggers the warning - a Fast Refresh remount, not hydration -
 * React substitutes an empty `<div>` for the script. Harmless, and production
 * does not remount this way.
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
