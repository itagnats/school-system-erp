import { api } from "@/lib/api";
import type { DemoPersona, EvaluationQueue } from "@/types";

/**
 * Client callers for the evaluator screens.
 *
 * Neither response is parsed against a contract. Both are read-only and
 * entirely derived on the server from configuration the setup endpoint already
 * validates, so a schema here would only re-check numbers nobody can submit.
 * The contract earns its keep where untrusted data travels, which is inbound.
 */

export async function fetchPersonas(): Promise<DemoPersona[]> {
  const raw = await api.get<{ items: DemoPersona[] }>("personas");
  return raw.items;
}

export async function fetchQueue(personaId?: string): Promise<EvaluationQueue> {
  return api.get<EvaluationQueue>("evaluation/queue", {
    query: personaId ? { as: personaId } : {},
  });
}
