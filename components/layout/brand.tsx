import { SakuraMark } from "@/components/decor";
import { APP } from "@/config/app";
import { cn } from "@/lib/utils";

/**
 * The PRIME mark: a sakura blossom beside a serif wordmark in small caps.
 *
 * The blossom is the only saturated pink in the header, and the serif is the
 * one typographic flourish in the system — everything else, including all data,
 * stays on the sans.
 */
export function Brand({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <SakuraMark className="size-7 shrink-0 text-seal" />
      {showWordmark ? (
        <span className="flex flex-col leading-none">
          <span className="wordmark text-lg text-foreground">
            {APP.name}
          </span>
          <span className="mt-0.5 text-[10px] tracking-wide text-muted-foreground">
            School Management
          </span>
        </span>
      ) : (
        <span className="sr-only">{APP.fullName}</span>
      )}
    </div>
  );
}
