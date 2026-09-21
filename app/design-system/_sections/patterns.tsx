"use client";

import type { PrimeColumnDef } from "@/components/data-table";
import type { LucideIcon } from "lucide-react";
import { BookOpen, Eye, Pencil, Plus, Trash2, TrendingUp, UserPlus, Users, UsersRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  DataTable,
  DataTableColumnHeader,
  DataTablePagination,
  DataTableRowActions,
  DataTableViewOptions,
  type ColumnVisibility,
  type HideableColumn,
} from "@/components/data-table";
import {
  DetailSkeleton,
  EmptyState,
  FormSkeleton,
  LoadingState,
  QueryBoundary,
  StatCardSkeleton,
  TableSkeleton,
} from "@/components/feedback";
import { FormActions } from "@/components/forms";
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
  type StatTone,
} from "@/components/shared";
import {
  ENROLLMENT_STATUS_LABEL,
  ENROLLMENT_STATUS_TONE,
} from "@/features/enrollment/constants";
import { Button } from "@/components/ui/button";
import { HttpError } from "@/lib/api";
import { formatScore } from "@/lib/utils";
import { ENROLLMENT_STATUSES, type EnrollmentStatus } from "@/types";
import { Demo } from "../_components/demo";

/** Fictional documentation rows. Never real student data (scaffold.md §12). */
interface DemoRow {
  id: string;
  studentId: string;
  name: string;
  group: string;
  score: number;
  status: EnrollmentStatus;
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

/*
 * The status vocabulary is read from features/enrollment/constants.ts rather
 * than restated here. That is the contract this section documents: StatusBadge
 * takes a tone and a label and knows no domain words, and the mapping from one
 * to the other belongs to the feature that owns the status.
 *
 * It used to be an inlined copy, with a comment explaining that the copy was
 * deliberate. The copy was right and four badges elsewhere on this page were
 * not — Enrolled rendered as success in three places against the info the
 * application actually uses, because the Foundations swatch for --success was
 * labeled "Enrolled". A documentation page that hand-picks a tone is a second
 * opinion about a domain it does not own.
 */

/**
 * The dashboard set, one card per tone.
 *
 * Keyed as a Record over StatTone so a fifth tone added to the component fails
 * to compile here rather than quietly going undocumented. That guard used to
 * live on the Foundations card-tone grid, which was deleted on 2026-09-21 for
 * rendering the same four cards this demo already renders; it moved here so
 * the check survived the section that carried it.
 *
 * `plain` is excluded because it is the absence of a tone, and the demo below
 * is where it belongs.
 */
const TONE_CARDS: Record<
  Exclude<StatTone, "plain">,
  {
    label: string;
    value: string;
    icon: LucideIcon;
    trend?: "up";
    trendValue?: string;
    hint: string;
  }
> = {
  pink: {
    label: "Total students", value: "128", icon: Users,
    trend: "up", trendValue: "12%", hint: "from last semester",
  },
  lavender: {
    label: "Courses", value: "12", icon: BookOpen,
    trend: "up", trendValue: "2 new", hint: "courses",
  },
  blue: {
    label: "Evaluation groups", value: "8", icon: UsersRound,
    hint: "all groups active",
  },
  green: {
    label: "Average score", value: "88.4", icon: TrendingUp,
    trend: "up", trendValue: "4.3", hint: "from last semester",
  },
};

const TONE_KEYS = Object.keys(TONE_CARDS) as Exclude<StatTone, "plain">[];

/** The demo table's optional columns. Identity and status stay put. */
const DEMO_OPTIONAL_COLUMNS: HideableColumn[] = [
  { id: "group", label: "Group" },
  { id: "score", label: "Final score" },
];

export function PatternsSection() {
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<string>("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPending, setConfirmPending] = useState(false);
  const [demoPage, setDemoPage] = useState(1);
  const [demoPageSize, setDemoPageSize] = useState(20);
  const [demoFetching, setDemoFetching] = useState(false);
  const [demoVisibility, setDemoVisibility] = useState<ColumnVisibility>({});
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
      cell: ({ row }) => (
        <StatusBadge
          tone={ENROLLMENT_STATUS_TONE[row.original.status]}
          label={ENROLLMENT_STATUS_LABEL[row.original.status]}
        />
      ),
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
                <StatusBadge tone={ENROLLMENT_STATUS_TONE.active} label={ENROLLMENT_STATUS_LABEL.active} />
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

      <Section id="stat-cards" title="Stat cards" description="Dashboard and detail metrics. Trend direction and whether it is good news are separate inputs.">
        <div className="flex flex-col gap-4">
          <Demo
            title="Tones"
            note="The four pastel grounds, --tone-pink through --tone-green, each with its own accent for the icon chip. A tone is grouping, not meaning: it makes a row of metrics read as a set, and anything that has to communicate a state uses a status badge instead. This is the only place the tones are shown."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {TONE_KEYS.map((tone) => (
                <StatCard key={tone} tone={tone} {...TONE_CARDS[tone]} />
              ))}
            </div>
          </Demo>

          <Demo
            title="Plain, and a trend that is not good news"
            note="Direction and sentiment are separate inputs: enrollment up is positive, drop-outs up is not. The arrow always accompanies the color."
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

      <Section
        id="status-badges"
        title="Status badges"
        description="Tone plus a written label. Color never carries the meaning on its own — Dropped and Cancelled share the error tone and never the word, because the difference matters to a registrar and a color cannot carry it."
      >
        <div className="flex flex-col gap-3">
          {/* The whole enrollment lifecycle, read from the feature that owns it.
              Six statuses over five tones, so the shared-tone pair the
              description argues about is visible rather than asserted. */}
          <div className="flex flex-wrap items-center gap-1.5">
            {ENROLLMENT_STATUSES.map((status) => (
              <StatusBadge
                key={status}
                tone={ENROLLMENT_STATUS_TONE[status]}
                label={ENROLLMENT_STATUS_LABEL[status]}
              />
            ))}
          </div>
          {/* The two variants, on statuses the map already placed, so this row
              documents the component rather than inventing more vocabulary. */}
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge
              variant="outline"
              tone={ENROLLMENT_STATUS_TONE.enrolled}
              label={ENROLLMENT_STATUS_LABEL.enrolled}
            />
            <StatusBadge
              tone={ENROLLMENT_STATUS_TONE.active}
              label={ENROLLMENT_STATUS_LABEL.active}
              showDot={false}
            />
          </div>
        </div>
      </Section>

      <Section id="filter-data-table"
        title="Filter bar and data table"
        description="The single table implementation. It owns sorting, pagination, the scroll container and all four data states. Paging is not a first load: toggle Fetching to see it hold the current rows and dim them instead of collapsing to a skeleton."
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
              <>
                <DataTableViewOptions
                  columns={DEMO_OPTIONAL_COLUMNS}
                  visibility={demoVisibility}
                  onVisibilityChange={setDemoVisibility}
                />
                <Button
                  size="sm"
                  variant={demoFetching ? "secondary" : "outline"}
                  aria-pressed={demoFetching}
                  onClick={() => setDemoFetching((on) => !on)}
                >
                  Fetching
                </Button>
                <Button size="sm" className="gap-1.5">
                  <Plus className="size-3.5" aria-hidden />
                  Add
                </Button>
              </>
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
            isFetching={demoFetching}
            columnVisibility={demoVisibility}
            onColumnVisibilityChange={setDemoVisibility}
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
            { label: "Status", value: <StatusBadge tone={ENROLLMENT_STATUS_TONE.active} label={ENROLLMENT_STATUS_LABEL.active} /> },
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
        description="Every data-driven surface implements all four — loading, success, empty and error. QueryBoundary resolves them in one place, which is how none of the four quietly goes missing: a feature page wraps its data region in it instead of writing the same branches again, differently, each time."
      >
        <div className="flex flex-col gap-6">
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

            <p className="max-w-prose text-xs text-muted-foreground">
              Those four buttons drive the real component, so loading, empty and
              error are the live branches rather than pictures of them. What
              follows is what the loading branch is handed, and the one state
              QueryBoundary cannot reach on its own.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Demo title="Table skeleton" note="Matches row height and cell padding, so nothing jumps when data lands.">
              <TableSkeleton rows={3} columns={4} />
            </Demo>

            <Demo title="Stat skeleton" note="One block per card, at the card's own height.">
              <div className="grid gap-3 sm:grid-cols-2">
                <StatCardSkeleton />
                <StatCardSkeleton />
              </div>
            </Demo>

            <Demo title="Form skeleton" note="Field placeholders at --field-h, so the form does not resize on load.">
              <FormSkeleton fields={3} />
            </Demo>

            <Demo title="Spinner" note="LoadingState is for the case the skeletons cannot serve: a result whose shape is not known until it arrives. Where the shape is known, a shape-matched skeleton is the better wait.">
              <LoadingState compact />
            </Demo>

            <Demo
              title="Detail skeleton"
              note="A whole detail page: title, stat row and table. Use it as the loading view for a record screen."
              className="lg:col-span-2"
            >
              <DetailSkeleton />
            </Demo>

            <Demo
              title="No results"
              note="The empty branch above is a collection with no records, and it offers the create action. This is the other empty: filters excluded everything, so the offer is to clear them. Offering to create here would answer a question the user did not ask."
              className="lg:col-span-2"
            >
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
        description="FormActions owns the submit row and this documents its states. The layout itself — FormSection's heading column, and FormFieldWide for a field that spans both — is shown wired to React Hook Form and Zod under Primitives → Form bindings, so it is not rebuilt here out of dead inputs that cannot demonstrate what the layout is for."
      >
        <div className="grid gap-4">
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
