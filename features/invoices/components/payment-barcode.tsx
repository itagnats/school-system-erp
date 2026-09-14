"use client";

import { encodeCode128 } from "@/lib/barcode";
import type { PaymentCode } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import type { InvoiceStamp, InvoiceStampTone } from "../constants";

/**
 * The counter-payment block on an invoice (direction.md §13b).
 *
 * A Code 128 symbol over the payload on the left, the same four fields spelled
 * out on the right. Both, deliberately: the bars are for a scanner and the
 * fields are for the person at the counter when the scanner will not read a
 * creased sheet. A barcode with no human-readable fallback is a single point of
 * failure printed on paper.
 *
 * **The symbol takes half the width.** A barcode stretched across a whole A4
 * sheet is not more scannable — a scanner reads the ratios between bar widths,
 * not their absolute size — and it reads as the most important thing on the
 * page, which on an invoice is the total. Half the width also puts the four
 * fields beside it rather than under it, which is where a bill normally has
 * them.
 *
 * The bars are drawn in module units inside a viewBox, so the symbol scales to
 * whatever width it is given without re-encoding and prints as vector rather
 * than as a scaled bitmap. `preserveAspectRatio="none"` is right here and wrong
 * almost everywhere else: a barcode carries its data in the *ratios* between
 * bar widths, which a non-uniform scale preserves, and the height is free.
 *
 * **This is a demonstration, not a payment instruction.** The biller is a
 * placeholder and no bank would accept it; the note under the block says so
 * rather than leaving a reader to find out.
 */
export function PaymentBarcode({
  code,
  amountLabel,
  stamp,
  className,
}: Readonly<{
  code: PaymentCode;
  /** The total, already formatted with its currency. */
  amountLabel: string;
  /**
   * Present when this invoice cannot be paid. The symbol is still printed —
   * the document records what was billed — but it is faded and struck through
   * with the stamp, so nothing about it invites a scan.
   */
  stamp?: InvoiceStamp;
  className?: string;
}>) {
  const symbol = encodeCode128(code.payload);

  // Ten modules of quiet zone each side. Without it a scanner has no way to
  // tell where the symbol starts, and it is the most common reason a barcode
  // that looks perfect does not read.
  const quietZone = 10;

  return (
    <div className={cn("grid items-start gap-4 sm:grid-cols-2", className)}>
      <div className="relative">
        {/* Faded under a stamp rather than hidden: a voided payment code has
            to still look like the code that was voided. */}
        <div className={stamp ? "opacity-35" : undefined}>
          <svg
            className="h-16 w-full text-foreground"
            viewBox={`${-quietZone} 0 ${symbol.modules + quietZone * 2} 40`}
            preserveAspectRatio="none"
            role="img"
            aria-label={`Counter payment barcode for ${amountLabel}. Payload ${code.payload}.`}
          >
            {symbol.bars.map((bar) => (
              <rect
                key={bar.x}
                x={bar.x}
                y={0}
                width={bar.width}
                height={40}
                fill="currentColor"
              />
            ))}
          </svg>

          <p
            aria-hidden
            className="mt-2 text-center text-[10px] tracking-wide text-muted-foreground"
            data-numeric
          >
            {code.payload}
          </p>
        </div>

        {stamp ? <Stamp stamp={stamp} /> : null}
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-1 sm:gap-y-1.5">
        <PaymentField label="Biller" value={code.billerId} />
        <PaymentField label="Ref 1" value={code.ref1} />
        <PaymentField label="Ref 2" value={code.ref2} />
        <PaymentField label="Amount" value={amountLabel} />
      </dl>
    </div>
  );
}

/**
 * Literal class strings per tone, never `border-${tone}`.
 *
 * Tailwind cannot see an interpolated class name: it compiles without an error
 * and then simply is not in the CSS, which is the design system's oldest trap.
 */
const STAMP_CLASS: Record<InvoiceStampTone, string> = {
  neutral: "border-muted-foreground/60 text-muted-foreground/80",
  success: "border-success/70 text-success/85",
  error: "border-error/70 text-error/85",
};

function Stamp({ stamp }: Readonly<{ stamp: InvoiceStamp }>) {
  return (
    // aria-hidden: the status is already announced by the badge in the
    // letterhead and stated in words under this block. A third reading would be
    // noise, and the rotation is meaningless to a screen reader anyway.
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <span
        className={cn(
          "-rotate-12 rounded-md border-2 px-4 py-1 text-xl font-bold tracking-widest uppercase",
          STAMP_CLASS[stamp.tone],
        )}
      >
        {stamp.label}
      </span>
    </div>
  );
}

function PaymentField({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="truncate text-foreground" data-numeric>
        {value}
      </dd>
    </div>
  );
}
