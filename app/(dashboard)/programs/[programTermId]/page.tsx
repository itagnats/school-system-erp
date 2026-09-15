import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { ProgramCostPanel } from "@/features/costs/components/program-cost-panel";
import { ProgramTermPanel } from "@/features/programs/components/program-term-panel";
import { AddStudentDialog } from "@/features/enrollment/components/add-student-dialog";
import {
  courseSemesterOptions,
  getProgramCostSheetByTerm,
  getProgramTerm,
  openProgramTermOptions,
} from "@/server/services";

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
 *
 * **This is where a student is enrolled** (direction.md §7a, decided
 * 2026-09-15). Enrolment is entered at the programme level, so the act belongs
 * on the page that already knows which programme term is meant — the dialog
 * then states the term rather than asking for it. The roster below is the list
 * it adds to.
 *
 * The dialog is composed here rather than inside `ProgramTermPanel` because
 * that panel belongs to `features/programs/` and this dialog to
 * `features/enrollment/`. Joining two features is `app/*`'s job; doing it
 * inside one of them would be a third cross-feature import while `AUD-012` is
 * still open.
 */
export default async function Page({ params }: Readonly<PageParams>) {
  const { programTermId } = await params;
  const detail = getProgramTerm(programTermId);
  if (!detail) notFound();
  // Read here rather than inside the panel so the page decides what it shows:
  // a term with no cost sheet renders the rest of itself rather than an error.
  const costing = getProgramCostSheetByTerm(programTermId);
  // Present only while the term is open. A planning or closed term would have
  // the button refused by the server, and an action that cannot succeed is
  // worse than no action.
  const enrollable = openProgramTermOptions().find((term) => term.id === programTermId);

  return (
    <>
      <PageHeader
        title={`${detail.program.code} - ${detail.term.semesterCode}`}
        description={`${detail.program.name}. ${detail.program.credential}.`}
        actions={
          enrollable ? (
            <AddStudentDialog
              terms={[enrollable]}
              semesterOptions={courseSemesterOptions()}
              defaultTermId={enrollable.id}
            />
          ) : null
        }
      />
      <ProgramTermPanel initial={detail} />
      {costing ? <ProgramCostPanel detail={costing} /> : null}
    </>
  );
}
