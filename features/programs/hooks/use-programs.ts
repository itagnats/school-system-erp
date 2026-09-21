"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ProgramCreateInput, ProgramTermCreateInput } from "@/lib/api/contracts";
import { queryKeys } from "@/lib/constants";
import type { PaginatedResult, ProgramSummary } from "@/types";
import {
  createProgram,
  createProgramTerm,
  fetchProgram,
  fetchPrograms,
  type ProgramCreatedResponse,
  type ProgramDetailResponse,
  type ProgramTermCreatedResponse,
} from "../services/program-service";
import type { ProgramQueryParams } from "../types";

/**
 * What the write scheduled, said out loud.
 *
 * Putting a course in a curriculum schedules it into that semester
 * (`AUD-035`), and that is a second thing happening behind one button. The
 * store takes no writes, so `offeredIn` does not actually move - the response
 * names what a real implementation would have scheduled, and this is where
 * the reader is told. Silence would let them assume the course was already
 * running there.
 */
function scheduledNote(created: { scheduled: string[]; term: { semesterCode: string } }) {
  if (created.scheduled.length === 0) return undefined;
  return `${created.scheduled.join(", ")} scheduled into ${created.term.semesterCode} for the first time.`;
}

export function usePrograms(params: ProgramQueryParams) {
  return useQuery({
    queryKey: queryKeys.programs.list(params),
    queryFn: () => fetchPrograms(params),
    placeholderData: keepPreviousData,
  });
}

export function useProgram(programId: string) {
  return useQuery({
    queryKey: queryKeys.programs.detail(programId),
    queryFn: () => fetchProgram(programId),
    enabled: Boolean(programId),
  });
}

/**
 * Creating a program and its first term.
 *
 * Nothing is invalidated, for the usual reason — the BFF stores nothing, so a
 * refetch would visibly undo the create a second after it was made. The
 * response is patched into every cached page of the list instead.
 *
 * **This is the only copy of the new program that will ever exist**
 * (`AUD-036`). A reload loses it, which the screen says, and its own page
 * cannot be opened because that page is server-rendered from the store. The
 * term comes back in the same response for exactly that reason: there is no
 * second request that could fetch it.
 */
export function useCreateProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProgramCreateInput) => createProgram(input),
    onSuccess: (created: ProgramCreatedResponse) => {
      queryClient.setQueriesData<PaginatedResult<ProgramSummary>>(
        { queryKey: queryKeys.programs.all },
        (previous) => {
          if (!previous) return previous;
          if (previous.items.some((row) => row.id === created.program.id)) return previous;

          const row: ProgramSummary = {
            id: created.program.id,
            code: created.program.code,
            name: created.program.name,
            credential: created.program.credential,
            status: created.program.status,
            termCount: 1,
            // Nobody has enrolled in a term created a moment ago.
            studentCount: 0,
            latestSemesterCode: created.term.semesterCode,
          };

          return { ...previous, items: [row, ...previous.items], total: previous.total + 1 };
        },
      );

      toast.success(`${created.program.code} created with its first term`, {
        description: scheduledNote(created),
      });
    },
    onError: () => {
      toast.error("That program could not be created.");
    },
  });
}

/**
 * Adding a later term to a program that already exists.
 *
 * Patches the program's own detail entry rather than the list, because that
 * is the screen the reader is looking at. The row is assembled here from the
 * response; every figure in it is either returned or knowably zero on a term
 * nobody has joined yet.
 */
export function useCreateProgramTerm(programId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProgramTermCreateInput) => createProgramTerm(input),
    onSuccess: (created: ProgramTermCreatedResponse) => {
      queryClient.setQueryData<ProgramDetailResponse>(
        queryKeys.programs.detail(programId),
        (previous) => {
          if (!previous) return previous;
          if (previous.terms.some((term) => term.id === created.term.id)) return previous;

          return {
            ...previous,
            terms: [
              ...previous.terms,
              {
                id: created.term.id,
                programId: previous.program.id,
                programCode: previous.program.code,
                programName: previous.program.name,
                semesterCode: created.term.semesterCode,
                status: created.term.status,
                courseCount: created.curriculum.length,
                enrolledCount: 0,
                currency: created.term.currency,
                packagePrice: created.term.packagePrice,
              },
            ].sort((a, b) => a.semesterCode.localeCompare(b.semesterCode)),
          };
        },
      );

      toast.success(`${created.term.semesterCode} added`, {
        description: scheduledNote(created),
      });
    },
    onError: () => {
      toast.error("That term could not be added.");
    },
  });
}
