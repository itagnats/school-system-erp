import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { EvaluationSetupScreen } from "@/features/evaluation/components/evaluation-setup-screen";
import { getEvaluationSetup } from "@/server/services";

interface PageParams {
  params: Promise<{ setupId: string }>;
}

export async function generateMetadata({ params }: Readonly<PageParams>): Promise<Metadata> {
  const { setupId } = await params;
  const detail = getEvaluationSetup(setupId);
  return { title: detail ? detail.setup.shortName : "Evaluation setup" };
}

/**
 * One evaluation, configured.
 *
 * Server-rendered from the service - there is nothing to interact with until
 * the settings are on screen, so a detail page fetching its own route handler
 * over HTTP would be an extra hop for a worse first paint. The panel below
 * becomes interactive for the settings that change what the score means.
 */
export default async function Page({ params }: Readonly<PageParams>) {
  const { setupId } = await params;
  const detail = getEvaluationSetup(setupId);
  if (!detail) notFound();

  return (
    <>
      <PageHeader
        title={detail.setup.name}
        description={`${detail.courseCode} ${detail.courseName} · ${detail.setup.semesterCode}`}
      />
      <EvaluationSetupScreen initial={detail} />
    </>
  );
}
