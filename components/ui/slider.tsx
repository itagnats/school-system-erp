"use client"

import * as React from "react"
import { Slider as SliderPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * A value picked by dragging along a track.
 *
 * Reach for it when the *position* of a value in a range is the point - a
 * rating on a scale, an allocation, a threshold. Reach for `RadioGroup` instead
 * when the options are named things rather than points on a line, and for
 * `Input type="number"` when someone needs to type an exact figure.
 *
 * Radix supplies the behavior that makes a slider usable without a mouse:
 * arrow keys step, Home and End jump to the ends, and Page Up and Page Down
 * move in larger increments. None of that has to be built here, which is most
 * of the reason to wrap the primitive rather than a native `input type=range` -
 * that element cannot be styled consistently across browsers without
 * appearance hacks the token layer would not reach.
 *
 * The track is `bg-input` rather than `bg-surface-sunken`: this is a control,
 * and controls take the input ground so a slider and a text field read as the
 * same family. The thumb takes `bg-background` with a `--primary` border, which
 * is what keeps it visible against a filled range on both themes.
 */
function Slider({
  className,
  thumbProps,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
  /**
   * Forwarded to every thumb.
   *
   * Exists mainly for `aria-valuetext`. Radix puts `role="slider"` and
   * `aria-valuenow` on the thumb, so a screen reader announces the bare number
   * - "4" - and a scale where 4 means "Very good" has lost the half that
   * matters. Without a way through to the thumb there is nowhere to say it.
   */
  thumbProps?: React.ComponentProps<typeof SliderPrimitive.Thumb>
}) {
  const thumbCount = resolveThumbCount(props)

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        "relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-[orientation=vertical]:h-40 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative grow overflow-hidden rounded-full bg-input data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute rounded-full bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
        />
      </SliderPrimitive.Track>

      {/* One thumb per value. Rendering a fixed single thumb would silently
          drop the second handle of a range, which is a supported Radix use. */}
      {Array.from({ length: thumbCount }, (_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          data-slot="slider-thumb"
          {...thumbProps}
          className={cn(
            "block size-4 shrink-0 rounded-full border-2 border-primary bg-background shadow-xs transition-[color,box-shadow] outline-none hover:ring-3 hover:ring-ring/30 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none",
            thumbProps?.className
          )}
        />
      ))}
    </SliderPrimitive.Root>
  )
}

/**
 * How many thumbs to render.
 *
 * Radix derives this from the value, so it has to be read from whichever prop
 * is in play, and a slider with neither is a single-thumb slider at its
 * minimum.
 */
function resolveThumbCount(
  props: React.ComponentProps<typeof SliderPrimitive.Root>
): number {
  const values = props.value ?? props.defaultValue
  return Array.isArray(values) && values.length > 0 ? values.length : 1
}

export { Slider }
