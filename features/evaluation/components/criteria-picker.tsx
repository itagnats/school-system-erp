"use client";

import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { EVALUATION_CRITERIA } from "@/types";
import type { EvaluationCriterion } from "@/types";
import { EVALUATION_CRITERION_LABEL } from "../constants";

/**
 * One relation's question set, as a summary that opens an editor.
 *
 * The seven criteria were checkboxes rendered inline on every relation. With
 * three assessee cards and eight relations that put 56 checkboxes on one screen
 * before an administrator had decided anything, which is what made the setup
 * page unusable.
 *
 * Collapsed it reads "6 of 7", which is the number someone scanning the screen
 * actually wants. The list is one click away and stays fully keyboard
 * operable - a Radix popover, so focus moves into it and Escape returns.
 */
export function CriteriaPicker({
  criteria,
  assesseeLabel,
  assessorLabel,
  disabled,
  onChange,
}: Readonly<{
  criteria: EvaluationCriterion[];
  assesseeLabel: string;
  assessorLabel: string;
  disabled: boolean;
  onChange: (criteria: EvaluationCriterion[]) => void;
}>) {
  const total = EVALUATION_CRITERIA.length;
  const none = criteria.length === 0;

  function toggle(criterion: EvaluationCriterion, checked: boolean) {
    onChange(
      checked
        ? [...criteria, criterion]
        : criteria.filter((entry) => entry !== criterion),
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="xs"
          variant="outline"
          disabled={disabled}
          className={cn("gap-1 font-normal", none && "border-error/40 text-error")}
        >
          <span data-numeric>
            {criteria.length} of {total}
          </span>
          <ChevronRight aria-hidden className="size-3" />
          <span className="sr-only">
            criteria the {assessorLabel} is asked about the {assesseeLabel}. Edit
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72">
        <PopoverHeader>
          <PopoverTitle>Question set</PopoverTitle>
          <PopoverDescription>
            What the {assessorLabel} is asked about the {assesseeLabel}.
          </PopoverDescription>
        </PopoverHeader>

        <div className="mt-3 grid gap-1.5">
          {EVALUATION_CRITERIA.map((criterion) => {
            const id = `crit-${assesseeLabel}-${assessorLabel}-${criterion}`;
            return (
              <div key={criterion} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={criteria.includes(criterion)}
                  onCheckedChange={(checked) => toggle(criterion, checked === true)}
                />
                <Label htmlFor={id} className="text-sm font-normal">
                  {EVALUATION_CRITERION_LABEL[criterion]}
                </Label>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-hairline pt-2.5">
          <Button size="xs" variant="ghost" onClick={() => onChange([...EVALUATION_CRITERIA])}>
            Select all
          </Button>
          <Button size="xs" variant="ghost" onClick={() => onChange([])}>
            Clear
          </Button>
        </div>

        {none ? (
          // The server refuses to save this; saying so here beats a 422.
          <p className="mt-2 text-xs text-error" role="alert">
            Asked nothing, so this assessor cannot fill its share of the score.
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
