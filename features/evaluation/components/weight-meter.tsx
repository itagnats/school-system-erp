import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A weight total, with its shortfall named.
 *
 * The bar is not decoration. A blend that does not reach 100% scales every
 * score in the course, and unlike most misconfigurations nothing downstream
 * would notice - the grades would simply all be wrong together. So the total is
 * shown as a quantity and the gap is stated in words beside it.
 *
 * Feature-local rather than shared: it looks like a generic progress bar but it
 * encodes one domain rule, that enabled role weights total 100. Putting it in
 * `components/shared` would mean teaching a generic component the word
 * "weight", which is the boundary the layering rule draws.
 */
export function WeightMeter({
  totalPercent,
  remainingPercent,
  balanced,
  label = "Total weight",
  className,
}: Readonly<{
  totalPercent: number;
  remainingPercent: number;
  balanced: boolean;
  label?: string;
  className?: string;
}>) {
  const over = remainingPercent < 0;
  // Two values, because the bar shows the fill and the caption shows the truth:
  // an over-allocated blend fills the track completely and says 125%.
  const fill = Math.min(100, Math.max(0, totalPercent));
  const barTone = meterTone(balanced, over);

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        {balanced ? null : (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              over ? "text-error" : "text-warning-soft-foreground",
            )}
          >
            <AlertCircle aria-hidden className="size-3.5" />
            {over
              ? `Over by ${formatShare(-remainingPercent)}`
              : `${formatShare(remainingPercent)} remaining`}
          </span>
        )}
      </div>

      <div className="mt-1.5 flex items-center gap-2">
        <div
          // A meter rather than a progressbar: this is a measurement against a
          // known range with a correct value, not a task advancing to done.
          role="meter"
          aria-valuenow={totalPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${formatShare(totalPercent)} of 100% allocated`}
          aria-label={label}
          className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-sunken"
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-normal ease-standard",
              barTone,
            )}
            style={{ width: `${fill}%` }}
          />
        </div>
        <span
          className={cn(
            "shrink-0 text-xs tabular-nums",
            balanced ? "text-muted-foreground" : "font-medium text-foreground",
          )}
          data-numeric
        >
          {formatShare(totalPercent)}
        </span>
      </div>
    </div>
  );
}

/** Balanced, over-allocated, or short. Literal classes, so Tailwind sees them. */
function meterTone(balanced: boolean, over: boolean): string {
  if (balanced) return "bg-success";
  return over ? "bg-error" : "bg-warning";
}

/** Trailing zeros dropped: 71.5% reads better than 71.50%, and 100% than 100.00%. */
function formatShare(value: number): string {
  return `${Number(value.toFixed(2))}%`;
}
