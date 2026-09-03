import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ChartDatum {
  label: string;
  value: number;
}

/**
 * The wrapper every chart in PRIME renders inside.
 *
 * It carries the three things a bare SVG cannot:
 *
 *   1. A caption, so the chart says what it measures without the reader having
 *      to infer it from the axes.
 *   2. A data table for assistive technology. The plot itself is marked
 *      `aria-hidden`, and this table is the accessible representation of the
 *      same numbers. That is a deliberate trade: a screen reader crawling an
 *      SVG produces a stream of unlabelled path elements, whereas a table is
 *      navigable by row and column and states its own units. It is visually
 *      hidden, not display:none, so it stays in the accessibility tree.
 *   3. An empty state. A chart with no data must not render as an empty box
 *      with axes, which reads as a loading failure.
 *
 * Because the plot is hidden from assistive technology it must contain nothing
 * focusable. Do not pass recharts `accessibilityLayer` to a chart inside this
 * frame: it adds tabbable elements, and a focusable node inside an aria-hidden
 * subtree is a genuine violation rather than a lint nit.
 */
export function ChartFrame({
  title,
  description,
  data,
  unit,
  formatValue,
  height,
  emptyLabel = "No data for this selection.",
  className,
  children,
}: {
  title: string;
  description?: ReactNode;
  /** Drives both the accessible table and the empty state. */
  data: readonly ChartDatum[];
  /** Column heading for the value column, e.g. "Students" or "Cost". */
  unit: string;
  formatValue?: (value: number) => string;
  height: number;
  emptyLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  const format = formatValue ?? ((value: number) => String(value));

  return (
    <figure className={cn("flex flex-col gap-2", className)}>
      <figcaption>
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
        {description ? (
          <p className="mt-0.5 max-w-prose text-xs text-muted-foreground">
            {description}
          </p>
        ) : null}
      </figcaption>

      {data.length === 0 ? (
        <div
          className="flex items-center justify-center rounded-md border border-dashed border-hairline-strong bg-surface-sunken text-xs text-muted-foreground"
          style={{ height }}
        >
          {emptyLabel}
        </div>
      ) : (
        <>
          <div aria-hidden="true" style={{ height }}>
            {children}
          </div>

          <table className="sr-only">
            <caption>{title}</caption>
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">{unit}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((datum) => (
                <tr key={datum.label}>
                  <th scope="row">{datum.label}</th>
                  <td>{format(datum.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </figure>
  );
}
