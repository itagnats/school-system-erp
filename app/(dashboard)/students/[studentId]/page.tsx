import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DescriptionList, Section } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { StudentIdentityCard } from "@/features/students/components/student-identity-card";
import { StudentProgramHistory } from "@/features/students/components/student-program-history";
import { yearLevelLabel } from "@/features/students/constants";
import { canOpenPath } from "@/lib/access";
import { formatDate } from "@/lib/utils";
import { requireOwnStudent } from "@/server/principal";
import { getStudent, studentProgramHistory } from "@/server/services";

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
 * The student profile, read-only (direction.md §9).
 *
 * **Reading and editing are separate screens** (decided 2026-09-16). The
 * profile opens as a record to be read — identity on the left, enrolment
 * history on the right, the rest below — and Edit leads to `/edit`, where the
 * same content is a set of forms behind tabs. An inline edit toggle per section
 * was built first and put aside: it made every section carry a control for an
 * action almost nobody takes on a given visit, and it left the page unable to
 * decide whether it was a document or a form.
 *
 * There is no page header here. The identity card is the header — repeating the
 * name above it would say the same thing twice on a screen whose whole top-left
 * is a name.
 */
export default async function Page({ params }: PageParams) {
  const { studentId } = await params;
  // `/students` is owner-scoped, so reaching this page is not the same as being
  // allowed to read it: the proxy let a student through to *a* profile and this
  // is where it is settled whether it is theirs (direction.md §3a).
  const principal = await requireOwnStudent(studentId);

  const student = getStudent(studentId);
  if (!student) notFound();

  const history = studentProgramHistory(student.id);
  const { personal, academic, experience, emergencyContact } = student;

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start">
        {/*
          The left column is who this student is and where they have been: the
          identity card, then the enrolment history beneath it. Both are the
          reader confirming they are on the right profile. The right column is
          the profile proper, so the history does not push the first section of
          it below the fold.
        */}
        <div className="grid gap-4">
          <StudentIdentityCard student={student} />
          <StudentProgramHistory history={history} linked={canOpenPath(principal.role, "/enrollment")} />
        </div>

        <div className="grid gap-4">
          <Section title="Personal">
            <DescriptionList
              items={[
                { label: "Name", value: `${personal.firstName} ${personal.lastName}` },
                { label: "Email", value: personal.email },
                { label: "Phone", value: personal.phone ?? "Not provided" },
                { label: "Date of birth", value: formatDate(personal.dateOfBirth) },
              ]}
            />
          </Section>

          <Section
            title="Academic"
            description={`Programme is ${academic.program}, set by enrolment rather than on this profile.`}
          >
            <DescriptionList
              items={[
                { label: "Program", value: academic.program },
                { label: "Major", value: academic.major },
                { label: "Year", value: yearLevelLabel(academic.yearLevel) },
                { label: "Skills", value: <TagList values={academic.skills} />, wide: true },
                { label: "Interests", value: <TagList values={academic.interests} />, wide: true },
                {
                  label: "Certifications",
                  value: <TagList values={academic.certifications} />,
                  wide: true,
                },
              ]}
            />
          </Section>

          <Section title="Experience" description={experience.careerGoal}>
            <div className="grid gap-4 sm:grid-cols-2">
              <ExperienceGroup title="Projects" items={experience.projects} />
              <ExperienceGroup title="Clubs" items={experience.clubs} />
              <ExperienceGroup title="Activities" items={experience.activities} />
              <ExperienceGroup title="Achievements" items={experience.achievements} />
            </div>
          </Section>

          <Section title="Emergency contact">
            {emergencyContact ? (
              <DescriptionList
                columns={3}
                items={[
                  { label: "Name", value: emergencyContact.name },
                  { label: "Relationship", value: emergencyContact.relationship },
                  { label: "Phone", value: emergencyContact.phone },
                ]}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No emergency contact recorded.</p>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}

function TagList({ values }: { values: string[] }) {
  if (values.length === 0) {
    return <span className="text-muted-foreground">None recorded</span>;
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
                <p className="text-xs text-muted-foreground">From {formatDate(item.startDate)}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
