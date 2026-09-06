"use client";

import { ArrowLeft, Lock, TriangleAlert, Users } from "lucide-react";
import { Section, StatusBadge } from "@/components/shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { rankingSharePercent } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import type {
  EvaluationGroupSummary,
  EvaluationKind,
  EvaluationRelation,
  RoleWeight,
} from "@/types";
import {
  EVALUATION_KIND_DESCRIPTION,
  EVALUATION_KIND_LABEL,
  EVALUATOR_ROLE_DESCRIPTION,
  EVALUATOR_ROLE_LABEL,
} from "../constants";

/**
 * Who evaluates whom, per kind of form (direction.md §16-17).
 *
 * The four roles are fixed by the specification, so this panel does not compose
 * relations - it renders the rules and says whether each one can actually be
 * satisfied. That is the part worth showing: an enabled role with no assessors
 * in scope produces no score, and nothing else on the screen would reveal it.
 *
 * A reference design for this screen let an administrator build arbitrary
 * assessee-to-assessor pairs. That was not adopted: §16-17 fix the roles, and a
 * configurable relation would let someone build a course where students rate
 * themselves.
 */
export function RelationsPanel({
  relations,
  weights,
  groups,
  ungroupedCount,
}: Readonly<{
  relations: EvaluationRelation[];
  weights: RoleWeight[];
  groups: EvaluationGroupSummary[];
  ungroupedCount: number;
}>) {
  const shares = new Map(weights.map((weight) => [weight.role, weight]));

  /** Roles that contribute to one kind of form, at a non-zero share. */
  const forKind = (kind: EvaluationKind) =>
    relations.filter((relation) => {
      const weight = shares.get(relation.role);
      if (!weight?.enabled) return false;
      const share =
        kind === "criteria" ? weight.criteriaSharePercent : rankingSharePercent(weight);
      return share > 0;
    });

  return (
    <Section
      title="Roles and relations"
      description="Who assesses whom. The four roles are fixed by the evaluation model; what changes per course is which of them take part."
    >
      <Tabs defaultValue="criteria">
        <TabsList>
          <TabsTrigger value="criteria">{EVALUATION_KIND_LABEL.criteria}</TabsTrigger>
          <TabsTrigger value="ranking">{EVALUATION_KIND_LABEL.ranking}</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
        </TabsList>

        {(["criteria", "ranking"] as const).map((kind) => (
          <TabsContent key={kind} value={kind} className="mt-3.5">
            <p className="text-xs text-muted-foreground">
              {EVALUATION_KIND_DESCRIPTION[kind]}.
            </p>
            <RelationList kind={kind} relations={forKind(kind)} />
          </TabsContent>
        ))}

        <TabsContent value="groups" className="mt-3.5">
          <GroupList groups={groups} ungroupedCount={ungroupedCount} />
        </TabsContent>
      </Tabs>
    </Section>
  );
}

function RelationList({
  kind,
  relations,
}: Readonly<{ kind: EvaluationKind; relations: EvaluationRelation[] }>) {
  if (relations.length === 0) {
    return (
      <p className="mt-3 rounded-lg border border-hairline bg-surface-sunken px-3.5 py-3 text-sm text-muted-foreground">
        No role contributes to this form, so it is not part of the score. Give a
        role a share of it in the blend above to switch it on.
      </p>
    );
  }

  return (
    <ul className="mt-3 grid gap-2.5 lg:grid-cols-2">
      {relations.map((relation) => (
        <RelationCard key={relation.role} kind={kind} relation={relation} />
      ))}
    </ul>
  );
}

function RelationCard({
  kind,
  relation,
}: Readonly<{ kind: EvaluationKind; relation: EvaluationRelation }>) {
  const share =
    kind === "criteria"
      ? relation.criteriaSharePercent
      : 100 - relation.criteriaSharePercent;
  const contribution = (relation.weightPercent * share) / 100;
  const unsatisfiable = relation.assessorCount === 0;

  return (
    <li className="rounded-lg border border-hairline bg-card px-3.5 py-3">
      {/* Assessee on the left, assessor on the right, with the arrow pointing
          at who does the assessing - the direction people get wrong. */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-foreground">Student</span>
        <ArrowLeft aria-hidden className="size-3.5 text-muted-foreground" />
        <span className="font-medium text-foreground">
          {EVALUATOR_ROLE_LABEL[relation.role]}
        </span>
        <span className="sr-only">assesses the student</span>
        <StatusBadge
          tone="accent"
          label={`${Number(contribution.toFixed(2))}% of the score`}
        />
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        {EVALUATOR_ROLE_DESCRIPTION[relation.role]}
      </p>

      <dl className="mt-2.5 grid grid-cols-2 gap-2 border-t border-hairline pt-2.5 text-xs">
        <div>
          <dt className="text-muted-foreground">Assessors in scope</dt>
          <dd
            className={cn("font-medium", unsatisfiable ? "text-error" : "text-foreground")}
            data-numeric
          >
            {relation.assessorCount}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Subjects each</dt>
          <dd className="font-medium text-foreground" data-numeric>
            {relation.subjectsPerAssessor}
          </dd>
        </div>
      </dl>

      {unsatisfiable ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-error">
          <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
          <span>
            This role carries weight but has nobody to do the assessing, so its
            share of the score cannot be filled.
          </span>
        </p>
      ) : null}

      {/* The rule that must never be configurable, rendered rather than merely
          obeyed. direction.md §16. */}
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock aria-hidden className="size-3.5 shrink-0" />
        <span>
          Self-evaluation: <span className="font-medium text-foreground">never</span> — a
          student is never their own assessor
        </span>
      </p>
    </li>
  );
}

function GroupList({
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
