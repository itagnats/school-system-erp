"use client";

import type { PrimeColumnDef } from "@/components/data-table";
import { BookOpen, Eye, Pencil, Plus, Trash2, TrendingUp, UserPlus, Users, UsersRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  DataTable,
  DataTableColumnHeader,
  DataTablePagination,
  DataTableRowActions,
} from "@/components/data-table";
import {
  DetailSkeleton,
  EmptyState,
  ErrorState,
  FormSkeleton,
  LoadingState,
  QueryBoundary,
  StatCardSkeleton,
  TableSkeleton,
} from "@/components/feedback";
import { FormActions, FormFieldWide, FormSection } from "@/components/forms";
import {
  ConfirmDialog,
  DescriptionList,
  FilterBar,
  FilterSelect,
  PageHeader,
  ScaffoldPlaceholder,
  SearchInput,
  Section,
  StatCard,
  StatusBadge,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HttpError } from "@/lib/api";
import { formatScore } from "@/lib/utils";
import { Demo } from "../_components/demo";

/** Fictional documentation rows. Never real student data (scaffold.md §12). */
interface DemoRow {
  id: string;
  studentId: string;
  name: string;
  group: string;
  score: number;
  status: "enrolled" | "active" | "pending" | "completed" | "dropped";
}

type BoundaryState = "loading" | "success" | "empty" | "error";

const DEMO_ROWS: DemoRow[] = [
  { id: "1", studentId: "ST-2026-001", name: "Student 001", group: "Group A", score: 92.5, status: "active" },
  { id: "2", studentId: "ST-2026-002", name: "Student 002", group: "Group A", score: 89.7, status: "enrolled" },
  { id: "3", studentId: "ST-2026-003", name: "Student 003", group: "Group B", score: 87.2, status: "pending" },
  { id: "4", studentId: "ST-2026-004", name: "Student 004", group: "Group B", score: 83.9, status: "completed" },
  { id: "5", studentId: "ST-2026-005", name: "Student 005", group: "Group C", score: 61.4, status: "dropped" },
];

/**
 * What QueryBoundary receives in each demo state. `undefined` is "not loaded
 * yet" and `[]` is "loaded, and genuinely empty" — the distinction the boundary
 * exists to make.
 */
const BOUNDARY_DATA: Record<BoundaryState, DemoRow[] | undefined> = {
  loading: undefined,
  empty: [],
  error: DEMO_ROWS,
  success: DEMO_ROWS,
};

/**
 * Status to tone mapping.
 *
 * In a real module this lives in features/<name>/constants.ts. It is inlined
 * here only to document the contract: StatusBadge takes a tone and a label, and
 * the domain vocabulary stays outside the shared component.
 */
const STATUS_TONE = {
  enrolled: { tone: "info", label: "Enrolled" },
  active: { tone: "success", label: "Active" },
  pending: { tone: "warning", label: "Pending" },
  completed: { tone: "neutral", label: "Completed" },
  dropped: { tone: "error", label: "Dropped" },
} as const;

