"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartFrame, type ChartDatum } from "./chart-frame";
import {
  CHART_HEIGHT,
  chartFormatter,
  seriesColor,
  type ChartValueFormat,
} from "./chart-tokens";
import { ChartTooltip } from "./chart-tooltip";

/**
 * Parts of one whole: direct against shared cost, cost split by group.
 *
 * Use it only when the slices genuinely sum to something meaningful and there
 * are few of them. Beyond about five, slice angles stop being comparable and a
 * `CategoryBarChart` reads better.
 *
 * The legend is a real list beside the plot rather than a recharts `Legend`,
 * because it doubles as the readable version of the figures: each row states
 * its own value, so the numbers do not live only inside a hover tooltip.
 */
export function ShareDonutChart({
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
  const total = data.reduce((sum, datum) => sum + datum.value, 0);
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
      <div className="flex h-full items-center gap-4">
        <div className="h-full min-w-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[...data]}
                dataKey="value"
                nameKey="label"
                innerRadius="58%"
                outerRadius="86%"
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((datum, index) => (
                  <Cell key={datum.label} fill={seriesColor(index)} />
                ))}
              </Pie>
              <Tooltip
                content={<ChartTooltip unit={unit} formatValue={formatValue} />}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <ul className="flex w-40 shrink-0 flex-col gap-1.5 text-xs">
          {data.map((datum, index) => (
            <li key={datum.label} className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ background: seriesColor(index) }}
              />
              <span className="min-w-0 truncate text-muted-foreground">
                {datum.label}
              </span>
              <span className="ml-auto shrink-0 font-medium text-foreground" data-numeric>
                {total > 0 ? `${Math.round((datum.value / total) * 100)}%` : "—"}
              </span>
            </li>
          ))}
          <li className="mt-0.5 flex items-center gap-2 pt-1.5 hairline-t">
            <span className="text-muted-foreground">Total</span>
            <span className="ml-auto font-medium text-foreground" data-numeric>
              {formatValue(total)}
            </span>
          </li>
        </ul>
      </div>
    </ChartFrame>
  );
}
