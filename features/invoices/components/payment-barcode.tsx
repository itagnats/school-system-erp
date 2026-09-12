"use client";

import { encodeCode128 } from "@/lib/barcode";
import type { PaymentCode } from "@/lib/calculations";
import { cn } from "@/lib/utils";

/**
 * The counter-payment block on an invoice (direction.md §13b).
 *
 * A Code 128 symbol over the payload, then the same four fields spelled out
 * underneath. Both, deliberately: the bars are for a scanner and the table is
 * for the person at the counter when the scanner will not read a creased sheet.
 * A barcode with no human-readable fallback is a single point of failure
 * printed on paper.
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
  className,
}: Readonly<{
  code: PaymentCode;
  /** The total, already formatted with its currency. */
  amountLabel: string;
  className?: string;
}>) {
  const symbol = encodeCode128(code.payload);

  // Ten modules of quiet zone each side. Without it a scanner has no way to
  // tell where the symbol starts, and it is the most common reason a barcode
  // that looks perfect does not read.
  const quietZone = 10;

  return (
    <div className={cn("grid gap-2.5", className)}>
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
        className="text-center text-[10px] tracking-wide text-muted-foreground"
        data-numeric
      >
        {code.payload}
      </p>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
        <PaymentField label="Biller" value={code.billerId} />
        <PaymentField label="Ref 1" value={code.ref1} />
        <PaymentField label="Ref 2" value={code.ref2} />
        <PaymentField label="Amount" value={amountLabel} />
      </dl>
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
