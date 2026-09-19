import { api } from "./client";
import type { DemoAccount, DemoPrincipal } from "@/types";

/**
 * The demo session, from the browser's side (direction.md §3a).
 *
 * In `lib/` rather than in a feature, deliberately. `components/layout/` holds
 * the application shell and the shell is where somebody switches role or signs
 * out - and a component under `components/` may not import from `features/`
 * (scaffold.md §3-5). Identity is infrastructure here in the same way
 * `config/navigation.ts` is: the shell is allowed to know it exists.
 *
 * It is also not domain state. Nothing is cached in TanStack Query, because the
 * answer lives in an HttpOnly cookie the browser cannot read and the server
 * decides afresh on every request. A client-side copy of "who am I" would be a
 * second source of truth for the one thing that must not have one.
 */

export interface SessionResponse {
  principal: DemoPrincipal | null;
  accounts: DemoAccount[];
}

export function readSession(): Promise<SessionResponse> {
  return api.get<SessionResponse>("session");
}

export function signIn(accountId: string): Promise<{ principal: DemoPrincipal }> {
  return api.post<{ principal: DemoPrincipal }>("session", { body: { accountId } });
}

export function signOut(): Promise<void> {
  return api.delete<void>("session");
}
