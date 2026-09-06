"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Debounced search box.
 *
 * The input is locally controlled and reports upward on a delay, so typing does
 * not push a URL entry or fire a request per keystroke. `value` is treated as
 * the external truth: when it changes from outside (a cleared filter, a back
 * navigation) the local draft resyncs.
 */
export function SearchInput({
  value,
  onValueChange,
  placeholder = "Search",
  debounceMs = 300,
  className,
  "aria-label": ariaLabel = "Search",
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
  "aria-label"?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [lastExternal, setLastExternal] = useState(value);

  // Resync during render rather than in an effect. This is the documented way
  // to adjust state when a prop changes: it avoids the extra render pass an
  // effect would cause, and the stale draft is never painted.
  if (lastExternal !== value) {
    setLastExternal(value);
    setDraft(value);
  }

  useEffect(() => {
    if (draft === value) return;
    const timer = setTimeout(() => onValueChange(draft), debounceMs);
    return () => clearTimeout(timer);
    // onValueChange is intentionally omitted: callers commonly pass an inline
    // arrow, and including it would restart the timer on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, value, debounceMs]);

  return (
    <div className={cn("relative", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="pr-7 pl-8 [&::-webkit-search-cancel-button]:hidden"
      />
      {draft ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Clear search"
          onClick={() => {
            setDraft("");
            onValueChange("");
          }}
          className="absolute top-1/2 right-1 -translate-y-1/2"
        >
          <X className="size-3" aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}
