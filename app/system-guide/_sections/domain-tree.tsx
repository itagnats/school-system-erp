import { Section } from "@/components/shared";
import { formatNumber } from "@/lib/utils";
import {
  listCostSheets,
  listCourses,
  listEnrollments,
  listEvaluationSetups,
  listInvoices,
  listProgramCostSheets,
  listProgramTerms,
  listSemesters,
  listStudents,
  programEnrollmentCount,
  programProfitLookup,
} from "@/server/services";

/**
 * The domain as a mind map, with every node counted at render time.
 *
 * `direction.md` draws this hierarchy in prose and `CLAUDE.md` draws it again
 * as chains; both are hand-maintained and both have been wrong. Here each node
 * carries a `total` off a real list service, so the shape and the size are the
 * system's own answer rather than a remembered one.
 *
 * **The program term is the center, and that is a claim about the domain
 * rather than a layout convenience.** It is where the three chains meet: it
 * holds the curriculum, it is what a student actually joins, and it owns the
 * indirect costs the courses inside it share. Put anything else in the middle
 * and the branches stop being true.
 *
 * ## Why it is drawn this way
 *
 * Positions are **fixed literals**, never computed by a layout pass. The
 * decoration layer learned that one the hard way: anything positioned by a
 * calculation that could differ between renders breaks hydration, and a diagram
 * that reflows is a diagram nobody can point at in a review.
 *
 * Colors are passed as `var(--token)` strings, the device
 * `category-bar-chart.tsx` already uses for `--surface-sunken`. The browser
 * resolves them, so the map follows the theme switch without this file knowing
 * which theme is on.
 *
 * Edges run center to center and the boxes are painted over them, so no curve
 * has to stop exactly at a rounded corner. It costs nothing — the rects are
 * opaque — and it removes the only fiddly geometry in the file.
 *
 * ## Accessibility
 *
 * The SVG is `aria-hidden`. A screen reader crawling it produces a stream of
 * unlabeled paths, which is worse than nothing, so the list underneath carries
 * the same nodes, the same counts and a sentence each. That list is the real
 * content rather than a fallback: the map gives a sighted reader the shape and
 * the list gives everyone the meaning. Same bargain `ChartFrame` makes, applied
 * to a diagram instead of a plot.
 */

interface MapNode {
  id: string;
  label: string;
  count: number;
  note: string;
  /** Fixed center in viewBox units. Never computed. */
  x: number;
  y: number;
  w: number;
  h: number;
  parent?: string;
  hub?: boolean;
}

const COUNT_ONLY = { search: "", page: 1, pageSize: 1, direction: "asc" } as const;

const VIEW_W = 1000;
const VIEW_H = 440;

function buildNodes(): MapNode[] {
  return [
    {
      id: "term",
      label: "Program term",
      count: listProgramTerms(COUNT_ONLY).total,
      note: "A curriculum for one semester plus a package price. The center of the domain: what a student joins, what holds the courses, and what bears the indirect costs.",
      x: 500,
      y: 220,
      w: 176,
      h: 54,
      hub: true,
    },
    {
      id: "semester",
      label: "Semester",
      count: listSemesters(COUNT_ONLY).total,
      note: "YYYYNN. Every term runs in exactly one, and everything below is scoped through it.",
      x: 500,
      y: 46,
      w: 136,
      h: 44,
      parent: "term",
    },
    {
      id: "course",
      label: "Course",
      count: listCourses(COUNT_ONLY).total,
      note: "Named by the curriculum. One course can run in several semesters, and carries its own direct costs into any program that takes it.",
      x: 760,
      y: 130,
      w: 130,
      h: 44,
      parent: "term",
    },
    {
      id: "course-sheet",
      label: "Course cost sheet",
      count: listCostSheets(COUNT_ONLY).total,
      note: "Direct costs only — lecturer, TA, materials. Seven belong to no program at all and bear no share of a pool.",
      x: 915,
      y: 66,
      w: 160,
      h: 40,
      parent: "course",
    },
    {
      id: "setup",
      label: "Evaluation setup",
      count: listEvaluationSetups(COUNT_ONLY).total,
      note: "One per course-semester: the window, the scale, the guidance and the blend.",
      x: 915,
      y: 170,
      w: 160,
      h: 40,
      parent: "course",
    },
    {
      id: "program-sheet",
      label: "Program cost sheet",
      count: listProgramCostSheets(COUNT_ONLY, programProfitLookup()).total,
      note: "Indirect costs — classroom, utilities, activities — borne once by the term and shared across its curriculum by credit hours.",
      x: 500,
      y: 394,
      w: 200,
      h: 44,
      parent: "term",
    },
    {
      id: "membership",
      label: "Program enrollment",
      count: programEnrollmentCount(),
      note: "One membership per student per term. This is the enrollment that is entered; everything below it follows from the curriculum.",
      x: 235,
      y: 130,
      w: 198,
      h: 44,
      parent: "term",
    },
    {
      id: "student",
      label: "Student",
      count: listStudents(COUNT_ONLY).total,
      note: "A person, existing outside any semester. A membership is how they enter one.",
      x: 80,
      y: 62,
      w: 130,
      h: 40,
      parent: "membership",
    },
    {
      id: "enrollment",
      label: "Course enrollment",
      count: listEnrollments(COUNT_ONLY).total,
      note: "Derived from the curriculum, never entered by hand — which is why a roster and a curriculum cannot disagree.",
      x: 95,
      y: 196,
      w: 168,
      h: 40,
      parent: "membership",
    },
    {
      id: "invoice",
      label: "Invoice",
      count: listInvoices(COUNT_ONLY).total,
      note: "One per student per semester. Its lines are the curriculum, not the courses they turned up to.",
      x: 105,
      y: 290,
      w: 140,
      h: 40,
      parent: "membership",
    },
  ];
}

