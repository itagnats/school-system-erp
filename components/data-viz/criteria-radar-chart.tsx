"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
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
 * A profile across several named measures on one shared scale.
 *
 * Reach for it when the **shape** is the finding: a subject strong on delivery
 * and weak on communication reads as a lopsided polygon at a glance, which a
 * row of bars does not give you. Every axis must share one scale and one unit,
 * or the shape means nothing.
 *
 * Reach for `CategoryBarChart` instead when the reader needs to compare exact
 * values, or to rank the measures against each other - a radius is genuinely
 * harder to read a number off than a bar length, and area exaggerates.
 *
 * Between about four and eight axes. Three is a triangle that says less than
 * three bars would, and past eight the labels collide and the polygon turns
 * into a circle.
 */
export function CriteriaRadarChart({
  title,
  description,
  data,
  unit,
  /** Top of the shared scale. Fixed, not inferred, so two charts compare. */
  max,
  format,
  height = CHART_HEIGHT,
  className,
}: {
  title: string;
  description?: string;
  data: readonly ChartDatum[];
  unit: string;
  max: number;
  format?: ChartValueFormat;
  height?: number;
  className?: string;
}) {
  const formatValue = chartFormatter(format);

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
        <RadarChart data={[...data]} outerRadius="72%">
          <PolarGrid stroke={CHART_GRID} />
          <PolarAngleAxis dataKey="label" tick={CHART_AXIS_TICK} />
          {/* The radius axis is fixed to the scale rather than to the data.
              Auto-scaling would make a weak profile look like a strong one,
              because the polygon would fill the frame either way. */}
          <PolarRadiusAxis
            domain={[0, max]}
            tick={CHART_AXIS_TICK}
            stroke={CHART_GRID}
            axisLine={false}
            tickCount={max + 1}
          />
          <Tooltip content={<ChartTooltip unit={unit} formatValue={formatValue} />} />
          <Radar
            dataKey="value"
            name={unit}
            stroke={seriesColor(0)}
            fill={seriesColor(0)}
            fillOpacity={0.18}
          />
        </RadarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
