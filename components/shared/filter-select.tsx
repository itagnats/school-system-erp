"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Option } from "@/types";

/**
 * A single filter dropdown.
 *
 * "All" is a real option with the sentinel value `all`, not an empty string:
 * the URL helpers strip `all` when writing search params, so a filter left at
 * its default never appears in the address bar.
 */
export function FilterSelect<TValue extends string = string>({
  label,
  value,
  options,
  onValueChange,
  allLabel = "All",
  includeAll = true,
  className,
  placeholder,
}: {
  /** Accessible name. Rendered as a leading caption inside the trigger. */
  label: string;
  value: TValue | "all";
  options: Option<TValue>[];
  onValueChange: (value: TValue | "all") => void;
  allLabel?: string;
  includeAll?: boolean;
  className?: string;
  placeholder?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as TValue | "all")}>
      <SelectTrigger
        aria-label={label}
        className={cn("min-w-[8.5rem] gap-1.5", className)}
        style={{ height: "var(--field-h)" }}
      >
        <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
        <SelectValue placeholder={placeholder ?? allLabel} />
      </SelectTrigger>
      <SelectContent>
        {includeAll ? <SelectItem value="all">{allLabel}</SelectItem> : null}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
