import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Section } from "@/components/shared";
import { APP } from "@/config/app";
import { routes } from "@/lib/constants";
import { DomainTreeSection } from "./_sections/domain-tree";
import { MoneySection } from "./_sections/money";
import { RulesSection } from "./_sections/rules";
import { ShapeSection } from "./_sections/shape";
import { StructureSection } from "./_sections/structure";

export const metadata: Metadata = {
  title: "System Guide",
  description: "How PRIME is put together, derived from the running system.",
};

/**
 * How the system works (direction.md §3).
 *
 * The companion to `/design-system`: that page documents how PRIME *looks* by
 * rendering the real tokens and components, and this one documents how it
 * *behaves* by re-deriving the real figures. Both follow the same discipline,
 * which is the only reason either can be trusted — **it demonstrates, it does
 * not restate.**
 *
 * The counts come from the list services, the worked money example is computed
 * by the same calculation the cost screens use, and the route map is read from
 * the config the sidebar reads. Only two things on the page are prose: the
 * layering diagram, which is a rule about what may import what rather than a
 * fact, and the rules list, which is capped at a sentence each and names the
 * file that enforces every entry.
 *
 * Five documents under `docs/` carried stale counts on 2026-09-16. This page is
 * built so that it cannot join them.
 *
 * A server component throughout: none of it is interactive, and shipping the
 * whole dataset to the browser to render figures the server has already
 * computed would be the opposite of the point.
 */
export default function Page() {
  return (
    <>
      <PageHeader
        title="System guide"
        description={`How ${APP.name} is put together — the chains, the rules that hold them, and the arithmetic, re-derived on every render.`}
      />

      <Section title="What this is" description="And what it deliberately is not.">
        <div className="max-w-prose space-y-3 text-sm text-foreground">
          <p>
            Three chains run through {APP.name}. <strong>People</strong> — a
            student joins a program term and the course enrollments follow from
            its curriculum. <strong>Money</strong> — each course is costed, the
            program shares its indirect costs across them, and an invoice says
            who owes for it. <strong>Judgment</strong> — a cohort is grouped,
            assessed from four directions, and scored.
          </p>
          <p>
            They meet twice: cost per student joins the course chain to the
            program&rsquo;s profitability, and the curriculum joins the
            program to the invoice that bills it.
          </p>
          <p className="text-muted-foreground">
            This page demonstrates rather than restates. Every number below is
            computed when the page renders — from the services, not from a
            document — so it cannot describe a system that no longer exists. For
            how it looks rather than how it works, see the{" "}
            <Link
              href={routes.designSystem()}
              className="rounded-sm underline underline-offset-4"
            >
              design system
            </Link>
            .
          </p>
        </div>
      </Section>

      <div className="mt-4 grid gap-4">
        <ShapeSection />
        <DomainTreeSection />
        <MoneySection />
        <RulesSection />
        <StructureSection />
      </div>
    </>
  );
}
