"use client";

/**
 * The one tooltip every PRIME chart uses.
 *
 * Recharts styles its default tooltip with inline CSS, which cannot read a
 * token and does not follow the theme switch. Supplying our own content keeps
 * the popover on the same surface, hairline and shadow as every other floating
 * surface in the application.
 */
export interface ChartTooltipItem {
  name?: string | number;
  value?: string | number;
  color?: string;
  payload?: { label?: string };
}

export function ChartTooltip({
  active,
  payload,
  label,
  unit,
  formatValue,
}: {
  /* These five are injected by recharts when it clones the element passed to
     `content`, which is why they are all optional. */
  active?: boolean;
  payload?: ChartTooltipItem[];
  label?: string | number;
  unit?: string;
  formatValue?: (value: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const format = formatValue ?? ((value: number) => String(value));

  return (
    <div className="rounded-md border border-hairline bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md">
      {label !== undefined ? (
        <p className="font-medium text-foreground">{label}</p>
      ) : null}
      <ul className="mt-0.5 flex flex-col gap-0.5">
        {payload.map((item, index) => {
          const numeric = typeof item.value === "number" ? item.value : Number(item.value);

          return (
            <li key={index} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ background: item.color }}
              />
              <span className="text-muted-foreground">
                {item.payload?.label ?? item.name ?? unit}
              </span>
              <span className="ml-auto pl-2 font-medium text-foreground" data-numeric>
                {Number.isFinite(numeric) ? format(numeric) : "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
