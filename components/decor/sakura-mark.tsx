import { cn } from "@/lib/utils";

/**
 * A five-petal cherry blossom, drawn once and reused at every size.
 *
 * `currentColor` throughout, so the caller decides whether this is the brand
 * mark (`text-seal`) or a faint background petal (`text-blossom`).
 *
 * Two variants:
 *
 *   seal   flat, one color, a notch at each petal tip. Reads at 16px, which
 *          is what a mark used in a sidebar and a page header has to do.
 *   bloom  a fuller blossom with an outlined petal and a stamen. More flower,
 *          less mark — it wants size to be worth the detail.
 *
 * Both keep the single-color contract. `bloom` gets its depth from alpha
 * rather than from a second hex, so `text-seal`, `text-blossom` and dark mode
 * all keep working; a hardcoded pink would freeze the mark to the light theme.
 */

/** The `seal` petal: a rounded lobe rising from the center, notched at the tip. */
const SEAL_PETAL =
  "M24 24C18.4 22.4 14.6 17.6 15.6 12.4 16.5 7.7 20 4.6 24 3.2c-1.1 2.6-1.4 4.6-.9 6.2.4-.9 1-1.6 1.8-2.2-.3 1.6 0 3 .9 4.3 1.6 2.3 2.6 4.6 2.6 6.9 0 2.4-1.6 4.3-4.4 5.6Z";

/** The `bloom` petal: a broad leaf sweeping out from the center. */
const BLOOM_PETAL = "M50 50 C70 35, 75 45, 88 40 C75 55, 70 50, 50 50";

const ANGLES = [0, 72, 144, 216, 288];

export function SakuraMark({
  className,
  variant = "seal",
  /** Decorative by default; pass a title to expose it to assistive tech. */
  title,
}: {
  className?: string;
  variant?: "seal" | "bloom";
  title?: string;
}) {
  const a11y = {
    role: title ? ("img" as const) : ("presentation" as const),
    "aria-hidden": title ? undefined : true,
    "aria-label": title,
  };

  if (variant === "bloom") {
    return (
      <svg viewBox="0 0 100 100" className={cn("size-4", className)} fill="none" {...a11y}>
        {/* The petal points right at 0deg, so the whole flower is turned a
            quarter turn to stand one petal upright — the same orientation the
            seal variant has. */}
        <g transform="rotate(-90 50 50)">
          {ANGLES.map((angle) => (
            <path
              key={angle}
              d={BLOOM_PETAL}
              transform={`rotate(${angle} 50 50)`}
              fill="currentColor"
              fillOpacity="0.42"
              stroke="currentColor"
              strokeOpacity="0.85"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          ))}
        </g>
        {/* Stamen. Filaments are drawn first so the disc covers where they
            leave the center, which is what makes them read as radiating. */}
        <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <line x1="50" y1="50" x2="47" y2="41" />
          <line x1="50" y1="50" x2="55" y2="42" />
          <line x1="50" y1="50" x2="59" y2="50" />
          <line x1="50" y1="50" x2="53" y2="58" />
          <line x1="50" y1="50" x2="44" y2="55" />
        </g>
        <circle cx="50" cy="50" r="4" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" className={cn("size-4", className)} fill="none" {...a11y}>
      {ANGLES.map((angle) => (
        <path
          key={angle}
          d={SEAL_PETAL}
          transform={`rotate(${angle} 24 24)`}
          fill="currentColor"
        />
      ))}
      <circle cx="24" cy="24" r="3.1" fill="currentColor" opacity="0.55" />
    </svg>
  );
}
