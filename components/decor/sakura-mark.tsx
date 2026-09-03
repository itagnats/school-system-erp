import { cn } from "@/lib/utils";

/**
 * A five-petal cherry blossom, drawn once and reused at every size.
 *
 * `currentColor` throughout, so the caller decides whether this is the brand
 * mark (`text-seal`) or a faint background petal (`text-blossom`). The notch at
 * each petal tip is what makes it read as sakura rather than as a generic
 * flower.
 */
export function SakuraMark({
  className,
  /** Decorative by default; pass a title to expose it to assistive tech. */
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("size-4", className)}
      fill="none"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {[0, 72, 144, 216, 288].map((angle) => (
        <path
          key={angle}
          transform={`rotate(${angle} 24 24)`}
          fill="currentColor"
          // One petal: a rounded lobe rising from the centre with a small
          // notch cut into its tip.
          d="M24 24C18.4 22.4 14.6 17.6 15.6 12.4 16.5 7.7 20 4.6 24 3.2c-1.1 2.6-1.4 4.6-.9 6.2.4-.9 1-1.6 1.8-2.2-.3 1.6 0 3 .9 4.3 1.6 2.3 2.6 4.6 2.6 6.9 0 2.4-1.6 4.3-4.4 5.6Z"
        />
      ))}
      <circle cx="24" cy="24" r="3.1" fill="currentColor" opacity="0.55" />
    </svg>
  );
}
