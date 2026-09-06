import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Trend = "up" | "down" | "flat";

/**
 * The pastel ground a card can take. A tone is grouping, not meaning: it makes
 * a row of metrics read as a set, and the label always says what the number is.
 * Anything that has to communicate a state uses StatusBadge instead.
 */
export type StatTone = "plain" | "pink" | "lavender" | "blue" | "green";

const TREND_ICON: Record<Trend, LucideIcon> = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus,
};

const TONE_SURFACE: Record<StatTone, string> = {
  plain: "bg-card",
  pink: "bg-tone-pink",
  lavender: "bg-tone-lavender",
  blue: "bg-tone-blue",
  green: "bg-tone-green",
};

/**
 * The icon chip sits on a lifted step of the same tone.
 *
 * `bg-card/70` rather than `bg-white/70`: white has no dark value, so on the
 * dusk tone grounds the chip composited to a near-white pill carrying pale
 * pink lettering at about 1.5:1. Following --card keeps the chip a lift of
 * whatever surface it is on in both themes.
 */
const TONE_CHIP: Record<StatTone, string> = {
  plain: "bg-muted text-muted-foreground",
  pink: "bg-card/70 text-tone-pink-accent",
  lavender: "bg-card/70 text-tone-lavender-accent",
  blue: "bg-card/70 text-tone-blue-accent",
  green: "bg-card/70 text-tone-green-accent",
};

/**
 * Single metric tile for the dashboard and detail summaries.
 *
 * Direction of a trend is not the same as whether it is good news: enrollment
 * up is positive, drop-outs up is not. `trendIsGood` is therefore explicit, and
 * an arrow always accompanies the color so the meaning survives without it.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  trendValue,
  trendIsGood = true,
  tone = "plain",
  className,
}: {
  label: string;
  value: ReactNode;
  /** Secondary line, e.g. "of 240 enrolled". */
  hint?: ReactNode;
  icon?: LucideIcon;
  trend?: Trend;
  trendValue?: string;
  trendIsGood?: boolean;
  /** Pastel ground. Grouping only — never a status. */
  tone?: StatTone;
  className?: string;
}) {
  const TrendIcon = trend ? TREND_ICON[trend] : null;
  const trendClass =
    trend === "flat"
      ? "text-muted-foreground"
      : trendIsGood
        ? "text-success"
        : "text-error";

  return (
    <div
      className={cn(
        "rounded-lg border border-hairline p-4 shadow-xs",
        TONE_SURFACE[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {Icon ? (
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-md",
              TONE_CHIP[tone],
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
        ) : null}
      </div>

      <div
        data-numeric
        className="mt-3 text-2xl leading-none font-semibold tracking-tight text-foreground"
      >
        {value}
      </div>

      {hint || TrendIcon ? (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs">
          {TrendIcon && trendValue ? (
            <span className={cn("inline-flex items-center gap-0.5 font-medium", trendClass)}>
              <TrendIcon className="size-3.5" aria-hidden />
              {trendValue}
            </span>
          ) : null}
          {hint ? <span className="text-muted-foreground">{hint}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
