import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DescriptionList, PageHeader, Section, StatusBadge } from "@/components/shared";
import {
  SEMESTER_STATUS_LABEL,
  SEMESTER_STATUS_TONE,
} from "@/features/semesters/constants";
import { formatDate } from "@/lib/utils";
import { getSemester } from "@/server/services";

interface PageParams {
  params: Promise<{ semesterId: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { semesterId } = await params;
  const semester = getSemester(semesterId);
  return { title: semester ? semester.name : "Semester" };
}

export default async function Page({ params }: PageParams) {
  const { semesterId } = await params;
  const semester = getSemester(semesterId);
  if (!semester) notFound();

  return (
    <>
      <PageHeader
        title={semester.name}
        description={`Term ${semester.term} of academic year ${semester.academicYear}.`}
        meta={
          <StatusBadge
            tone={SEMESTER_STATUS_TONE[semester.status]}
            label={SEMESTER_STATUS_LABEL[semester.status]}
          />
        }
      />

      <Section title="Details">
        <DescriptionList
          items={[
            { label: "Code", value: semester.code },
            { label: "Academic year", value: semester.academicYear },
            { label: "Starts", value: formatDate(semester.startDate) },
            { label: "Ends", value: formatDate(semester.endDate) },
            { label: "Enrollments", value: semester.enrollmentCount },
          ]}
        />
      </Section>
    </>
  );
}
