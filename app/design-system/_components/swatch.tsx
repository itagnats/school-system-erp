"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A colour chip that reads its own value back out of the cascade.
 *
 * The resolved value is read with getComputedStyle rather than written into
 * this file, so the documentation cannot drift away from globals.css and it
 * updates by itself when the theme is switched.
 */
export function Swatch({
  token,
  label,
  className,
}: {
  /** CSS custom property name, without the leading dashes. */
  token: string;
  label?: string;
  className?: string;
}) {
  const [value, setValue] = useState<string>("");

  useEffect(() => {
    const read = () => {
      const resolved = getComputedStyle(document.documentElement)
        .getPropertyValue(`--${token}`)
        .trim();
      setValue(resolved);
    };
    read();

    // Re-read when the theme class flips on <html>.
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [token]);

  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span
        aria-hidden
        className="size-8 shrink-0 rounded-sm border border-hairline"
        style={{ background: `var(--${token})` }}
      />
      <span className="flex min-w-0 flex-col">
        <code className="truncate text-xs text-foreground">--{token}</code>
        <span className="truncate text-[10px] text-muted-foreground" data-numeric>
          {value || " "}
        </span>
        {label ? (
          <span className="truncate text-[10px] text-muted-foreground">{label}</span>
        ) : null}
      </span>
    </div>
  );
}
