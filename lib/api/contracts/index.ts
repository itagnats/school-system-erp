/**
 * Wire contracts, imported by both halves of the application.
 *
 * These sit in `lib/` rather than under `server/` for exactly that reason: the
 * route handler validates the request against them and the feature service
 * validates the response, so neither side has to trust the other.
 */
export * from "./list";
export * from "./course";
export * from "./semester";
export * from "./student";
export * from "./enrollment";
export * from "./cost";
export * from "./catalogue";
export * from "./invoice";
export * from "./program";
export * from "./evaluation";
export * from "./question";
export * from "./session";
