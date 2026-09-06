import type { Metadata } from "next";
import { PageHeader, ScaffoldPlaceholder } from "@/components/shared";

export const metadata: Metadata = { title: "Evaluation form" };

export default async function Page({
  params,
}: Readonly<PageProps<"/evaluation/[evaluationId]">>) {
  const { evaluationId } = await params;

  return (
    <>
      <PageHeader title="Evaluation form" description={`Record: ${evaluationId}`} />
      <ScaffoldPlaceholder
        module="Evaluation form"
        summary="Two kinds of form share this route. A criteria form rates one subject against the seven criteria; a ranking form puts every subject in scope into an order. Both carry draft and submit states, and neither ever lists the evaluator among its subjects."
        spec="direction.md §18-20"
      />
    </>
  );
}
