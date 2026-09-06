import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DescriptionList, PageHeader, Section, StatusBadge } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import {
  ENROLLMENT_STATUS_LABEL,
  ENROLLMENT_STATUS_TONE,
} from "@/features/enrollment/constants";
import { yearLevelLabel } from "@/features/students/constants";
import { routes } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { getStudent, studentEnrollments } from "@/server/services";

interface PageParams {
  params: Promise<{ studentId: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { studentId } = await params;
  const student = getStudent(studentId);
  return {
    title: student
      ? `${student.personal.firstName} ${student.personal.lastName}`
      : "Student",
  };
}

/**
 * The student profile (direction.md §9).
 *
 * Split into sections rather than one long list, because that is how it will be
 * edited later: a set of focused forms, not one giant one.
 */
export default async function Page({ params }: PageParams) {
  const { studentId } = await params;
  const student = getStudent(studentId);
  if (!student) notFound();

  const history = studentEnrollments(student.id);
  const { personal, academic, experience, emergencyContact } = student;

  return (
    <>
      <PageHeader
        title={`${personal.firstName} ${personal.lastName}`}
        description={`${academic.program} - ${academic.major}`}
        meta={
          <span className="text-xs text-muted-foreground" data-numeric>
            {student.studentId}
          </span>
        }
      />

      <Section title="Personal">
        <DescriptionList
          items={[
            { label: "Email", value: personal.email },
            { label: "Phone", value: personal.phone ?? "Not provided" },
            { label: "Date of birth", value: formatDate(personal.dateOfBirth) },
            {
              label: "Emergency contact",
              value: emergencyContact
                ? `${emergencyContact.name} (${emergencyContact.relationship}) - ${emergencyContact.phone}`
                : "Not provided",
              wide: true,
            },
          ]}
        />
      </Section>

      <Section title="Academic" className="mt-4">
        <DescriptionList
          items={[
            { label: "Program", value: academic.program },
            { label: "Major", value: academic.major },
            { label: "Year", value: yearLevelLabel(academic.yearLevel) },
            {
              label: "Skills",
              value: <TagList values={academic.skills} empty="None recorded" />,
              wide: true,
            },
            {
              label: "Interests",
              value: <TagList values={academic.interests} empty="None recorded" />,
              wide: true,
            },
            {
              label: "Certifications",
              value: <TagList values={academic.certifications} empty="None recorded" />,
              wide: true,
            },
          ]}
        />
      </Section>

      <Section
        title="Experience"
        description={experience.careerGoal}
        className="mt-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <ExperienceGroup title="Projects" items={experience.projects} />
          <ExperienceGroup title="Clubs" items={experience.clubs} />
          <ExperienceGroup title="Activities" items={experience.activities} />
          <ExperienceGroup title="Achievements" items={experience.achievements} />
        </div>
      </Section>

      <Section
        title="Enrollment history"
        description="Every course this student has been enrolled in, newest semester first."
        className="mt-4"
      >
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This student is not enrolled in any course yet.
          </p>
        ) : (
          <ul className="grid gap-2">
            {history.map((enrollment) => (
              <li
                key={enrollment.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-hairline bg-card px-3 py-2"
              >
                <div className="flex items-center gap-2.5">
                  <Link
                    href={routes.course(enrollment.courseId)}
                    className="rounded-sm font-medium underline-offset-4 hover:underline"
                  >
                    {enrollment.courseId.replace("crs-", "").toUpperCase()}
                  </Link>
                  <span className="text-sm text-muted-foreground" data-numeric>
                    {enrollment.semesterCode}
                  </span>
                </div>
                <StatusBadge
                  tone={ENROLLMENT_STATUS_TONE[enrollment.status]}
                  label={ENROLLMENT_STATUS_LABEL[enrollment.status]}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}

function TagList({ values, empty }: { values: string[]; empty: string }) {
  if (values.length === 0) {
    return <span className="text-muted-foreground">{empty}</span>;
  }
  return (
    <span className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <Badge key={value} variant="secondary">
          {value}
        </Badge>
      ))}
    </span>
  );
}

function ExperienceGroup({
  title,
  items,
}: {
  title: string;
  items: { id: string; title: string; description?: string; startDate?: string }[];
}) {
  return (
    <div className="rounded-md border border-hairline bg-card p-3">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">Nothing recorded.</p>
      ) : (
        <ul className="mt-2 grid gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <p className="text-sm text-foreground">{item.title}</p>
              {item.description ? (
                <p className="text-xs text-muted-foreground">{item.description}</p>
              ) : null}
              {item.startDate ? (
                <p className="text-xs text-muted-foreground">
                  From {formatDate(item.startDate)}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
