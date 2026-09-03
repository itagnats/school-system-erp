"use client";

import { useState, useSyncExternalStore } from "react";
import { CheckIcon, MonitorIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** A dot on a track, so a duration or a curve can actually be watched. */
function Track({
  label,
  detail,
  run,
  className,
}: {
  label: string;
  detail: string;
  run: boolean;
  className: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <code className="w-32 shrink-0 text-xs text-foreground">{label}</code>
      <span className="w-16 shrink-0 text-xs text-muted-foreground" data-numeric>
        {detail}
      </span>
      <div className="relative h-6 min-w-0 flex-1 rounded-full border border-hairline bg-surface-sunken">
        <span
          className={cn(
            "absolute top-1 size-4 rounded-full bg-primary transition-all",
            className,
          )}
          style={{ left: run ? "calc(100% - 1.25rem)" : "0.25rem" }}
        />
      </div>
    </div>
  );
}

/**
 * The three durations, side by side and moving at the same time.
 *
 * Read separately they are indistinguishable — nobody can tell 120ms from
 * 200ms from memory. Raced against each other the difference is obvious, which
 * is the only useful way to document a duration.
 */
export function DurationRace() {
  const [run, setRun] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Track
          label="duration-fast"
          detail="120ms"
          run={run}
          className="duration-fast ease-standard"
        />
        <Track
          label="duration-normal"
          detail="200ms"
          run={run}
          className="duration-normal ease-standard"
        />
        <Track
          label="duration-slow"
          detail="320ms"
          run={run}
          className="duration-slow ease-standard"
        />
      </div>
      <div>
        <Button variant="outline" size="sm" onClick={() => setRun((value) => !value)}>
          {run ? "Send back" : "Run"}
        </Button>
      </div>
    </div>
  );
}

/**
 * The four curves at the same duration. Enter decelerates into place, exit
 * accelerates away, emphasized overshoots and settles.
 */
export function EasingRace() {
  const [run, setRun] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Track
          label="ease-standard"
          detail="0.4 0 0.2 1"
          run={run}
          className="duration-slow ease-standard"
        />
        <Track
          label="ease-enter"
          detail="0.05 0.7 0.1 1"
          run={run}
          className="duration-slow ease-enter"
        />
        <Track
          label="ease-exit"
          detail="0.3 0 0.8 0.15"
          run={run}
          className="duration-slow ease-exit"
        />
        <Track
          label="ease-emphasized"
          detail="0.34 1.26 0.64 1"
          run={run}
          className="duration-slow ease-emphasized"
        />
      </div>
      <div>
        <Button variant="outline" size="sm" onClick={() => setRun((value) => !value)}>
          {run ? "Send back" : "Run"}
        </Button>
      </div>
    </div>
  );
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * Whether the person reading this page has asked their system to reduce
 * motion, read live from the media query the global rule keys off.
 *
 * A media query is an external store, so it is read with
 * useSyncExternalStore rather than mirrored into state from an effect. The
 * server snapshot is null because the server has no media query to evaluate:
 * that renders the neutral line first and swaps to the real answer on
 * hydration, with no mismatch and no cascading render.
 */
export function ReducedMotionStatus() {
  const reduced = useSyncExternalStore<boolean | null>(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => null,
  );

  const copy =
    reduced === null
      ? "Reading your system preference…"
      : reduced
        ? "Reduced motion is on. Every transition on this page is collapsed to 0.01ms, and the spinner below is the only thing still moving."
        : "Reduced motion is off, so this page animates normally. Turn it on in your OS accessibility settings and this line updates without a reload.";

  return (
    <div className="flex items-start gap-2.5 rounded-md border border-hairline bg-card p-3">
      <span
        className={cn(
          "mt-px flex size-5 shrink-0 items-center justify-center rounded-full",
          reduced ? "bg-success-soft text-success-soft-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        {reduced ? (
          <CheckIcon className="size-3" aria-hidden />
        ) : (
          <MonitorIcon className="size-3" aria-hidden />
        )}
      </span>
      <p className="min-w-0 text-xs text-foreground">{copy}</p>
    </div>
  );
}
