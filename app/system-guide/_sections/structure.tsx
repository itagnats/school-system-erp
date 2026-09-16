import Link from "next/link";
import { Section } from "@/components/shared";
import { NAVIGATION } from "@/config/navigation";

/**
 * How the code is arranged, and where every destination is.
 *
 * The route map is read from `config/navigation.ts` — the same file the
 * sidebar, the mobile drawer and the breadcrumbs read — so a route added to the
 * product appears here without anyone remembering to add it. That is the
 * difference between documentation and a second list.
 *
 * The layering diagram is hand-drawn, because it is a rule about what *may*
 * import what rather than a fact about what currently does. It is the one thing
 * on this page that is a claim, and it is claimed deliberately.
 */
export function StructureSection() {
  return (
    <>
      <Section
        id="layering"
        title="How the code is layered"
        description="A module may depend downward and never upward. Business rules live in features and nowhere above them."
      >
        <pre className="overflow-x-auto rounded-lg border border-hairline bg-surface-sunken p-4 text-xs leading-relaxed text-foreground">
{`Design tokens
  → components/ui          generic primitives, no domain vocabulary
  → components/decor       the petal layer; inert, and stripped in print
  → components/data-viz    the only place recharts is imported
  → components/shared      application patterns, still no business rules
  → features/*             business rules live here
  → app/*                  routing and composition only

data/mock → data/seed → server/repositories → server/services → app/api
                                                      ↘ server components
features/*/services → features/*/hooks → components`}
        </pre>
        <p className="mt-3 max-w-prose text-xs text-muted-foreground">
          An interactive list screen goes out through the API so filtering,
          sorting and pagination happen server-side. A detail or report screen
          calls the service directly — fetching your own route handler over HTTP
          is a hop for data the process already has. Both paths end at the same
          function, which is what makes the split safe.
        </p>
      </Section>

      <Section
        id="routes"
        title="Every destination, as a tree"
        description="Read from config/navigation.ts and nested by href, so a route that lives under another appears under it. The same file the sidebar and the breadcrumbs read, which is why this cannot drift from the product."
        className="mt-4"
        flush
      >
        <ul className="divide-y divide-hairline">
          {NAVIGATION.map((group, index) => (
            <li key={group.label ?? `group-${index}`} className="px-3.5 py-3">
              <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                {group.label ?? "Top level"}
              </p>
              <ul className="mt-1.5 space-y-1">
                {group.items.map((item) => (
                  <li
                    key={item.href}
                    className="text-xs"
                    // Depth is derived from the href itself: /costs/courses sits
                    // under /costs because it is under it, not because a list
                    // somewhere says so.
                    style={{ paddingLeft: `${depthOf(item.href, group.items.map((i) => i.href)) * 1.25}rem` }}
                  >
                    <Link
                      href={item.href}
                      className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      {item.label}
                    </Link>
                    <span className="ml-1.5 text-muted-foreground" data-numeric>
                      {item.href}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}

/**
 * How deep an href sits, counted as the number of siblings it lives inside.
 *
 * Derived rather than declared: `/costs/courses` is under `/costs` because the
 * string says so. A hand-kept parent field would be one more thing to forget.
 */
function depthOf(href: string, siblings: readonly string[]): number {
  return siblings.filter((other) => other !== href && href.startsWith(`${other}/`)).length;
}
