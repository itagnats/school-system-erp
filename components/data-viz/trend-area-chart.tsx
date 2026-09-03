"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartFrame, type ChartDatum } from "./chart-frame";
import {
  CHART_AXIS_TICK,
  CHART_GRID,
  CHART_HEIGHT,
  chartFormatter,
  seriesColor,
  type ChartValueFormat,
} from "./chart-tokens";
import { ChartTooltip } from "./chart-tooltip";

/**
 * One measure across an ordered run: a cohort average by semester, cost per
 * student over time.
 *
 * The fill is a soft pink wash rather than a solid, because the area here is
 * decoration for the line and not a second quantity. The line carries the
 * value; the wash only makes its direction easier to follow at a glance.
 *
 * Note the y axis does not start at zero by default — `domain` is left to
 * recharts so a narrow band of scores stays readable. That is the right call
 * for a trend and the wrong one for a magnitude comparison, which is why
 * `CategoryBarChart` exists.
 */
export function TrendAreaChart({
  title,
  description,
  data,
  unit,
  format,
  valuePrefix,
  height = CHART_HEIGHT,
  className,
}: {
  title: string;
  description?: string;
  data: readonly ChartDatum[];
  unit: string;
  format?: ChartValueFormat;
  /** Unit marker written before the value, e.g. a currency symbol. */
  valuePrefix?: string;
  height?: number;
  className?: string;
}) {
  const formatValue = chartFormatter(format, valuePrefix);

  return (
    <ChartFrame
      title={title}
      description={description}
      data={data}
      unit={unit}
      formatValue={formatValue}
      height={height}
      className={className}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={[...data]} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="prime-trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={seriesColor(0)} stopOpacity={0.22} />
              <stop offset="100%" stopColor={seriesColor(0)} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART_GRID} vertical={false} />
          <XAxis
            dataKey="label"
            tick={CHART_AXIS_TICK}
            stroke={CHART_GRID}
            tickLine={false}
          />
          <YAxis
            tick={CHART_AXIS_TICK}
            stroke={CHART_GRID}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip content={<ChartTooltip unit={unit} formatValue={formatValue} />} />
          <Area
            type="monotone"
            dataKey="value"
            name={unit}
            stroke={seriesColor(0)}
            strokeWidth={2}
            fill="url(#prime-trend-fill)"
            dot={{ r: 2.5, fill: seriesColor(0), strokeWidth: 0 }}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
