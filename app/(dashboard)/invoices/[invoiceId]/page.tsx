import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { InvoiceDocument } from "@/features/invoices/components/invoice-document";
import { routes } from "@/lib/constants";
import { getInvoice } from "@/server/services";

interface PageParams {
  params: Promise<{ invoiceId: string }>;
}

export async function generateMetadata({ params }: Readonly<PageParams>): Promise<Metadata> {
  const { invoiceId } = await params;
  const detail = getInvoice(invoiceId);
  return { title: detail ? detail.invoice.number : "Invoice" };
}

/**
 * One invoice (direction.md §13b).
 *
 * A server component reading the service directly — no HTTP hop for data it can
 * already reach. The document below is a client component only so the one
 * status transition can be made, and it opens with the server-rendered figures
 * rather than a spinner.
 */
export default async function Page({ params }: Readonly<PageParams>) {
  const { invoiceId } = await params;
  const detail = getInvoice(invoiceId);
  if (!detail) notFound();

  return (
    <>
      {/* The sheet below carries its own letterhead, number and party details,
          so on paper this header is a second copy of all three. Hidden rather
          than removed: on screen it is what puts the invoice in the breadcrumb
          trail and links back to the student. */}
      <div data-print="hide">
        <PageHeader
          title={detail.invoice.number}
          description={`${detail.semesterName} · ${detail.programName}`}
          meta={
            <Link
              href={routes.student(detail.invoice.studentId)}
              className="rounded-sm text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              {detail.studentCode} · {detail.studentName}
            </Link>
          }
        />
      </div>
      <InvoiceDocument initial={detail} />
    </>
  );
}
