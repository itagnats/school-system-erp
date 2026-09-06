import "server-only";

/**
 * Demo state injection, driven by `?_simulate=`.
 *
 * The four data states every screen must implement are only credible if they
 * can be seen. This makes three of them reachable from the address bar without
 * touching code:
 *
 *   ?_simulate=slow    a long delay, so the skeleton is visible
 *   ?_simulate=empty   a well-formed response with no rows
 *   ?_simulate=error   a 500, to exercise the error state
 *
 * The parameter is underscore-prefixed so it can never collide with a domain
 * filter, and it is stripped in the route handler before the query reaches a
 * service. Nothing below the handler knows this exists.
 */
export const SIMULATE_PARAM = "_simulate";

export type SimulateMode = "slow" | "empty" | "error";

const MODES: SimulateMode[] = ["slow", "empty", "error"];

export function readSimulate(params: URLSearchParams): SimulateMode | undefined {
  const raw = params.get(SIMULATE_PARAM);
  return MODES.find((mode) => mode === raw);
}

/** Baseline latency, so a skeleton is visible rather than theoretical. */
const BASE_DELAY_MS = 180;
const SLOW_DELAY_MS = 2600;

export function delayFor(mode: SimulateMode | undefined): Promise<void> {
  const ms = mode === "slow" ? SLOW_DELAY_MS : BASE_DELAY_MS;
  return new Promise((resolve) => setTimeout(resolve, ms));
}
