import "server-only";

import {
  calculateInvoiceTotals,
  canTransition,
  isBilled,
  isCollected,
  isOutstanding,
  roundMoney,
} from "@/lib/calculations";
import {
  invoiceTable,
  programTable,
  programTermTable,
  semesterTable,
  studentTable,
} from "@/server/repositories";
import { matchesSearch, paginate, sortRows, type ListQueryInput } from "@/server/query";
import type { InvoiceStatusUpdateInput } from "@/lib/api/contracts";
import type {
  Invoice,
  InvoiceDetail,
  InvoiceListItem,
  InvoicedRevenue,
  PaginatedResult,
} from "@/types";

/**
 * Invoice reads and the one write (direction.md §13b).
 *
 * This is the service the profit calculation leans on. A cost sheet answers
 * "what did this course cost" and a programme term answers "what was it
 * worth"; an invoice answers "who owes it, and have they paid" - which is the
 * difference between revenue a school can spend and revenue it can only hope
 * for.
 *
 * The totals are computed here rather than stored on the row, so a line and the
 * total it belongs to cannot drift apart.
 */

export interface InvoiceQuery extends ListQueryInput {
  status?: string;
  semester?: string;
  programId?: string;
  studentId?: string;
}

const SORTABLE: Record<string, (row: InvoiceListItem) => string | number> = {
  number: (i) => i.number,
  studentName: (i) => i.studentName,
  studentCode: (i) => i.studentCode,
  semesterCode: (i) => i.semesterCode,
  programCode: (i) => i.programCode,
  status: (i) => i.status,
  issuedOn: (i) => i.issuedOn,
  dueOn: (i) => i.dueOn,
  total: (i) => i.total,
};

/** The programme a term belongs to, for labelling. */
function programForTerm(programTermId: string) {
  const term = programTermTable.find((t) => t.id === programTermId);
  if (!term) return undefined;
  return programTable.find((p) => p.id === term.programId);
}

/**
 * Programme labels for one invoice.
 *
 * An invoice can bill more than one programme term, so the label is joined
 * rather than assumed singular. The current seed gives each student one
 * programme, but a table column that breaks the day that changes is a column
 * written against the fixtures rather than against the domain.
 */
function programLabels(invoice: Invoice): { programCode: string; programName: string } {
  const programs = invoice.programTermIds
    .map(programForTerm)
    .filter((program) => program !== undefined);

  if (programs.length === 0) return { programCode: "-", programName: "Unknown programme" };
  return {
    programCode: programs.map((p) => p.code).join(" + "),
    programName: programs.map((p) => p.name).join(" + "),
  };
}

function buildListItems(): InvoiceListItem[] {
  const studentsById = new Map(studentTable.map((student) => [student.id, student]));

  const items: InvoiceListItem[] = [];
  for (const invoice of invoiceTable) {
    const student = studentsById.get(invoice.studentId);
    if (!student) continue;

    const totals = calculateInvoiceTotals(invoice.lines);
    const { programCode, programName } = programLabels(invoice);

    items.push({
      id: invoice.id,
      number: invoice.number,
      studentId: student.id,
      studentName: `${student.personal.firstName} ${student.personal.lastName}`,
      studentCode: student.studentId,
      semesterCode: invoice.semesterCode,
      programCode,
      programName,
      status: invoice.status,
      issuedOn: invoice.issuedOn,
      dueOn: invoice.dueOn,
      currency: invoice.currency,
      subtotal: totals.subtotal,
      creditTotal: totals.creditTotal,
      total: totals.total,
    });
  }
  return items;
}

export function listInvoices(query: InvoiceQuery): PaginatedResult<InvoiceListItem> {
  const termsInProgram = query.programId
    ? new Set(
        programTermTable
          .filter((term) => term.programId === query.programId)
          .map((term) => term.id),
      )
    : undefined;
  const invoicesById = new Map(invoiceTable.map((invoice) => [invoice.id, invoice]));

  const filtered = buildListItems().filter((row) => {
    if (query.status && row.status !== query.status) return false;
    if (query.semester && row.semesterCode !== query.semester) return false;
    if (query.studentId && row.studentId !== query.studentId) return false;
    if (termsInProgram) {
      const invoice = invoicesById.get(row.id);
      if (!invoice?.programTermIds.some((id) => termsInProgram.has(id))) return false;
    }
    return matchesSearch(query.search, row.number, row.studentName, row.studentCode);
  });

  const sorted = sortRows(filtered, SORTABLE, query.sort, query.direction, "number");
  return paginate(sorted, query.page, query.pageSize);
}

export function getInvoice(invoiceId: string): InvoiceDetail | undefined {
  const invoice = invoiceTable.find((row) => row.id === invoiceId);
  if (!invoice) return undefined;
  return buildDetail(invoice);
}

