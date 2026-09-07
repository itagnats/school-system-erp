import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { EvaluationFormScreen } from "@/features/evaluation/components/evaluation-form-screen";
import { defaultPersona, getAssignment } from "@/server/services";

interface PageParams {
  params: Promise<{ assignmentId: string }>;
  searchParams: Promise<{ as?: string }>;
}

/**
 * Resolve the persona from `?as=`, falling back to the first one.
 *
 * A form opened without a persona still has to render something, because a
 * pasted link may drop the parameter. Falling back beats a 404 for a form that
 * exists.
 */
function resolve(assignmentId: string, personaId?: string) {
  const id = personaId ?? defaultPersona()?.id;
  return id ? getAssignment(id, assignmentId) : undefined;
}

export async function generateMetadata({
  params,
  searchParams,
}: Readonly<PageParams>): Promise<Metadata> {
  const { assignmentId } = await params;
  const { as } = await searchParams;
  const found = resolve(assignmentId, as);
  return { title: found ? found.assignment.shortName : "Evaluation form" };
}

/**
 * One assignment, of either kind (direction.md 19).
 *
 * Server-rendered: the assignment is derived from configuration and there is
 * nothing to interact with until it is on screen, so a detail page fetching its
 * own route handler over HTTP would be an extra hop for a worse first paint.
 */
export default async function Page({ params, searchParams }: Readonly<PageParams>) {
  const { assignmentId } = await params;
  const { as } = await searchParams;

  const found = resolve(assignmentId, as);
  if (!found) notFound();

  return (
    <>
      <PageHeader
        title={found.assignment.evaluationName}
        description={`${found.assignment.courseCode} · ${found.assignment.semesterCode}`}
      />
      <EvaluationFormScreen persona={found.persona} assignment={found.assignment} />
    </>
  );
}
