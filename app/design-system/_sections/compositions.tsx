import type { ReactNode } from "react";
import {
  CategoryBarChart,
  CriteriaRadarChart,
  ShareDonutChart,
  TrendAreaChart,
} from "@/components/data-viz";
import { Section } from "@/components/shared";
import { Demo } from "../_components/demo";

/**
 * The seven screen shapes every PRIME module is assembled from.
 *
 * This section documents *order*, which is the part a component library
 * cannot express. Each of these parts already exists under Patterns; what is
 * easy to get wrong is which parts a screen needs and in what sequence, and
 * that is what a reviewer opening an unfamiliar module has to infer.
 */
interface Anatomy {
  name: string;
  when: string;
  steps: { part: string; note: string; optional?: boolean }[];
}

const ANATOMIES: Anatomy[] = [
  {
    name: "List screen",
    when: "The default landing screen for a domain: courses, students, cost sheets.",
    steps: [
      { part: "PageHeader", note: "Title, one primary action, context chips." },
      {
        part: "FilterBar",
        note: "Search, filters, and the clear affordance. State lives in the URL, never in component state, so a filtered view can be shared and survives a refresh.",
      },
      {
        part: "DataTable",
        note: "Sorting, the scroll container, and all four data states in one implementation.",
      },
      {
        part: "DataTablePagination",
        note: "Range and page size. Always present, even under one page, so the row count is never a mystery.",
      },
    ],
  },
  {
    name: "Form screen",
    when: "Creating or editing one record.",
    steps: [
      { part: "PageHeader", note: "What is being edited. No primary action here — it belongs at the end of the form." },
      {
        part: "FormSection",
        note: "One per group of related fields, with the group name in the left column. Two or three sections read far better than one column of eleven fields.",
      },
      {
        part: "Field-level validation",
        note: "Zod through the form bindings, so every message is tied on with aria-describedby and aria-invalid.",
      },
      {
        part: "FormActions",
        note: "Submit and cancel, at the end, with the submit carrying the pending state.",
      },
    ],
  },
  {
    name: "Detail screen",
    when: "One record, read-mostly: a student profile, a course, an individual report.",
    steps: [
      { part: "Breadcrumb", note: "In the shell, not in the page. It is navigation, so it sits with the navigation." },
      { part: "PageHeader", note: "The entity name, its status, and its actions." },
      { part: "StatCard row", note: "The three or four numbers that summarize the record.", optional: true },
      { part: "DescriptionList", note: "The fields, as a real definition list." },
      { part: "Section per grouping", note: "Enrollments, evaluations, cost breakdown — one panel each." },
    ],
  },
  {
    name: "Destructive confirmation",
    when: "Any action that cannot be undone from the UI.",
    steps: [
      { part: "Trigger", note: "Named for the action, never just Delete: Withdraw enrollment, Void cost sheet." },
      {
        part: "ConfirmDialog",
        note: "States the consequence in words, including what is kept. Radix traps focus and returns it to the trigger.",
      },
      { part: "Pending", note: "The confirm button takes loading, which also blocks a second submit." },
      { part: "Toast", note: "Confirmation after the fact. A silent success reads as a failure." },
    ],
  },
  {
    name: "Dashboard",
    when: "The overview screen.",
    steps: [
      { part: "PageHeader", note: "The only page that earns bloom, because it is the one that greets." },
      { part: "StatCard row", note: "Four at most. A fifth number means none of them is the headline." },
      { part: "Charts", note: "Trend and composition. Two charts answering two questions, not six answering one." },
      { part: "Recent activity", note: "What changed, so the screen is worth returning to." },
    ],
  },
  {
    name: "First-run screen",
    when: "A domain with no records yet — the state every list screen starts in.",
    steps: [
      { part: "PageHeader", note: "Unchanged. The page still says what it is." },
      {
        part: "EmptyState",
        note: "Distinguishes nothing-yet from nothing-found. The first offers the action that creates a record; the second offers to clear the filters.",
      },
    ],
  },
  {
    name: "Printable report",
    when: "The individual student report (direction.md §23).",
    steps: [
      { part: "PageHeader", note: "Actions marked data-print=\"hide\"." },
      { part: "Score arithmetic", note: "The weighted blend shown as arithmetic rather than as a single number. Showing the working is a product requirement, not a debugging aid." },
      { part: "Ranking with its scope", note: "Always stated: within the group, or within the course and semester." },
      { part: "Print rule", note: "data-print=\"hide\" and data-decor both stripped. Petals do not belong on paper." },
    ],
  },
];

