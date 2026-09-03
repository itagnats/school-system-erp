import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageHeader, Section, StatusBadge } from "@/components/shared";
import { APP } from "@/config/app";
import { NAV_GROUPS } from "./_components/nav-model";
import { SectionNav } from "./_components/section-nav";
import { AccessibilitySection } from "./_sections/accessibility";
import { CompositionsSection } from "./_sections/compositions";
import { FoundationsSection } from "./_sections/foundations";
import { MotionSection } from "./_sections/motion";
import { OverlaysSection } from "./_sections/overlays";
import { PatternsSection } from "./_sections/patterns";
import { PrimitivesSection } from "./_sections/primitives";
import { StatesSection } from "./_sections/states";

export const metadata: Metadata = {
  title: "Design System",
  description: "Tokens, primitives and application patterns for PRIME.",
};

const [foundations, primitives, overlays, patterns, states, compositions] =
  NAV_GROUPS;

/**
 * A heading for one group of sections. It is the anchor the nav links to and
 * the only place a group explains itself.
 */
function GroupHeading({ id, label, blurb }: { id: string; label: string; blurb: string }) {
  return (
    <div id={id} className="scroll-mt-[calc(var(--header-h)+1rem)] hairline-b pb-2">
      <h2 className="text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </h2>
      <p className="mt-1 max-w-prose text-sm text-foreground">{blurb}</p>
    </div>
  );
}

function Group({
  group,
  children,
}: {
  group: (typeof NAV_GROUPS)[number];
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col" style={{ gap: "var(--section-gap)" }}>
      <GroupHeading id={group.id} label={group.label} blurb={group.blurb} />
      {children}
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <>
      <PageHeader
        title="Design System"
        bloom
        description="The token layer, the primitives built on it, and the application patterns feature modules are assembled from. Everything here is live: switch the theme in the header and this page follows."
        meta={
          <>
            <StatusBadge tone="accent" label="Sakura 桜" showDot={false} />
            <StatusBadge tone="neutral" label="Comfortable density" showDot={false} />
            <StatusBadge tone="neutral" label={`v${APP.version}`} showDot={false} />
          </>
        }
      />

      <Section
        className="mb-6"
        title="How to read this page"
        description="One document rather than tabs, so every component is on screen and in the server-rendered HTML. Each heading is linkable."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              group: "Foundations",
              detail:
                "Tokens, and the two things made out of them that are easy to treat as afterthoughts: motion and accessibility.",
            },
            {
              group: "Primitives & Overlays",
              detail:
                "components/ui. Generic, no domain vocabulary. Overlays are the only surfaces allowed a shadow.",
            },
            {
              group: "Patterns",
              detail:
                "components/shared. Reusable application patterns, still free of business rules.",
            },
            {
              group: "States",
              detail:
                "Every condition a control can be in, in one place, so two components never disagree about what disabled looks like.",
            },
            {
              group: "Compositions",
              detail:
                "How the parts assemble into screens, plus the layer diagram and the chart rules.",
            },
            {
              group: "Not here",
              detail:
                "Feature screens. Those live in features/* and read real data; a permanent fake one in the design system is a component that exists only for the showcase.",
            },
          ].map((item) => (
            <div key={item.group}>
              <p className="text-xs font-medium text-foreground">{item.group}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* One document, not tabs: every component is on screen and in the
          server-rendered HTML, and the nav is how you get around it. */}
      <div className="lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-6">
        <aside className="hidden lg:block">
          <SectionNav />
        </aside>

        <div className="flex min-w-0 flex-col gap-10">
          <Group group={foundations}>
            <FoundationsSection />
            <MotionSection />
            <AccessibilitySection />
          </Group>
          <Group group={primitives}>
            <PrimitivesSection />
          </Group>
          <Group group={overlays}>
            <OverlaysSection />
          </Group>
          <Group group={patterns}>
            <PatternsSection />
          </Group>
          <Group group={states}>
            <StatesSection />
          </Group>
          <Group group={compositions}>
            <CompositionsSection />
          </Group>
        </div>
      </div>
    </>
  );
}
