import { roundScore } from "./number";

/**
 * Rank assignment (direction.md §21).
 *
 * Competition ranking: equal scores share a rank and the next rank skips the
 * ties, so two students tied at rank 1 are followed by rank 3. Ties are flagged
 * rather than broken silently, because an arbitrary tiebreak in a ranking a
 * student is graded on is worse than showing the tie.
 *
 * Scope belongs to the caller. This function ranks whatever set it is handed;
 * whether that set is one evaluation group or a whole course-semester is a
 * decision the evaluation feature makes and the UI must state.
 */
export interface Rankable {
  id: string;
  score: number;
}

export interface RankedItem<T extends Rankable> {
  item: T;
  rank: number;
  tied: boolean;
}

export function calculateRanking<T extends Rankable>(items: T[]): RankedItem<T>[] {
  const sorted = [...items].sort((a, b) => b.score - a.score);

  const ranked: RankedItem<T>[] = [];
  let previousScore: number | null = null;
  let previousRank = 0;

  sorted.forEach((item, index) => {
    const score = roundScore(item.score);
    // Compare on the rounded value: two scores that display identically must
    // not receive different ranks.
    const rank = previousScore !== null && score === previousScore ? previousRank : index + 1;
    ranked.push({ item, rank, tied: false });
    previousScore = score;
    previousRank = rank;
  });

  const counts = new Map<number, number>();
  for (const entry of ranked) {
    counts.set(entry.rank, (counts.get(entry.rank) ?? 0) + 1);
  }
  return ranked.map((entry) => ({
    ...entry,
    tied: (counts.get(entry.rank) ?? 0) > 1,
  }));
}
