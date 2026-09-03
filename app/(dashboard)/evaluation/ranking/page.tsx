import type { Metadata } from "next";
import { PageHeader, ScaffoldPlaceholder } from "@/components/shared";

export const metadata: Metadata = { title: "Ranking" };

export default function Page() {
  return (
    <>
      <PageHeader title="Ranking" description="Students ranked by final evaluation score, within a stated scope." />
      <ScaffoldPlaceholder
        module="Ranking"
        summary="Group and course-semester ranking with explicit scope."
        spec="direction.md §21-22"
      />
    </>
  );
}
