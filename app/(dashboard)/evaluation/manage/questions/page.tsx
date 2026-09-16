import type { Metadata } from "next";
import { PageHeader } from "@/components/shared";
import { QuestionBankScreen } from "@/features/question-bank/components/question-bank-screen";

export const metadata: Metadata = {
  title: "Question bank",
};

/**
 * The question bank (direction.md §18a).
 *
 * A client screen over `/api/questions`, because it searches and filters — the
 * same split every maintenance screen in PRIME makes. It sits under Manage
 * Evaluation rather than beside the cost catalogue: the two are the same kind
 * of master data and belong to different people, and filing this one by
 * mechanism would put it where nobody who writes questions would look.
 */
export default function Page() {
  return (
    <>
      <PageHeader
        title="Question bank"
        description="The questions evaluators are asked. Maintained once here, copied onto each evaluation that uses them."
      />
      <QuestionBankScreen />
    </>
  );
}
