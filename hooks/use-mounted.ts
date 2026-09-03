"use client";

import { useSyncExternalStore } from "react";

/** Never fires: the value is constant per environment, so nothing to subscribe to. */
const subscribe = () => () => {};

/**
 * True once the component has mounted on the client.
 *
 * Used to defer anything that depends on browser-only state, such as the
 * resolved theme, until after hydration.
 *
 * Implemented with useSyncExternalStore rather than a setState in an effect:
 * the server snapshot is false and the client snapshot is true, so React gets
 * the right value on the first client render instead of rendering false and
 * then immediately re-rendering.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
