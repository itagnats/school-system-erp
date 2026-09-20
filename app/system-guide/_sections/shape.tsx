import { Section } from "@/components/shared";
import { NAVIGATION } from "@/config/navigation";
import { formatNumber } from "@/lib/utils";
import {
  listCourses,
  listEnrollments,
  listInvoices,
  listProgramCostSheets,
  listProgramTerms,
  listSemesters,
  listStudents,
} from "@/server/services";

/**
 * What the dataset actually is, counted at render time.
 *
 * Every figure here is a `total` off a real list service, not a number typed
 * into a document. That is the whole discipline of this page: five files under
 * `docs/` carried stale counts on 2026-09-16, and the only reason
 * `/design-system` never does is that it renders the real thing rather than
 * describing it. A guide that can be wrong about the system is worse than no
 * guide, because it is believed.
 */
// One page of nothing, because only `total` is wanted. The services take a
// complete query rather than a partial, so the unused keys are spelled out
// instead of cast away.
const COUNT_ONLY = { search: "", page: 1, pageSize: 1, direction: "asc" } as const;

export function ShapeSection() {
  const counts = [
    { label: "Program terms", value: listProgramTerms(COUNT_ONLY).total },
    { label: "Semesters", value: listSemesters(COUNT_ONLY).total },
    { label: "Courses", value: listCourses(COUNT_ONLY).total },
    { label: "Students", value: listStudents(COUNT_ONLY).total },
    { label: "Course enrollments", value: listEnrollments(COUNT_ONLY).total },
    { label: "Invoices", value: listInvoices(COUNT_ONLY).total },
    { label: "Program cost sheets", value: listProgramCostSheets(COUNT_ONLY).total },
  ];

  const routeCount = NAVIGATION.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <Section
      id="shape"
      title="The dataset, counted now"
      description="Every figure on this page is read from a service at render time. Nothing here is transcribed, so nothing here can quietly go out of date."
    >
      <dl className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {counts.map((entry) => (
          <div key={entry.label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{entry.label}</dt>
            <dd className="text-lg font-semibold text-foreground" data-numeric>
              {formatNumber(entry.value)}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 border-t border-hairline pt-3 text-xs text-muted-foreground">
        Generated from a fixed seed, so every visitor sees the same numbers and a
        build in March agrees with a build in November. Writes are validated and
        shaped but never stored — reloading starts over. {formatNumber(routeCount)}{" "}
        destinations are listed in the sidebar, read from the same config the
        sidebar reads.
      </p>
    </Section>
  );
}
