import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageHeader, Section, StatusBadge } from "@/components/shared";
import { APP } from "@/config/app";
import { NAV_GROUPS } from "./_components/nav-model";
import { SectionNav } from "./_components/section-nav";
import { FoundationsSection } from "./_sections/foundations";
import { OverlaysSection } from "./_sections/overlays";
import { PatternsSection } from "./_sections/patterns";
import { PrimitivesSection } from "./_sections/primitives";

export const metadata: Metadata = {
  title: "Design System",
  description: "Tokens, primitives and application patterns for PRIME.",
};

const [foundations, primitives, overlays, patterns] = NAV_GROUPS;

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
        title="How the layers fit together"
        description="A component may depend downward, never upward. This is the rule that keeps business vocabulary out of generic UI."
      >
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            "Design tokens",
            "components/ui",
            "components/shared",
            "features/*",
            "app/*",
          ].map((layer, index, all) => (
            <span key={layer} className="flex items-center gap-1.5">
              <code className="rounded-sm border border-hairline bg-surface-sunken px-1.5 py-0.5">
                {layer}
              </code>
              {index < all.length - 1 ? (
                <span aria-hidden className="text-muted-foreground">
                  →
                </span>
              ) : null}
            </span>
          ))}
        </div>
        <p className="mt-3 max-w-prose text-xs text-muted-foreground">
          A generic component that needs to know about enrollment status, cost groups
          or evaluator roles is in the wrong layer. It takes a tone, a label or a
          render prop instead, and the feature supplies the meaning.
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
        </div>
      </div>
    </>
  );
}
