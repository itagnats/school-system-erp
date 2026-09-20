import { formatNumber, formatPercent, formatScore } from "@/lib/utils";

/**
 * The values charts are allowed to draw with.
 *
 * Recharts takes colors as strings on `fill` and `stroke`, so it cannot use a
 * Tailwind class. Passing `var(--chart-1)` keeps it on the token anyway: the
 * variable resolves in the browser, which means a chart follows the theme
 * switch for free and there is still no hex anywhere outside globals.css.
 *
 * Five steps and no more. A sixth series is a sign the chart is trying to
 * answer two questions at once.
 */
export const CHART_SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

/** Pick a series color, wrapping rather than running out. */
export function seriesColor(index: number): string {
  return CHART_SERIES[index % CHART_SERIES.length];
}

/** Structural chart furniture: the same hairline and muted ink as everything else. */
export const CHART_GRID = "var(--hairline)";
export const CHART_AXIS_TEXT = "var(--muted-foreground)";

/** Axis label defaults, so every chart in the application labels alike. */
export const CHART_AXIS_TICK = {
  fill: CHART_AXIS_TEXT,
  fontSize: 11,
} as const;

/** Default plot height. Tall enough to read, short enough to sit in a card. */
export const CHART_HEIGHT = 220;

/**
 * How a chart writes its values.
 *
 * A named format rather than a formatter function, for two reasons. The
 * practical one: every page that renders a chart is a server component, and a
 * function cannot be handed across the boundary to a client component. The
 * better one: it puts the decision about how a score or a cost is written in
 * one place instead of at each call site, so two charts cannot disagree about
 * how many decimals a score has.
 */
export type ChartValueFormat = "integer" | "decimal" | "score" | "percent";

/** Resolve a format name, plus an optional unit prefix, into a formatter. */
export function chartFormatter(
  format: ChartValueFormat = "integer",
  prefix = "",
): (value: number) => string {
  switch (format) {
    case "decimal":
      return (value) => prefix + formatNumber(value, 1);
    case "score":
      return (value) => prefix + formatScore(value);
    case "percent":
      return (value) => prefix + formatPercent(value);
    default:
      return (value) => prefix + formatNumber(value, 0);
  }
}
