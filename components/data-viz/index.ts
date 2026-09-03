/**
 * components/data-viz — the only place recharts is imported.
 *
 * A feature module never names the charting library: it hands one of these
 * three components an array of `{ label, value }` and gets a chart that is
 * already on the tokens, already carries a caption, already has an empty state
 * and already exposes its numbers to assistive technology.
 *
 * That containment is the point. Recharts is the one dependency here that
 * cannot consume a Tailwind class, so it is wrapped once rather than being let
 * loose across seven feature folders.
 */
export { ChartFrame, type ChartDatum } from "./chart-frame";
export { ChartTooltip, type ChartTooltipItem } from "./chart-tooltip";
export {
  CHART_AXIS_TEXT,
  CHART_AXIS_TICK,
  CHART_GRID,
  CHART_HEIGHT,
  CHART_SERIES,
  chartFormatter,
  seriesColor,
  type ChartValueFormat,
} from "./chart-tokens";
export { CategoryBarChart } from "./category-bar-chart";
export { ShareDonutChart } from "./share-donut-chart";
export { TrendAreaChart } from "./trend-area-chart";
