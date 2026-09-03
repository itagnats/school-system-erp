/**
 * Cross-module business math. Calculations used by a single feature live in
 * that feature instead (features/<name>/calculations), per scaffold.md §14.
 *
 * Everything here is pure and synchronous so it can be unit tested without a
 * renderer, a network or a clock.
 */
export * from "./number";
export * from "./grade";
export * from "./ranking";
