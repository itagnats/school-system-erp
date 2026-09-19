"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/constants";
import { fetchPersonas, fetchQueue } from "../services/persona-service";

/**
 * Which demo persona the evaluation area is being read as.
 *
 * Held in the URL as `?as=`, not in context or local storage. Three reasons,
 * and the third is the one that decided it:
 *
 *   - a queue can be refreshed, bookmarked and pasted to someone else, which is
 *     the same argument that put list filters in the URL;
 *   - the server can read it, so the first paint is the right persona's queue
 *     rather than a default that swaps a moment later;
 *   - local storage is unreadable during a server render, so any component
 *     depending on it renders differently on the two sides and breaks
 *     hydration - the failure class this project has already paid for.
 */
export function usePersonaParam(signedInPersonaId?: string) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  // The signed-in account's own persona is the default, so a student who signed
  // in as a student opens their own queue rather than whichever persona the
  // seed happens to list first (direction.md 3a). `?as=` still wins, because a
  // pasted link is an explicit request to read as somebody else.
  const personaId = params.get("as") ?? signedInPersonaId;

  const setPersona = useCallback(
    (next: string) => {
      const search = new URLSearchParams(params);
      search.set("as", next);
      // Switching identity replaces the entry rather than pushing one: a reader
      // trying five personas should not have to press Back five times.
      router.replace(`${pathname}?${search.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  return { personaId, setPersona };
}

export function usePersonas() {
  return useQuery({
    queryKey: queryKeys.evaluation.personas,
    queryFn: fetchPersonas,
    // The switcher's options come from the seed and cannot change in a session.
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useEvaluationQueue(personaId?: string) {
  return useQuery({
    queryKey: queryKeys.evaluation.queue(personaId),
    queryFn: () => fetchQueue(personaId),
  });
}
