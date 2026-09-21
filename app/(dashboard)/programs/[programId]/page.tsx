import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { ProgramPanel } from "@/features/programs/components/program-panel";
import { getProgramDetail, semesterCodeOptions } from "@/server/services";

interface PageParams {
  params: Promise<{ programId: string }>;
}

export async function generateMetadata({ params }: Readonly<PageParams>): Promise<Metadata> {
  const { programId } = await params;
  const detail = getProgramDetail(programId);
  return { title: detail ? detail.program.code : "Program" };
}

/**
 * One program and its terms (direction.md §4a, added 2026-09-21).
 *
 * The level the Curriculum module never had. `/programs` listed terms, so
 * there was no page that answered "what is BSC-IT" and no place to add a
 * second semester to a program that already exists.
 *
 * The semester list comes from `semesterCodeOptions` rather than
 * `courseSemesterOptions`: the latter derives from what courses are already
 * offered in, so a semester created today would be missing from the picker
 * and the dead end `AUD-035` describes would reappear one dropdown later.
 */
export default async function Page({ params }: Readonly<PageParams>) {
  const { programId } = await params;
  const detail = getProgramDetail(programId);
  if (!detail) notFound();

  return (
    <>
      <PageHeader
        title={`${detail.program.code} - ${detail.program.name}`}
        description={detail.program.credential}
      />
      <ProgramPanel initial={detail} semesterOptions={semesterCodeOptions()} />
    </>
  );
}
