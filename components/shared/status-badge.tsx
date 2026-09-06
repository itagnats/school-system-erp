import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { StatusTone } from "@/types";

/**
 * Status indicator.
 *
 * This component knows about tones, not about domains. Each feature maps its own
 * status union onto a tone and a label in its own constants file, which is what
 * keeps enrollment, cost and evaluation vocabulary out of a shared component
 * (direction.md §29).
 *
 * The dot is not decoration: tone alone would carry the meaning in color only,
 * so the label always states the status in words.
 */
const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border-transparent bg-neutral-soft text-neutral-soft-foreground",
        info: "border-transparent bg-info-soft text-info-soft-foreground",
        success: "border-transparent bg-success-soft text-success-soft-foreground",
        warning: "border-transparent bg-warning-soft text-warning-soft-foreground",
        error: "border-transparent bg-error-soft text-error-soft-foreground",
        accent: "border-transparent bg-accent text-accent-foreground",
      },
      variant: {
        soft: "",
        outline: "bg-transparent",
      },
    },
    compoundVariants: [
      { variant: "outline", tone: "neutral", className: "border-hairline-strong text-muted-foreground" },
      { variant: "outline", tone: "info", className: "border-info/40 text-info" },
      { variant: "outline", tone: "success", className: "border-success/40 text-success" },
      { variant: "outline", tone: "warning", className: "border-warning/40 text-warning" },
      { variant: "outline", tone: "error", className: "border-error/40 text-error" },
      { variant: "outline", tone: "accent", className: "border-primary/40 text-primary-strong" },
    ],
    defaultVariants: { tone: "neutral", variant: "soft" },
  },
);

const DOT_TONE: Record<StatusTone, string> = {
  neutral: "bg-hai-400",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
  accent: "bg-primary",
};

export function StatusBadge({
  label,
  tone = "neutral",
  variant = "soft",
  showDot = true,
  className,
}: {
  label: string;
  showDot?: boolean;
  className?: string;
} & VariantProps<typeof statusBadgeVariants>) {
  return (
    <span className={cn(statusBadgeVariants({ tone, variant }), className)}>
      {showDot ? (
        <span
          aria-hidden
          className={cn("size-1.5 shrink-0 rounded-full", DOT_TONE[tone ?? "neutral"])}
        />
      ) : null}
      {label}
    </span>
  );
}

export { statusBadgeVariants };
