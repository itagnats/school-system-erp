import Link from "next/link";
import { Section } from "@/components/shared";
import { routes } from "@/lib/constants";
import { formatCurrency, formatPercent } from "@/lib/utils";
import {
  getProgramCostSheetByTerm,
  listProgramCostSheets,
} from "@/server/services";

/**
 * The money chain, worked on a real program term at render time.
 *
 * The claim this section makes — that a derived share cannot fail to total the
 * pool — is the one the whole 2026-09-15 rebuild rests on, so it is *checked on
 * the page* rather than asserted. The reconciliation row runs the comparison
 * live; if the arithmetic ever stops holding, this section says so instead of
 * continuing to promise it.
 *
 * A guide that only describes its own rules is a document. One that re-derives
 * them in front of the reader is evidence.
 */
export function MoneySection() {
  // The busiest term, so the example has several courses and a real spread
  // rather than a two-course edge case.
  const busiest = listProgramCostSheets({
    search: "",
    page: 1,
    pageSize: 1,
    sort: "totalCost",
    direction: "desc",
  }).items[0];
  const detail = busiest ? getProgramCostSheetByTerm(busiest.programTermId) : undefined;

  if (!detail) {
    return (
      <Section id="money" title="The money chain">
        <p className="text-sm text-muted-foreground">
          No program cost sheet is available to work through.
        </p>
      </Section>
    );
  }

  const b = detail.breakdown;
  const money = (value: number) => formatCurrency(value, detail.sheet.currency);
  const shareSum = round2(b.courses.reduce((sum, c) => sum + c.indirectShare, 0));
  const totalSum = round2(b.courses.reduce((sum, c) => sum + c.totalCost, 0));
  const sharesReconcile = shareSum === round2(b.indirectTotal);
  const totalsReconcile = totalSum === round2(b.totalCost);

  return (
    <Section
      id="money"
      title="The money chain, worked live"
      description={`${detail.programCode} ${detail.semesterCode}, re-derived on every render. A course bears its direct costs; the program bears the indirect ones once and shares them by credit hours.`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-hairline text-left text-muted-foreground">
              <th scope="col" className="py-1.5 pr-2 font-normal">Course</th>
              <th scope="col" className="py-1.5 pr-2 text-right font-normal">Credits</th>
              <th scope="col" className="py-1.5 pr-2 text-right font-normal">Share</th>
              <th scope="col" className="py-1.5 pr-2 text-right font-normal">Direct</th>
              <th scope="col" className="py-1.5 pr-2 text-right font-normal">Indirect</th>
              <th scope="col" className="py-1.5 text-right font-normal">Total</th>
            </tr>
          </thead>
          <tbody>
            {b.courses.map((course) => (
              <tr key={course.courseId} className="border-b border-hairline/60">
                <td className="py-1.5 pr-2 font-medium">{course.courseCode}</td>
                <td className="py-1.5 pr-2 text-right text-muted-foreground" data-numeric>
                  {course.credits}
                </td>
                <td className="py-1.5 pr-2 text-right" data-numeric>
                  {course.sharePercent === null ? "—" : formatPercent(course.sharePercent)}
                </td>
                <td className="py-1.5 pr-2 text-right text-muted-foreground" data-numeric>
                  {money(course.directTotal)}
                </td>
                <td className="py-1.5 pr-2 text-right" data-numeric>
                  {money(course.indirectShare)}
                </td>
                <td className="py-1.5 text-right font-medium" data-numeric>
                  {money(course.totalCost)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* The check, run rather than claimed. */}
      <dl className="mt-4 grid gap-3 rounded-lg border border-hairline bg-surface-sunken p-4 sm:grid-cols-2">
        <Check
          label="Shares total the pool"
          detail={`${money(shareSum)} against ${money(b.indirectTotal)}`}
          holds={sharesReconcile}
        />
        <Check
          label="Course totals reconcile to the program"
          detail={`${money(totalSum)} against ${money(b.totalCost)}`}
          holds={totalsReconcile}
        />
      </dl>

      <p className="mt-4 text-xs text-muted-foreground">
        Neither of those is arranged. The share is derived from credit hours and
        allocated by largest remainder, so the parts sum to the pool to the
        satang — which is what makes the old model&rsquo;s failure
        unrepresentable rather than merely caught. A hand-typed percentage per
        course recovered less than the cost on 82 of 92 pools.{" "}
        <Link
          href={routes.programCost(detail.programTermId)}
          className="rounded-sm underline underline-offset-4"
        >
          Open this cost sheet
        </Link>
        .
      </p>
    </Section>
  );
}

function Check({
  label,
  detail,
  holds,
}: Readonly<{ label: string; detail: string; holds: boolean }>) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={
          holds
            ? "text-sm font-medium text-success"
            : "text-sm font-medium text-error"
        }
      >
        {/* Never color alone: the word carries the state for anyone who cannot
            see the hue, and for print. */}
        {holds ? "Holds" : "Does not hold"}
      </dd>
      <dd className="text-xs text-muted-foreground" data-numeric>
        {detail}
      </dd>
    </div>
  );
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
