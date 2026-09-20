"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { ConfirmDialog, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { EVALUATION_WINDOW_TRANSITIONS } from "@/lib/calculations";
import { formatDate } from "@/lib/utils";
import type {
  EvaluationRole,
  EvaluationWindowStatus,
  FormReadiness,
} from "@/types";
import {
  ASSESSEE_ROLE_LABEL,
  WINDOW_STATUS_DESCRIPTION,
  WINDOW_STATUS_LABEL,
  WINDOW_STATUS_TONE,
  windowAction,
} from "../constants";
import { ReadinessMark } from "./readiness-mark";

/**
 * Is this evaluation ready, and what happens next.
 *
 * Manage Evaluation exists to answer "which cohorts are not ready" (§15a), and
 * opening a row used to drop that question entirely - the list showed a
 * readiness mark per form kind and the detail screen showed neither. The same
 * two marks are here, derived from the same `formReadiness`, so the two screens
 * cannot disagree.
 *
 * Sticky under the app header, because every answer on it is a reason to stop
 * scrolling: an unbalanced card, an ungrouped cohort, unsaved work.
 *
 * **The window is an act, not a form field.** Status rides in the same payload
 * as the rest of the settings, but opening an evaluation is not the same kind
 * of decision as renaming it, so it is a button with its own confirmation
 * rather than a select that waits for Save. The transitions come from
 * `EVALUATION_WINDOW_TRANSITIONS`, which the server validates against as well.
 */
export function SetupSummaryBar({
  status,
  opensOn,
  closesOn,
  reportDate,
  threeSixtyForm,
  rankingForm,
  unbalanced,
  ungroupedCount,
  groupCount,
  dirty,
  saving,
  statusPending,
  onSave,
  onStatusChange,
  onShowAssessee,
}: Readonly<{
  status: EvaluationWindowStatus;
  opensOn: string;
  closesOn: string;
  reportDate: string;
  threeSixtyForm: FormReadiness;
  rankingForm: FormReadiness;
  /** Assessees whose blend does not total 100. Save is refused while any do. */
  unbalanced: EvaluationRole[];
  ungroupedCount: number;
  groupCount: number;
  dirty: boolean;
  saving: boolean;
  statusPending: boolean;
  onSave: () => void;
  onStatusChange: (status: EvaluationWindowStatus) => void;
  /** Open the card for a role, so an error can take someone to its cause. */
  onShowAssessee: (role: EvaluationRole) => void;
}>) {
  const [pending, setPending] = useState<EvaluationWindowStatus | null>(null);
  const moves = EVALUATION_WINDOW_TRANSITIONS[status];
  const confirming = pending ? windowAction(status, pending).confirm : undefined;

  function requestMove(to: EvaluationWindowStatus) {
    const action = windowAction(status, to);
    // A move that stops submissions or publishes a report asks first; opening
    // one does not, because it is the move someone came here to make.
    if (action.confirm) setPending(to);
    else onStatusChange(to);
  }

  return (
    <div
      // Sticky inside the shell's scrolling column, so it clears the app header
      // rather than sliding under it.
      className="sticky z-20 rounded-lg border border-hairline bg-card/95 px-3.5 py-2.5 shadow-xs backdrop-blur"
      style={{ top: "var(--header-h)" }}
      data-print="hide"
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <StatusBadge tone={WINDOW_STATUS_TONE[status]} label={WINDOW_STATUS_LABEL[status]} />
          <span className="truncate text-xs text-muted-foreground">
            {formatDate(opensOn)} – {formatDate(closesOn)} · reports{" "}
            {formatDate(reportDate)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <FormState label="360 form" readiness={threeSixtyForm} />
          <FormState label="Ordering" readiness={rankingForm} />
        </div>

        <div className="ms-auto flex items-center gap-2">
          {moves.map((to) => (
            <Button
              key={to}
              size="sm"
              variant={to === "open" && status === "draft" ? "default" : "outline"}
              // A window move sends the setup as it is stored. Unsaved edits
              // would otherwise be silently included in an act that looks like
              // it only changes the status.
              disabled={dirty || statusPending}
              loading={statusPending && pending === to}
              onClick={() => requestMove(to)}
            >
              {windowAction(status, to).label}
            </Button>
          ))}
          <Button
            size="sm"
            onClick={onSave}
            disabled={!dirty || unbalanced.length > 0}
            loading={saving}
          >
            Save changes
          </Button>
        </div>
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground">
        {WINDOW_STATUS_DESCRIPTION[status]}
        {dirty ? " Unsaved changes — save before moving the window." : null}
      </p>

      {unbalanced.length > 0 ? (
        <Warning tone="error">
          <span>
            {unbalanced.length === 1 ? "One assessee's" : `${unbalanced.length} assessees'`}{" "}
            assessor weights do not total 100%, so the score they produce is scaled
            by a mistake nothing downstream would catch. Each card balances on its
            own:{" "}
          </span>
          {/* The error names the card and opens it. Collapsed cards are the
              reason a blend error used to be a dead end - the fix was always
              one accordion away and the message never said which. */}
          {unbalanced.map((role, index) => (
            <span key={role}>
              {index > 0 ? ", " : null}
              <button
                type="button"
                onClick={() => onShowAssessee(role)}
                className="rounded-sm font-medium underline underline-offset-2"
              >
                {ASSESSEE_ROLE_LABEL[role]}
              </button>
            </span>
          ))}
        </Warning>
      ) : null}

      {groupCount === 0 ? (
        <Warning tone="warning">
          This cohort has no evaluation groups, so peer assessment has nobody to
          assess and nothing can be submitted.
        </Warning>
      ) : null}

      {ungroupedCount > 0 ? (
        <Warning tone="warning">
          <span data-numeric>{ungroupedCount}</span> enrolled student
          {ungroupedCount === 1 ? " is" : "s are"} not in a group. They will not be
          assessed by peers and will not appear in a group ranking, so a head count
          overstates coverage.
        </Warning>
      ) : null}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title={confirming?.title ?? ""}
        description={confirming?.description}
        confirmLabel={pending ? windowAction(status, pending).label : "Confirm"}
        tone={pending === "published" ? "destructive" : "default"}
        isPending={statusPending}
        onConfirm={() => {
          if (pending) onStatusChange(pending);
        }}
      />
    </div>
  );
}

function FormState({
  label,
  readiness,
}: Readonly<{ label: string; readiness: FormReadiness }>) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <ReadinessMark readiness={readiness} />
      {label}
    </span>
  );
}

/**
 * A condition that produces a wrong result rather than an error (§15a).
 *
 * Tone is a visual weight; every one of these states its condition in words, so
 * nothing here is carried by color alone.
 */
function Warning({
  tone,
  children,
}: Readonly<{ tone: "error" | "warning"; children: React.ReactNode }>) {
  return (
    <p
      className={
        tone === "error"
          ? "mt-2 flex items-start gap-1.5 text-xs text-error"
          : "mt-2 flex items-start gap-1.5 text-xs text-warning-soft-foreground"
      }
      role={tone === "error" ? "alert" : undefined}
    >
      <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
