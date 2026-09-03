import { cn } from "@/lib/utils";
import { SakuraMark } from "./sakura-mark";

/**
 * The decorative layer.
 *
 * Everything here is `aria-hidden`, `pointer-events-none` and tagged
 * `data-decor`, which is what the print rule in globals.css strips — petals do
 * not belong on a student report. Decoration must never be the only thing
 * carrying a meaning, so nothing in this file takes content.
 */

/** One petal cluster, tucked into a corner of a panel or a page. */
export function PetalCorner({
  corner = "top-right",
  className,
}: {
  corner?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  className?: string;
}) {
  const place = {
    "top-left": "top-0 left-0 -translate-x-1/3 -translate-y-1/3",
    "top-right": "top-0 right-0 translate-x-1/3 -translate-y-1/3",
    "bottom-left": "bottom-0 left-0 -translate-x-1/3 translate-y-1/3",
    "bottom-right": "bottom-0 right-0 translate-x-1/3 translate-y-1/3",
  }[corner];

  return (
    <span
      data-decor
      aria-hidden
      className={cn(
        "pointer-events-none absolute text-blossom select-none",
        place,
        className,
      )}
    >
      <span className="relative block size-16">
        <SakuraMark className="absolute top-0 left-4 size-7 opacity-45" />
        <SakuraMark className="absolute top-6 left-0 size-5 opacity-30" />
        <SakuraMark className="absolute top-8 left-9 size-4 opacity-25" />
      </span>
    </span>
  );
}

/**
 * The page-level wash: a soft pink gradient in the lower corners with a few
 * drifting petals. Sits behind everything in the shell.
 */
export function PetalField({ className }: { className?: string }) {
  return (
    <div
      data-decor
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none",
        className,
      )}
    >
      {/* Two gradient blooms, bottom corners, kept very low contrast so text
          over them never loses its ratio. */}
      <div
        className="absolute -bottom-40 -left-32 size-[34rem] rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at center, var(--wash-from), var(--wash-to) 55%, transparent 72%)",
        }}
      />
      <div
        className="absolute -right-40 -bottom-56 size-[42rem] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at center, var(--wash-from), var(--wash-to) 60%, transparent 75%)",
        }}
      />

      {/* Drifting petals. Positions are fixed rather than random so the layout
          is identical on the server and the client. */}
      <div className="absolute inset-0 text-blossom">
        <SakuraMark className="absolute top-[12%] right-[6%] size-6 opacity-25" />
        <SakuraMark className="absolute top-[38%] right-[14%] size-4 opacity-20" />
        <SakuraMark className="absolute top-[64%] left-[8%] size-5 opacity-20" />
        <SakuraMark className="absolute bottom-[8%] left-[28%] size-8 opacity-25" />
        <SakuraMark className="absolute bottom-[18%] right-[22%] size-5 opacity-20" />
      </div>
    </div>
  );
}