const COHORT_TREND = [
  { label: "202501", value: 74.2 },
  { label: "202502", value: 76.8 },
  { label: "202601", value: 79.1 },
  { label: "202602", value: 81.3 },
];

const GROUP_SIZES = [
  { label: "Group A", value: 8 },
  { label: "Group B", value: 7 },
  { label: "Group C", value: 8 },
  { label: "Group D", value: 6 },
];

const COST_SPLIT = [
  { label: "Instruction", value: 148_000 },
  { label: "Materials", value: 61_500 },
  { label: "Facilities", value: 42_000 },
  { label: "Shared overhead", value: 28_500 },
];

/**
 * A real profile from the seeded report data, so the shape is one the
 * application actually produces rather than a flattering invention.
 */
const CRITERIA_PROFILE = [
  { label: "Participation", value: 4.83 },
  { label: "Teamwork", value: 4.78 },
  { label: "Communication", value: 4.91 },
  { label: "Problem solving", value: 4.75 },
  { label: "Responsibility", value: 4.58 },
  { label: "Leadership", value: 4.91 },
  { label: "Technical", value: 4.85 },
];

function AnatomyCard({ anatomy }: { anatomy: Anatomy }) {
  return (
    <div className="rounded-md border border-hairline bg-surface-sunken p-3.5">
      <h4 className="text-sm font-medium text-foreground">{anatomy.name}</h4>
      <p className="mt-0.5 mb-3 text-xs text-muted-foreground">{anatomy.when}</p>
      <ol className="flex flex-col gap-1.5">
        {anatomy.steps.map((step, index) => (
          <li key={step.part} className="flex gap-2.5">
            <span
              aria-hidden
              className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-card text-[10px] font-medium text-muted-foreground ring-1 ring-hairline"
              data-numeric
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <code className="text-xs text-foreground">{step.part}</code>
              {step.optional ? (
                <span className="ml-1.5 text-[10px] text-muted-foreground">
                  optional
                </span>
              ) : null}
              <p className="text-xs text-muted-foreground">{step.note}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The layer chain, as a diagram rather than a sentence. */
function LayerDiagram() {
  const layers: { name: string; detail: string; badge?: ReactNode }[] = [
    { name: "Design tokens", detail: "app/globals.css — color, type, spacing, radius, elevation, motion" },
    { name: "components/ui", detail: "Generic primitives on the Radix base. No domain vocabulary." },
    { name: "components/decor", detail: "The petal layer. Inert: aria-hidden, pointer-events-none, stripped in print." },
    { name: "components/data-viz", detail: "The only place recharts is imported. Takes { label, value }." },
    { name: "components/shared", detail: "Application patterns: page header, filter bar, data table, status badge, states." },
    { name: "features/*", detail: "Self-contained domains. Business rules live here and nowhere above." },
    { name: "app/*", detail: "Routing and composition only." },
  ];

  return (
    <ol className="flex flex-col gap-1.5">
      {layers.map((layer, index) => (
        <li key={layer.name} className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 rounded-md border border-hairline bg-card px-3 py-2">
            <code className="text-xs font-medium text-foreground">{layer.name}</code>
            <span className="min-w-0 text-xs text-muted-foreground">
              {layer.detail}
            </span>
          </div>
          {index < layers.length - 1 ? (
            <span aria-hidden className="pl-3 text-xs leading-none text-muted-foreground">
              ↓
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function CompositionsSection() {
  return (
    <div className="flex flex-col" style={{ gap: "var(--section-gap)" }}>
      <Section
        id="architecture"
        title="Architecture"
        description="A component may depend downward, never upward. This is the rule that keeps business vocabulary out of generic UI, and it is the one worth checking in review: a generic component that has learned about enrollment status is in the wrong folder."
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <LayerDiagram />
          <div className="flex flex-col gap-2 text-xs text-muted-foreground">
            <p>
              Two of these layers are newer than the original three-layer plan and
              exist for the same reason: something that cannot consume a semantic
              token needed containing.
            </p>
            <p>
              <code className="text-foreground">components/decor</code> holds no
              patterns and takes no content, so it sits below
              <code className="mx-1 text-foreground">shared</code> rather than in it.
            </p>
            <p>
              <code className="text-foreground">components/data-viz</code> exists
              because recharts takes colors as strings and cannot read a Tailwind
              class. Wrapping it once means the library is named in one folder instead
              of seven, and a chart still follows the theme switch — the wrappers pass
              <code className="mx-1 text-foreground">var(--chart-1)</code>, which the
              browser resolves.
            </p>
          </div>
        </div>
      </Section>

      <Section
        id="screen-anatomy"
        title="Screen anatomy"
        description="Seven shapes, and every module is one of them. The parts are documented individually under Patterns; what this section adds is the order, which is the part that is easy to get wrong and impossible to infer from a component list."
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {ANATOMIES.map((anatomy) => (
            <AnatomyCard key={anatomy.name} anatomy={anatomy} />
          ))}
        </div>
      </Section>

      <Section
        id="charts"
        title="Charts"
        description="Four chart types and a hard rule about which to reach for. Each takes an array of { label, value } and nothing else, so a feature module never imports recharts or picks a color."
        decor
      >
        <div className="flex flex-col gap-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <Demo
              title="TrendAreaChart"
              note="One measure across an ordered run. The y axis does not start at zero, deliberately: a narrow band of scores has to stay readable. That is right for a trend and wrong for a magnitude comparison."
              contentClassName="bg-card"
            >
              <TrendAreaChart
                title="Cohort average by semester"
                description="IT101 · final weighted score"
                data={COHORT_TREND}
                unit="Average score"
                format="decimal"
                height={180}
              />
            </Demo>

            <Demo
              title="CategoryBarChart"
              note="One value per named category, where the comparison between them is the point. If the x axis is time, use the trend instead — bars over time invite the eye to compare neighbours when the shape of the whole run is what matters."
              contentClassName="bg-card"
            >
              <CategoryBarChart
                title="Students per evaluation group"
                description="IT101 · 202602"
                data={GROUP_SIZES}
                unit="Students"
                height={180}
                colorPerCategory
              />
            </Demo>
          </div>

          <Demo
            title="ShareDonutChart"
            note="Parts of one whole, and only when the slices genuinely sum to something meaningful. Beyond about five, slice angles stop being comparable and a bar chart reads better. The legend states each value, so the numbers never live only inside a hover tooltip."
            contentClassName="bg-card"
          >
            <ShareDonutChart
              title="Course cost composition"
              description="IT101 · 202602 · direct and shared"
              data={COST_SPLIT}
              unit="Cost"
              valuePrefix="¥"
              height={190}
            />
          </Demo>

          <Demo
            title="CriteriaRadarChart"
            note="A profile across several measures on one shared scale, when the shape is the finding - strong on delivery, weak on communication reads at a glance. The radius axis is fixed to the scale, never inferred from the data, because auto-scaling makes a weak profile fill the frame exactly like a strong one. Four to eight axes; past that the labels collide."
            contentClassName="bg-card"
          >
            <CriteriaRadarChart
              title="Behavioral profile"
              description="Student 222 · IT101 202601 · peers, inspector, teacher and TA"
              data={CRITERIA_PROFILE}
              unit="Mean rating"
              max={5}
              format="decimal"
              height={240}
            />
          </Demo>

          <div className="rounded-md border border-hairline bg-surface-sunken p-3.5">
            <h4 className="text-sm font-medium text-foreground">
              Three rules for a chart in PRIME
            </h4>
            <ul className="mt-2 flex flex-col gap-1.5 text-xs text-muted-foreground">
              <li>
                <span className="text-foreground">It states its scope.</span> A ranking
                or an average is meaningless without saying whether it is within the
                group or across the course and semester, so the caption carries it.
              </li>
              <li>
                <span className="text-foreground">It never hides the arithmetic.</span>{" "}
                Cost and score breakdowns are shown as sums the reader can check. A
                chart sits beside that working, never in place of it.
              </li>
              <li>
                <span className="text-foreground">It exposes its numbers.</span> The
                plot is aria-hidden and a visually hidden table carries the same
                figures, because an SVG read aloud is a stream of unlabeled paths.
              </li>
            </ul>
          </div>
        </div>
      </Section>

    </div>
  );
}
