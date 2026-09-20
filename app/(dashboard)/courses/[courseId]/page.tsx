import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DescriptionList, PageHeader, Section, StatusBadge } from "@/components/shared";
import {
  COURSE_STATUS_LABEL,
  COURSE_STATUS_TONE,
} from "@/features/courses/constants";
import { COST_STATUS_LABEL, COST_STATUS_TONE } from "@/features/costs/constants";
import { routes } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { costSheetsForCourse, getCourse, programTermsForCourse } from "@/server/services";

interface PageParams {
  params: Promise<{ courseId: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { courseId } = await params;
  const course = getCourse(courseId);
  return { title: course ? `${course.code} ${course.name}` : "Course" };
}

/**
 * Course detail. Server-rendered from the service directly, because nothing on
 * the page is interactive and the extra HTTP hop would buy nothing.
 */
export default async function Page({ params }: PageParams) {
  const { courseId } = await params;
  const course = getCourse(courseId);
  if (!course) notFound();

  const sheets = costSheetsForCourse(course.id);
  const terms = programTermsForCourse(course.id);

  return (
    <>
      <PageHeader
        title={`${course.code} ${course.name}`}
        description={course.description}
        meta={
          <StatusBadge
            tone={COURSE_STATUS_TONE[course.status]}
            label={COURSE_STATUS_LABEL[course.status]}
          />
        }
      />

      <Section title="Details">
        <DescriptionList
          items={[
            { label: "Code", value: course.code },
            { label: "Credits", value: course.credits },
            {
              label: "Offered in",
              value:
                course.offeredIn.length > 0
                  ? course.offeredIn.map((code) => (
                      <Link
                        key={code}
                        href={routes.semester(code)}
                        className="mr-2 rounded-sm underline-offset-4 hover:underline"
                      >
                        {code}
                      </Link>
                    ))
                  : "Not scheduled in any semester yet",
              wide: true,
            },
            { label: "Created", value: formatDate(course.createdAt) },
            { label: "Updated", value: formatDate(course.updatedAt) },
          ]}
        />
      </Section>

      <Section
        title="Part of these programs"
        description="A course can be taught into several curricula, which is why its cost is charged per student rather than per sheet."
        className="mt-4"
      >
        {terms.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This course is not in any program curriculum yet.
          </p>
        ) : (
          <ul className="grid gap-2">
            {terms.map((term) => (
              <li
                key={term.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-hairline bg-card px-3 py-2"
              >
                <Link
                  href={routes.programTerm(term.id)}
                  className="rounded-sm font-medium underline-offset-4 hover:underline"
                >
                  {term.programCode} <span className="text-muted-foreground">{term.semesterCode}</span>
                </Link>
                <span className="text-sm text-muted-foreground" data-numeric>
                  {term.enrolledCount} students
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Cost sheets"
        description="One sheet per offering. Not every offering has one."
        className="mt-4"
      >
        {sheets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No cost sheet has been prepared for this course yet.
          </p>
        ) : (
          <ul className="grid gap-2">
            {sheets.map((sheet) => (
              <li
                key={sheet.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-hairline bg-card px-3 py-2"
              >
                <div className="flex items-center gap-2.5">
                  <Link
                    href={routes.costSheet(sheet.id)}
                    className="rounded-sm font-medium underline-offset-4 hover:underline"
                    data-numeric
                  >
                    {sheet.semesterCode}
                  </Link>
                  <StatusBadge
                    tone={COST_STATUS_TONE[sheet.status]}
                    label={COST_STATUS_LABEL[sheet.status]}
                  />
                </div>
                <span className="text-sm text-muted-foreground" data-numeric>
                  {formatCurrency(sheet.totalCost, sheet.currency)} total
                  {sheet.costPerStudent !== null
                    ? `, ${formatCurrency(sheet.costPerStudent, sheet.currency)} per student`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
