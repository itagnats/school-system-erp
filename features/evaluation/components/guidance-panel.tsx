"use client";

import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * What an evaluator is being asked to weigh up.
 *
 * Held on the evaluation setup rather than hardcoded here, because how to judge
 * is a property of the evaluation and not of the widget. Collapsible and open
 * by default: it is worth reading once and worth getting out of the way after.
 */
export function GuidancePanel({ guidance }: Readonly<{ guidance: string }>) {
  const [open, setOpen] = useState(true);
  const paragraphs = guidance.split("\n\n").filter(Boolean);

  if (paragraphs.length === 0) return null;

  return (
    <section className="rounded-lg border border-hairline bg-card shadow-xs">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="guidance-body"
        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left"
      >
        <Info aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-sm font-medium text-foreground">
          Please read the guidance
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-fast ease-standard",
            open ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>

      {open ? (
        <div id="guidance-body" className="border-t border-hairline px-3.5 py-3">
          <div className="grid gap-2.5">
            {paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 32)} className="text-xs text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
