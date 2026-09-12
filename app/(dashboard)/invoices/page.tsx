import type { Metadata } from "next";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/feedback";
import { PageHeader } from "@/components/shared";
import { InvoicesScreen } from "@/features/invoices/components/invoices-screen";
import { INVOICE_GRAIN_NOTE } from "@/features/invoices/constants";
import { invoiceSemesterOptions, programFilterOptions } from "@/server/services";

export const metadata: Metadata = { title: "Invoices" };

/**
 * The invoice list (direction.md §13b).
 *
 * The list screen reads its state from the URL through `useSearchParams`, which
 * a statically prerendered page cannot resolve at build time. The Suspense
 * boundary is what lets the shell prerender while the table waits for the real
 * search params on the client - and the fallback doubles as the loading state.
 */
export default function Page() {
  return (
    <>
      <PageHeader title="Invoices" description={INVOICE_GRAIN_NOTE} />
      <Suspense fallback={<TableSkeleton columns={7} />}>
        <InvoicesScreen
          programOptions={programFilterOptions()}
          semesterOptions={invoiceSemesterOptions()}
        />
      </Suspense>
    </>
  );
}