function buildDetail(invoice: Invoice): InvoiceDetail | undefined {
  const student = studentTable.find((row) => row.id === invoice.studentId);
  if (!student) return undefined;

  const semester = semesterTable.find((row) => row.code === invoice.semesterCode);
  const { programCode, programName } = programLabels(invoice);

  return {
    invoice,
    totals: calculateInvoiceTotals(invoice.lines),
    studentName: `${student.personal.firstName} ${student.personal.lastName}`,
    studentCode: student.studentId,
    programCode,
    programName,
    semesterName: semester?.name ?? invoice.semesterCode,
  };
}

/** Raised as a 422 on the array key, so the form can show it. */
export interface InvoiceTransitionError {
  fieldErrors: Record<string, string>;
}

/**
 * Move an invoice to another status.
 *
 * Validated against the transition table rather than accepted as given. The
 * client only ever offers issued -> paid, but a status is exactly the kind of
 * field where a request nobody typed - a stale tab, a replayed call - arrives
 * looking perfectly well-formed. An illegal move is a 422, not a silent write.
 *
 * Nothing is stored; see docs/decisions/why-bff.md. The response carries the
 * invoice as it would be, so the screen shows the consequence rather than
 * merely acknowledging the request.
 */
export function updateInvoiceStatus(
  invoiceId: string,
  input: InvoiceStatusUpdateInput,
): InvoiceDetail | InvoiceTransitionError | undefined {
  const current = invoiceTable.find((row) => row.id === invoiceId);
  if (!current) return undefined;

  if (!canTransition(current.status, input.status)) {
    return {
      fieldErrors: {
        status: `An invoice cannot go from ${current.status} to ${input.status}.`,
      },
    };
  }

  const next: Invoice = {
    ...current,
    status: input.status,
    // A paid date is part of being paid, so it is set here rather than accepted
    // from the client. Moving away from paid clears it: a payment date on an
    // unpaid invoice is a contradiction nothing downstream would catch.
    paidOn: input.status === "paid" ? (input.paidOn ?? current.dueOn) : undefined,
  };

  return buildDetail(next);
}

export function isTransitionError(
  result: InvoiceDetail | InvoiceTransitionError,
): result is InvoiceTransitionError {
  return "fieldErrors" in result;
}

/**
 * What one programme term was billed (direction.md §13a).
 *
 * Only invoices that are actually a claim on someone count: a draft has not
 * been sent and a cancelled invoice has been withdrawn. Counting drafts would
 * let an unsent document inflate a programme's revenue, which is the same class
 * of error as counting a pending student's package price as earned.
 *
 * An invoice billing two programme terms contributes the lines belonging to
 * each, not its whole total to both. Splitting by line is what keeps two
 * programmes from each claiming the same money.
 */
export function invoicedRevenueForTerm(programTermId: string): InvoicedRevenue {
  const term = programTermTable.find((row) => row.id === programTermId);

  let revenue = 0;
  let collected = 0;
  let outstanding = 0;
  let invoiceCount = 0;
  let paidCount = 0;
  let overdueCount = 0;

  for (const invoice of invoiceTable) {
    if (!invoice.programTermIds.includes(programTermId)) continue;
    invoiceCount += 1;
    if (!isBilled(invoice.status)) continue;

    const amount = amountForTerm(invoice, programTermId, term?.courseIds ?? []);
    revenue += amount;
    if (isCollected(invoice.status)) {
      collected += amount;
      paidCount += 1;
    }
    if (isOutstanding(invoice.status)) outstanding += amount;
    if (invoice.status === "overdue") overdueCount += 1;
  }

  return {
    revenue: roundMoney(revenue),
    collected: roundMoney(collected),
    outstanding: roundMoney(outstanding),
    invoiceCount,
    paidCount,
    overdueCount,
  };
}

/**
 * The share of an invoice belonging to one programme term.
 *
 * Lines carry a course id, and a term carries its curriculum, so the split is a
 * real attribution rather than a division by the number of terms. The fee line
 * has no course, so it follows the invoice when only one term is billed and is
 * shared evenly when several are - the one place this has to approximate, and
 * it is a fee rather than a course charge.
 */
function amountForTerm(
  invoice: Invoice,
  programTermId: string,
  courseIds: readonly string[],
): number {
  if (invoice.programTermIds.length <= 1) {
    return calculateInvoiceTotals(invoice.lines).total;
  }

  const curriculum = new Set(courseIds);
  let total = 0;
  let feeTotal = 0;

  for (const line of invoice.lines) {
    if (line.kind === "fee") {
      feeTotal += line.amount;
      continue;
    }
    if (line.courseId && curriculum.has(line.courseId)) total += line.amount;
  }

  return total + feeTotal / invoice.programTermIds.length;
}

/** Semester options for the invoice filter bar. */
export function invoiceSemesterOptions(): { value: string; label: string }[] {
  return [...new Set(invoiceTable.map((invoice) => invoice.semesterCode))]
    .sort()
    .map((code) => ({ value: code, label: code }));
}