export function PatternsSection() {
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<string>("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPending, setConfirmPending] = useState(false);
  const [demoPage, setDemoPage] = useState(1);
  const [demoPageSize, setDemoPageSize] = useState(20);
  const [boundaryState, setBoundaryState] = useState<BoundaryState>("success");

  const columns: PrimeColumnDef<DemoRow>[] = [
    {
      accessorKey: "studentId",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Student ID" />,
      cell: ({ row }) => (
        <span className="font-medium" data-numeric>
          {row.original.studentId}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    },
    {
      accessorKey: "group",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Group" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.group}</span>
      ),
    },
    {
      accessorKey: "score",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Final score" align="right" />
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium" data-numeric>
          {formatScore(row.original.score)}
        </div>
      ),
    },
    {
      accessorKey: "status",
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const mapped = STATUS_TONE[row.original.status];
        return <StatusBadge tone={mapped.tone} label={mapped.label} />;
      },
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DataTableRowActions
            label={row.original.name}
            actions={[
              { label: "View", icon: Eye, onSelect: () => toast("View " + row.original.name) },
              { label: "Edit", icon: Pencil, onSelect: () => toast("Edit " + row.original.name) },
              {
                label: "Drop",
                icon: Trash2,
                destructive: true,
                onSelect: () => setConfirmOpen(true),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  const filtered = DEMO_ROWS.filter((row) => {
    const matchesSearch =
      search === "" ||
      row.name.toLowerCase().includes(search.toLowerCase()) ||
      row.studentId.toLowerCase().includes(search.toLowerCase());
    const matchesGroup = group === "all" || row.group === group;
    return matchesSearch && matchesGroup;
  });

  const activeFilters = (search ? 1 : 0) + (group !== "all" ? 1 : 0);

  return (
    <div className="flex flex-col" style={{ gap: "var(--section-gap)" }}>
      <Section id="page-header"
        title="Page header"
        description="How every page opens. Actions sit on the trailing edge and wrap below the title rather than shrinking."
        flush
        bodyClassName="p-3.5"
      >
        <div className="rounded-md border border-hairline bg-background p-3.5">
          <PageHeader
            title="Enrollment"
            description="Students enrolled in IT101 for the second semester of 2026."
            meta={
              <>
                <StatusBadge tone="accent" label="IT101" showDot={false} />
                <StatusBadge tone="neutral" label="202602" showDot={false} />
                <StatusBadge tone="success" label="Active" />
              </>
            }
            actions={
              <>
                <Button size="sm" variant="outline">
                  Export
                </Button>
                <Button size="sm" className="gap-1.5">
                  <UserPlus className="size-3.5" aria-hidden />
                  Add student
                </Button>
              </>
            }
          />
        </div>
      </Section>

      <Section id="stat-cards" title="Stat cards" description="Dashboard and detail metrics. Trend direction and whether it is good news are separate inputs, and the pastel tone is grouping rather than meaning.">
        <div className="flex flex-col gap-4">
          <Demo
            title="Tones"
            note="The dashboard set. A tone groups the row visually and carries no meaning of its own, so the same four are safe to reuse on any screen."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                tone="pink"
                label="Total students"
                value="128"
                icon={Users}
                trend="up"
                trendValue="12%"
                hint="from last semester"
              />
              <StatCard
                tone="lavender"
                label="Courses"
                value="12"
                icon={BookOpen}
                trend="up"
                trendValue="2 new"
                hint="courses"
              />
              <StatCard
                tone="blue"
                label="Evaluation groups"
                value="8"
                icon={UsersRound}
                hint="all groups active"
              />
              <StatCard
                tone="green"
                label="Average score"
                value="88.4"
                icon={TrendingUp}
                trend="up"
                trendValue="4.3"
                hint="from last semester"
              />
            </div>
          </Demo>

          <Demo
            title="Plain, and a trend that is not good news"
            note="Direction and sentiment are separate inputs: enrollment up is positive, drop-outs up is not. The arrow always accompanies the colour."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Average score" value="87.4" trend="up" trendValue="+1.8" hint="vs 202601" />
              <StatCard label="Dropped" value="4" trend="up" trendValue="+2" trendIsGood={false} hint="needs review" />
              <StatCard label="Evaluation coverage" value="80%" trend="flat" trendValue="0" hint="TA pending" />
              <StatCard label="Cost per student" value="¥8,890" hint="IT101 · 202602" />
            </div>
          </Demo>
        </div>
      </Section>

      <Section id="status-badges" title="Status badges" description="Tone plus a written label. Colour never carries the meaning on its own.">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge tone="warning" label="Pending" />
            <StatusBadge tone="info" label="Enrolled" />
            <StatusBadge tone="success" label="Active" />
            <StatusBadge tone="neutral" label="Completed" />
            <StatusBadge tone="error" label="Dropped" />
            <StatusBadge tone="error" label="Cancelled" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge variant="outline" tone="accent" label="Draft" />
            <StatusBadge variant="outline" tone="warning" label="In review" />
            <StatusBadge variant="outline" tone="success" label="Approved" />
            <StatusBadge tone="accent" label="Grade A" showDot={false} />
          </div>
        </div>
      </Section>

      <Section id="filter-data-table"
        title="Filter bar and data table"
        description="The single table implementation. It owns sorting, pagination, the scroll container and all four data states."
        flush
      >
        <div className="p-3.5">
          <FilterBar
            activeCount={activeFilters}
            onClear={() => {
              setSearch("");
              setGroup("all");
            }}
            actions={
              <Button size="sm" className="gap-1.5">
                <Plus className="size-3.5" aria-hidden />
                Add
              </Button>
            }
          >
            <SearchInput
              value={search}
              onValueChange={setSearch}
              placeholder="Search student or ID"
              className="w-full sm:w-56"
            />
            <FilterSelect
              label="Group"
              value={group}
              onValueChange={setGroup}
              options={[
                { value: "Group A", label: "Group A" },
                { value: "Group B", label: "Group B" },
                { value: "Group C", label: "Group C" },
              ]}
            />
          </FilterBar>

          <DataTable
            columns={columns}
            data={filtered}
            getRowId={(row) => row.id}
            page={1}
            pageSize={20}
            onPageChange={() => undefined}
            emptyState={
              <EmptyState
                variant="no-results"
                title="No matching students"
                description="Clear the search or pick a different group."
              />
            }
          />
        </div>
      </Section>

      <Section id="detail-list" title="Detail list" description="Label and value pairs for read-only detail views, rendered as a real definition list.">
        <DescriptionList
          columns={3}
          items={[
            { label: "Course", value: "IT101 — Introduction to Information Technology" },
            { label: "Semester", value: "202602" },
            { label: "Credits", value: <span data-numeric>3</span> },
            { label: "Evaluation group", value: "Group A" },
            { label: "Instructor", value: "—" },
            { label: "Status", value: <StatusBadge tone="success" label="Active" /> },
            {
              label: "Description",
              wide: true,
              value:
                "Foundations of information technology: hardware, software, networks and the basics of programming.",
            },
          ]}
        />
      </Section>

      <Section id="data-states"
        title="Data states"
        description="Every data-driven surface implements all four. QueryBoundary resolves them in one place so none is quietly missing."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Demo title="Loading" note="Prefer a shape-matched skeleton over a spinner where the result shape is known.">
            <LoadingState compact />
          </Demo>

          <Demo title="Skeleton" note="Matches row height and cell padding, so nothing jumps when data lands.">
            <TableSkeleton rows={3} columns={4} />
          </Demo>

          <Demo title="Empty" note="Collection has no records. Offer the create action.">
            <EmptyState
              title="No cost sheets yet"
              description="Create a cost sheet for this course and semester."
              action={
                <Button size="sm" className="gap-1.5">
                  <Plus className="size-3.5" aria-hidden />
                  New cost sheet
                </Button>
              }
            />
          </Demo>

          <Demo title="No results" note="Filters excluded everything. Offer to clear them, never to create.">
            <EmptyState
              variant="no-results"
              title="No matching records"
              description="Try adjusting the search or filters."
              action={
                <Button size="sm" variant="outline">
                  Clear filters
                </Button>
              }
            />
          </Demo>

          <Demo title="Error" note="The message comes from the error mapper. A raw server body is never rendered.">
            <ErrorState
              error={new HttpError("", 500)}
              onRetry={() => toast("Retrying")}
              compact
            />
          </Demo>

          <Demo title="Stat skeleton">
            <div className="grid gap-3 sm:grid-cols-2">
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          </Demo>

          <Demo title="Form skeleton" note="Field placeholders at --field-h, so the form does not resize on load.">
            <FormSkeleton fields={3} />
          </Demo>

          <Demo
            title="Detail skeleton"
            note="A whole detail page: title, stat row and table. Use it as the loading view for a record screen."
            className="lg:col-span-2"
          >
            <DetailSkeleton />
          </Demo>
        </div>
      </Section>

      <Section id="query-boundary"
        title="Query boundary"
        description="Resolves loading, success, empty and error in one place. Feature pages wrap a data region in this instead of writing the same four branches over and over, which is how one of the four quietly goes missing."
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(["loading", "success", "empty", "error"] as const).map((state) => (
              <Button
                key={state}
                size="xs"
                variant={boundaryState === state ? "default" : "outline"}
                onClick={() => setBoundaryState(state)}
                className="capitalize"
              >
                {state}
              </Button>
            ))}
          </div>

          <div className="rounded-md border border-hairline bg-card">
            <QueryBoundary
              data={BOUNDARY_DATA[boundaryState]}
              isLoading={boundaryState === "loading"}
              error={boundaryState === "error" ? new HttpError("", 503) : undefined}
              onRetry={() => setBoundaryState("success")}
              loading={<TableSkeleton rows={3} columns={3} />}
              empty={
                <EmptyState
                  title="No students enrolled"
                  description="Add a student to this course and semester to get started."
                  action={
                    <Button size="sm" className="gap-1.5">
                      <UserPlus className="size-3.5" aria-hidden />
                      Add student
                    </Button>
                  }
                />
              }
            >
              {(rows) => (
                <div className="divide-y divide-hairline">
                  {rows.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center justify-between px-3.5 text-sm"
                      style={{ height: "var(--row-h)" }}
                    >
                      <span>{row.name}</span>
                      <span className="text-muted-foreground" data-numeric>
                        {formatScore(row.score)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </QueryBoundary>
          </div>
        </div>
      </Section>

      <Section id="pagination"
        title="Pagination"
        description="The table footer, usable on its own for any paged list. The range readout is there because a page number alone does not tell the user how much data they are looking at."
      >
        <div className="flex flex-col gap-4">
          <Demo title="Interactive" note="Changing the page size returns to page 1, since staying on page 7 of a now-shorter list lands on nothing.">
            <DataTablePagination
              page={demoPage}
              pageSize={demoPageSize}
              total={137}
              onPageChange={setDemoPage}
              onPageSizeChange={(size) => {
                setDemoPageSize(size);
                setDemoPage(1);
              }}
            />
          </Demo>

          <Demo title="Empty" note="No records: the arrows are inert rather than absent, so the control does not jump.">
            <DataTablePagination
              page={1}
              pageSize={20}
              total={0}
              onPageChange={() => undefined}
            />
          </Demo>
        </div>
      </Section>

      <Section id="form-layout"
        title="Form layout"
        description="FormSection groups fields under a heading; FormActions owns the submit row. The two are shown wired to React Hook Form and Zod under Primitives — this documents the action states."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Demo
            title="Layout"
            note="A label column beside the fields. Long forms are assembled from these rather than one continuous list."
          >
            <FormSection title="Course" description="Identity and weighting.">
              <div className="grid gap-1.5">
                <Label htmlFor="ds-form-code" className="text-sm">
                  Course code
                </Label>
                <Input
                  id="ds-form-code"
                  defaultValue="IT101"
                  style={{ height: "var(--field-h)" }}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ds-form-credits" className="text-sm">
                  Credits
                </Label>
                <Input
                  id="ds-form-credits"
                  type="number"
                  defaultValue="3"
                  style={{ height: "var(--field-h)" }}
                />
              </div>
              <FormFieldWide>
                <div className="grid gap-1.5">
                  <Label htmlFor="ds-form-desc" className="text-sm">
                    Description
                  </Label>
                  <Input
                    id="ds-form-desc"
                    placeholder="Spans both columns"
                    style={{ height: "var(--field-h)" }}
                  />
                </div>
              </FormFieldWide>
            </FormSection>
          </Demo>

          <Demo
            title="Action states"
            note="Submitting locks both buttons and shows a spinner; passing isDirty={false} holds submit until something changes; a form-level error sits on the leading edge."
          >
            <div className="flex flex-col gap-4">
              <FormActions
                submitLabel="Save course"
                cancelLabel="Cancel"
                onCancel={() => toast("Cancelled")}
                secondary={
                  <Button type="button" size="sm" variant="ghost">
                    Save as draft
                  </Button>
                }
              />
              <FormActions submitLabel="Saving" isSubmitting onCancel={() => undefined} />
              <FormActions submitLabel="Save" isDirty={false} />
              <FormActions
                submitLabel="Save"
                error="Two cost items exceed 100% allocation."
              />
            </div>
          </Demo>
        </div>
      </Section>

      <Section id="panel"
        title="Panel"
        description="Section is the container almost everything on a page sits in — including every block on this page. Structure comes from a hairline, never a shadow."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Demo title="With actions and footer">
            <Section
              title="Cost sheet"
              description="IT101 — 202602"
              actions={
                <Button size="xs" variant="outline">
                  Edit
                </Button>
              }
              footer={
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Cost per student</span>
                  <span className="font-medium" data-numeric>
                    676.56
                  </span>
                </div>
              }
            >
              <p className="text-sm text-muted-foreground">
                Body content sits at 14px padding by default.
              </p>
            </Section>
          </Demo>

          <Demo title="Flush" note="Removes body padding so a table can meet the panel edges.">
            <Section title="Enrolled students" flush>
              <div className="divide-y divide-hairline">
                {["Student 001", "Student 002", "Student 003"].map((name) => (
                  <div
                    key={name}
                    className="flex items-center px-3.5 text-sm"
                    style={{ height: "var(--row-h)" }}
                  >
                    {name}
                  </div>
                ))}
              </div>
            </Section>
          </Demo>
        </div>
      </Section>

      <Section id="scaffold-placeholder"
        title="Scaffold placeholder"
        description="Temporary. Marks a route that exists so navigation can be verified, but whose module is not built. Every remaining usage is an item on the to-do list, and the component is deleted when the last module lands."
      >
        <ScaffoldPlaceholder
          module="Enrollment"
          summary="Student list plus the three add-student paths."
          spec="direction.md §6-8"
        />
      </Section>

      <Section id="confirmation"
        title="Confirmation"
        description="For anything hard to undo. The confirm button names the action, and both buttons lock while the request is in flight."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="destructive-soft" onClick={() => setConfirmOpen(true)}>
            Drop student
          </Button>
          <Button size="sm" variant="outline" onClick={() => toast.success("Enrollment saved")}>
            Show a toast
          </Button>
        </div>

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Drop this student from IT101?"
          description="The enrollment moves to Dropped. Submitted evaluations are kept but no longer count toward the ranking."
          confirmLabel="Drop student"
          tone="destructive"
          isPending={confirmPending}
          onConfirm={() => {
            setConfirmPending(true);
            setTimeout(() => {
              setConfirmPending(false);
              setConfirmOpen(false);
              toast.success("Student dropped");
            }, 900);
          }}
        >
          <p className="text-muted-foreground">Student 001 — ST-2026-001, Group A</p>
        </ConfirmDialog>
      </Section>
    </div>
  );
}
