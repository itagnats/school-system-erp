"use client";

import { useState } from "react";
import { Plus, RotateCcw } from "lucide-react";
import { Section } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EVALUATION_ROLES } from "@/types";
import type {
  AssesseeConfig,
  AssesseeSummary,
  EvaluationCriterion,
  EvaluationGroupSummary,
  EvaluationRole,
} from "@/types";
import { ASSESSEE_ROLE_LABEL } from "../constants";
import { AssesseeCard } from "./assessee-card";
import { GroupList } from "./group-list";

/**
 * Who is assessed, and by whom (direction.md §16, §16a).
 *
 * One card per assessee role. Which roles exist is fixed by the specification;
 * which of them are *assessed* is configuration, so cards are added and
 * removed. A course can run a student-only evaluation, or add upward feedback
 * on the teacher, without either affecting the other.
 */
export function AssesseesPanel({
  assessees,
  summaries,
  groups,
  ungroupedCount,
  disabled,
  onWeightChange,
  onRankingShareChange,
  onEnabledChange,
  onCriteriaChange,
  onAdd,
  onRemove,
  onUseDefaults,
}: Readonly<{
  assessees: AssesseeConfig[];
  summaries: AssesseeSummary[];
  groups: EvaluationGroupSummary[];
  ungroupedCount: number;
  disabled: boolean;
  onWeightChange: (
    assessee: EvaluationRole,
    assessor: EvaluationRole,
    percent: number,
  ) => void;
  onRankingShareChange: (
    assessee: EvaluationRole,
    assessor: EvaluationRole,
    percent: number,
  ) => void;
  onEnabledChange: (
    assessee: EvaluationRole,
    assessor: EvaluationRole,
    enabled: boolean,
  ) => void;
  onCriteriaChange: (
    assessee: EvaluationRole,
    assessor: EvaluationRole,
    criteria: EvaluationCriterion[],
  ) => void;
  onAdd: (role: EvaluationRole) => void;
  onRemove: (role: EvaluationRole) => void;
  onUseDefaults: () => void;
}>) {
  const taken = new Set(assessees.map((assessee) => assessee.role));
  const addable = EVALUATION_ROLES.filter((role) => !taken.has(role));

  /**
   * One card open at a time.
   *
   * An accordion rather than independent toggles: three cards expanded is the
   * dense screen this replaced, and the useful comparison is between the
   * collapsed summary lines, not between two open cards.
   *
   * A new card opens itself, because adding one and then having to click it is
   * a step with no purpose.
   */
  const [openRole, setOpenRole] = useState<EvaluationRole | null>(null);

  return (
    <>
      <Section
        title="Assessees and assessors"
        description="Each card is one role being assessed. Open one to pick who assesses it and what each is worth; every card's assessor weights total 100 on their own."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" disabled={disabled} onClick={onUseDefaults}>
              <RotateCcw aria-hidden className="size-4" />
              Use defaults
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={disabled || addable.length === 0}
                >
                  <Plus aria-hidden className="size-4" />
                  Add assessee
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {addable.map((role) => (
                  <DropdownMenuItem
                    key={role}
                    onSelect={() => {
                      onAdd(role);
                      setOpenRole(role);
                    }}
                  >
                    {ASSESSEE_ROLE_LABEL[role]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      >
        {assessees.length === 0 ? (
          <p className="rounded-lg border border-hairline bg-surface-sunken px-3.5 py-3 text-sm text-muted-foreground">
            Nobody is assessed yet. Add an assessee to start — a student cohort
            is the usual first one, and a teacher can be added beside it for
            upward feedback.
          </p>
        ) : (
          <ul className="grid gap-2">
            {assessees.map((assessee) => (
              <AssesseeCard
                key={assessee.role}
                config={assessee}
                summary={summaries.find((s) => s.role === assessee.role)}
                expanded={openRole === assessee.role}
                disabled={disabled}
                onToggleExpanded={() =>
                  setOpenRole(openRole === assessee.role ? null : assessee.role)
                }
                onWeightChange={(assessor, percent) =>
                  onWeightChange(assessee.role, assessor, percent)
                }
                onRankingShareChange={(assessor, percent) =>
                  onRankingShareChange(assessee.role, assessor, percent)
                }
                onEnabledChange={(assessor, enabled) =>
                  onEnabledChange(assessee.role, assessor, enabled)
                }
                onCriteriaChange={(assessor, criteria) =>
                  onCriteriaChange(assessee.role, assessor, criteria)
                }
                onRemove={() => onRemove(assessee.role)}
              />
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Evaluation groups"
        description="Peer assessment happens inside a group, and an inspector is drawn from the next one along."
      >
        <GroupList groups={groups} ungroupedCount={ungroupedCount} />
      </Section>
    </>
  );
}
