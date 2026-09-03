import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2Icon } from "lucide-react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        // PRIME override: a destructive confirmation reads as solid, not tinted.
        // The tinted treatment moves to `destructive-soft` for inline row
        // actions where a solid red button would shout.
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        "destructive-soft":
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /**
     * Pending state for an action in flight.
     *
     * Prepends a spinner and disables the button, so a mutation cannot be
     * submitted twice by an impatient double-click. The label stays visible on
     * purpose: swapping it for a spinner makes the button change width and
     * loses the only description of what is actually happening.
     *
     * Ignored when `asChild` is set — a slot takes exactly one child, so there
     * is nowhere to put the spinner and no native `disabled` to rely on. Wrap
     * the child in its own pending treatment in that case.
     */
    loading?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"
  const pending = loading && !asChild

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
      // After the spread so that `loading` wins over a stale `disabled={false}`
      // from the caller. A pending action must not stay clickable.
      data-loading={pending || undefined}
      aria-busy={pending || undefined}
      disabled={asChild ? props.disabled : props.disabled || loading}
    >
      {/* A slot takes exactly ONE child, and it counts a `null` sibling as a
          second one, so the asChild branch must hand `children` straight
          through rather than wrapping it. Getting this wrong fails at
          prerender, not at typecheck. */}
      {asChild ? (
        children
      ) : (
        <>
          {pending ? (
            // data-motion marks this as essential: the reduced-motion rule in
            // globals.css stops every other animation, but a frozen spinner
            // reads as a hung request rather than a respected preference.
            <Loader2Icon
              className="animate-spin"
              data-motion="essential"
              aria-hidden="true"
            />
          ) : null}
          {children}
        </>
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