/**
 * A cubic curve between two centers, bending along whichever axis dominates.
 *
 * Bending the wrong way turns a gentle arc into an S, which is the difference
 * between a mind map and a plate of spaghetti.
 */
function edgePath(from: MapNode, to: MapNode): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    const bend = dx / 2;
    return `M ${from.x} ${from.y} C ${from.x + bend} ${from.y}, ${to.x - bend} ${to.y}, ${to.x} ${to.y}`;
  }
  const bend = dy / 2;
  return `M ${from.x} ${from.y} C ${from.x} ${from.y + bend}, ${to.x} ${to.y - bend}, ${to.x} ${to.y}`;
}

export function DomainTreeSection() {
  const nodes = buildNodes();
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const edges = nodes.flatMap((node) => {
    const from = node.parent ? byId.get(node.parent) : undefined;
    return from ? [{ id: node.id, from, to: node }] : [];
  });

  return (
    <Section
      id="domain"
      title="The domain, as a mind map"
      description="The program term sits in the middle because that is where the three chains meet. Every count is read from a service as the page renders."
    >
      {/* The one place this page may scroll sideways. A diagram squeezed to a
          phone's width is unreadable, so it keeps its size and the container
          scrolls — the documented escape hatch for diagrams and tables. */}
      <div className="overflow-x-auto">
        <svg
          aria-hidden
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="h-auto w-full min-w-[880px]"
        >
          <g fill="none" stroke="var(--hairline-strong)" strokeWidth={1.5}>
            {edges.map((edge) => (
              <path key={edge.id} d={edgePath(edge.from, edge.to)} />
            ))}
          </g>

          {nodes.map((node) => (
            <g key={node.id}>
              <rect
                x={node.x - node.w / 2}
                y={node.y - node.h / 2}
                width={node.w}
                height={node.h}
                rx={node.hub ? 14 : 10}
                fill={node.hub ? "var(--tone-pink)" : "var(--card)"}
                stroke={node.hub ? "var(--tone-pink-accent)" : "var(--hairline)"}
                strokeWidth={node.hub ? 1.5 : 1}
              />
              <text
                x={node.x}
                y={node.y - 4}
                textAnchor="middle"
                fontSize={node.hub ? 14 : 12.5}
                fontWeight={node.hub ? 600 : 500}
                fill={node.hub ? "var(--tone-pink-accent)" : "var(--foreground)"}
              >
                {node.label}
              </text>
              <text
                x={node.x}
                y={node.y + 13}
                textAnchor="middle"
                fontSize={11}
                fill={node.hub ? "var(--tone-pink-accent)" : "var(--muted-foreground)"}
              >
                {formatNumber(node.count)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Not a fallback — the reading half. The map carries the shape, this
          carries what each node means, and it is what a screen reader gets. */}
      <dl className="mt-4 grid gap-x-6 gap-y-3 border-t border-hairline pt-4 sm:grid-cols-2">
        {nodes.map((node) => (
          <div key={node.id} className="min-w-0">
            <dt className="text-sm font-medium text-foreground">
              {node.label}{" "}
              <span className="text-muted-foreground" data-numeric>
                {formatNumber(node.count)}
              </span>
            </dt>
            <dd className="mt-0.5 text-xs text-muted-foreground">{node.note}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 max-w-prose text-xs text-muted-foreground">
        Two joins close the loops. Cost per student ties a course back to its
        program&rsquo;s profitability, and the curriculum ties a program term
        to the invoice that bills it — which is why an invoice line is a course
        the student was sold rather than a course they attended.
      </p>
    </Section>
  );
}
