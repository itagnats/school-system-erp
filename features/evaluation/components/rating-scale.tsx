"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { EvaluationCriterion, RatingValue } from "@/types";
import { EVALUATION_CRITERION_LABEL, RATING_LABEL, RATING_VALUES } from "../constants";

/**
 * One criterion, rated on a sliding scale.
 *
 * A slider rather than a row of buttons, at the user's request. It buys two
 * things the buttons did not have: the scale reads as a continuum, so 2 and 4
 * are visibly a distance apart rather than two equal chips, and a rating can be
 * **undone**.
 *
 * That second point is why the range starts at 0 rather than 1. A slider always
 * has a value, so an untouched criterion would otherwise sit at 1 and look
 * rated - which is worse than the button row, where nothing was selected. Zero
 * is a real "not rated" position: it renders unfilled, it is announced as such,
 * and dragging back to it clears the answer.
 *
 * The number alone is not the rating. A 4 means "Very good" and the word is
 * shown beside it and passed through `aria-valuetext`, because Radix announces
 * only `aria-valuenow` and a scale without its labels has lost half its
 * meaning.
 */
export function RatingScale({
  criterion,
  value,
  scaleMax,
  disabled,
  onChange,
}: Readonly<{
  criterion: EvaluationCriterion;
  value?: RatingValue;
  scaleMax: number;
  disabled: boolean;
  onChange: (rating: RatingValue | undefined) => void;
}>) {
  const label = EVALUATION_CRITERION_LABEL[criterion];
  const rated = value !== undefined;
  const valueText = rated ? `${value}, ${RATING_LABEL[value]}` : "Not rated";

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <Label htmlFor={`rate-${criterion}`} className="text-sm font-medium">
          {label}
        </Label>
        <p
          className={cn(
            "text-xs",
            rated ? "font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          {rated ? (
            <>
              <span data-numeric>{value}</span> — {RATING_LABEL[value]}
            </>
          ) : (
            "Not rated"
          )}
        </p>
      </div>

      <Slider
        id={`rate-${criterion}`}
        className="mt-2.5"
        min={0}
        max={scaleMax}
        step={1}
        value={[value ?? 0]}
        disabled={disabled}
        aria-label={`${label}, 1 to ${scaleMax}`}
        thumbProps={{ "aria-valuetext": valueText }}
        onValueChange={([next]) =>
          onChange(next === 0 ? undefined : (next as RatingValue))
        }
      />

      {/* The ends of the scale, so a reader knows which way is better without
          having to drag it to find out. */}
      <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
        <span>
          <span data-numeric>1</span> {RATING_LABEL[RATING_VALUES[0]]}
        </span>
        <span>
          <span data-numeric>{scaleMax}</span>{" "}
          {RATING_LABEL[RATING_VALUES[RATING_VALUES.length - 1]]}
        </span>
      </div>
    </div>
  );
}
