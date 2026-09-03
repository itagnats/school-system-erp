import type { Metadata } from "next";
import { PageHeader, ScaffoldPlaceholder } from "@/components/shared";

export const metadata: Metadata = { title: "Evaluation" };

export default async function Page({ params }: PageProps<"/evaluation/[evaluationId]">) {
  const { evaluationId } = await params;

  return (
    <>
      <PageHeader title="Evaluation" description={`Record: ${evaluationId}`} />
      <ScaffoldPlaceholder
        module="Evaluation"
        summary="Criteria ratings, comments, draft and submit states."
        spec="direction.md §19"
      />
    </>
  );
}
