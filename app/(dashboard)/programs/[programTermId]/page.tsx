import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { ProgramTermPanel } from "@/features/programs/components/program-term-panel";
import { getProgramTerm } from "@/server/services";

interface PageParams {
  params: Promise<{ programTermId: string }>;
}

export async function generateMetadata({ params }: Readonly<PageParams>): Promise<Metadata> {
  const { programTermId } = await params;
  const detail = getProgramTerm(programTermId);
  return {
    title: detail ? `${detail.program.code} ${detail.term.semesterCode}` : "Programme term",
  };
}

/**
 * Programme term detail: curriculum, money and roster.
 *
 * Server-rendered from the service, with an interactive panel below it so the
 * package price can be moved and the margin recomputed. The first paint is
 * complete rather than a spinner.
 */
export default async function Page({ params }: Readonly<PageParams>) {
  const { programTermId } = await params;
  const detail = getProgramTerm(programTermId);
  if (!detail) notFound();

  return (
    <>
      <PageHeader
        title={`${detail.program.code} - ${detail.term.semesterCode}`}
        description={`${detail.program.name}. ${detail.program.credential}.`}
      />
      <ProgramTermPanel initial={detail} />
    </>
  );
}
