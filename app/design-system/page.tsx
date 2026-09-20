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

      {/* Each group states what it is for directly above itself, in the blurb
          the nav already carries, so this panel says only the thing no group
          heading can: what is deliberately absent. */}
      <Section
        className="mb-6"
        title="How to read this page"
        description="One document rather than tabs, so every component is on screen and in the server-rendered HTML. Each heading is linkable, and every group says what it is for directly above itself."
      >
        <p className="max-w-prose text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Not here: feature screens.</span>{" "}
          Those live in <code>features/*</code> and read real data. A permanent fake one
          in the design system is a component that exists only for the showcase, and it
          drifts from the real thing without anything noticing — which is what happened
          to the rating scale and the card-tone swatches before they were replaced with
          the live components on 2026-09-20.
        </p>
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
