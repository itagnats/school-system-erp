"use client";

import { TriangleAlert, Users } from "lucide-react";
import type { EvaluationGroupSummary } from "@/types";

/**
 * Group membership for one course-semester (direction.md §15, §17).
 *
 * Lifted out of the relations panel when that panel was replaced by assessee
 * cards. Groups are membership rather than configuration, so they read as their
 * own list rather than as a tab beside the blend.
 */
export function GroupList({
  groups,
  ungroupedCount,
}: Readonly<{ groups: EvaluationGroupSummary[]; ungroupedCount: number }>) {
  if (groups.length === 0) {
    return (
      <p className="mt-3 rounded-lg border border-hairline bg-surface-sunken px-3.5 py-3 text-sm text-muted-foreground">
        This cohort has not been grouped yet. Peer evaluation needs groups, so
        nothing can be submitted until it is.
      </p>
    );
  }

  return (
    <>
      <ul className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <li key={group.id} className="rounded-lg border border-hairline bg-card px-3.5 py-3">
            <p className="text-sm font-medium text-foreground">{group.name}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users aria-hidden className="size-3.5" />
              <span data-numeric>{group.memberCount}</span> members
            </p>
            {group.inspectorSourceGroupName ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Inspectors from {group.inspectorSourceGroupName}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-warning-soft-foreground">
                No second group, so there is nowhere to draw an inspector from
              </p>
            )}
          </li>
        ))}
      </ul>

      {ungroupedCount > 0 ? (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-warning-soft-foreground">
          <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
          <span>
            <span data-numeric>{ungroupedCount}</span> enrolled student
            {ungroupedCount === 1 ? " is" : "s are"} not in a group. They will not
            be evaluated by peers and will not appear in a group ranking.
          </span>
        </p>
      ) : null}
    </>
  );
}
