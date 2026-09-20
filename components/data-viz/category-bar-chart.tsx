"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
 * One value per named category: a grade distribution, students per evaluation
 * group, cost per group.
 *
 * Reach for this when the categories are unordered or ordinal and the
 * comparison between them is the point. If the x axis is time, use
 * `TrendAreaChart` instead — bars over time invite the reader to compare
 * neighbours when the shape of the whole run is what matters.
 */
export function CategoryBarChart({
  title,
  description,
  data,
  unit,
  format,
  valuePrefix,
  height = CHART_HEIGHT,
  /** One color per bar. Off by default: a single measure is one series. */
  colorPerCategory = false,
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
  colorPerCategory?: boolean;
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
        <BarChart data={[...data]} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
          {/* Horizontal rules only. Vertical ones add ink without helping the
              eye compare bar heights. */}
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
          <Tooltip
            content={<ChartTooltip unit={unit} formatValue={formatValue} />}
            cursor={{ fill: "var(--surface-sunken)" }}
          />
          <Bar dataKey="value" name={unit} radius={[4, 4, 0, 0]} fill={seriesColor(0)}>
            {colorPerCategory
              ? data.map((datum, index) => (
                  <Cell key={datum.label} fill={seriesColor(index)} />
                ))
              : null}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
