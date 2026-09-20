"use client";

import { UserSearch } from "lucide-react";
import { EmptyState, QueryBoundary } from "@/components/feedback";
import { SearchInput } from "@/components/shared";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useEnrolCandidates } from "../hooks/use-enrol-student";

/**
 * Choose the student to enrol.
 *
 * Both picker paths in direction.md §7 are this component. "Existing profile"
 * is every student on the program; "previous course" is the same list with a
 * semester attached, which narrows it to the people who were here last term.
 * The paths are two questions, not two screens, and writing them twice would
 * have produced two lists that drifted.
 *
 * The list is **scoped to the term's program** rather than showing everyone.
 * A student on another program is refused by the server, so offering them
 * here would be an invitation to hit an error that the screen could have
 * avoided.
 */
export function StudentPicker({
  program,
  semester,
  search,
  onSearchChange,
  value,
  onChange,
  labelledBy,
}: {
  /** Program name from the chosen term. Absent until a term is chosen. */
  program?: string;
  /** Narrow to students who held a place in this semester. */
  semester?: string;
  search: string;
  onSearchChange: (value: string) => void;
  value: string;
  onChange: (studentId: string) => void;
  labelledBy: string;
}) {
  const query = useEnrolCandidates({ program, search, semester });

  if (!program) {
    return (
      <p className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
        Choose a program term first — the people you can enrol depend on it.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      <SearchInput
        value={search}
        onValueChange={onSearchChange}
        placeholder="Search name, student ID or email"
        aria-label="Search students"
      />

      <QueryBoundary
        data={query.data}
        isLoading={query.isLoading}
        error={query.error}
        isEmpty={(data) => data.items.length === 0}
        onRetry={() => query.refetch()}
        loading={
          <div className="grid gap-1.5 py-1">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        }
        empty={
          <EmptyState
            icon={UserSearch}
            title="Nobody matches"
            description={
              semester
                ? "No student on this program held a place that semester. Try the existing profile path, or a different semester."
                : "No student on this program matches that search."
            }
          />
        }
      >
        {(data) => (
          <ScrollArea className="h-56 rounded-md border">
            <RadioGroup
              value={value}
              onValueChange={onChange}
              aria-labelledby={labelledBy}
              className="gap-0 p-1"
            >
              {data.items.map((student) => (
                <Label
                  key={student.id}
                  htmlFor={`candidate-${student.id}`}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm font-normal hover:bg-muted/60 has-[:checked]:bg-muted"
                >
                  <RadioGroupItem value={student.id} id={`candidate-${student.id}`} />
                  <span className="grid gap-0.5">
                    <span className="font-medium">{student.fullName}</span>
                    <span className="text-xs text-muted-foreground">
                      {student.studentId} · {student.major} · Year {student.yearLevel}
                    </span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </ScrollArea>
        )}
      </QueryBoundary>

      {query.data && query.data.total > query.data.items.length ? (
        <p className="text-xs text-muted-foreground">
          Showing {query.data.items.length} of {query.data.total}. Search to narrow it.
        </p>
      ) : null}
    </div>
  );
}
