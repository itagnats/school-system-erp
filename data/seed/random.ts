/**
 * The only source of randomness in PRIME, and it is not random.
 *
 * Seed data has to be identical on the server and on the client, or the two
 * renders disagree and React reports a hydration mismatch. `Math.random()` and
 * `Date.now()` are therefore banned everywhere under `data/` and `server/`;
 * this deterministic generator stands in for both.
 *
 * mulberry32: 32-bit state, good enough distribution for demo fixtures, and
 * short enough to read in one sitting.
 */
export function createRandom(seed: number) {
  let state = seed >>> 0;

  /** Float in [0, 1). */
  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    /** Integer in [min, max], inclusive. */
    int(min: number, max: number): number {
      return min + Math.floor(next() * (max - min + 1));
    },
    /** One item, never undefined for a non-empty array. */
    pick<T>(items: readonly T[]): T {
      return items[Math.floor(next() * items.length)];
    },
    /** `count` distinct items, or all of them if the array is shorter. */
    sample<T>(items: readonly T[], count: number): T[] {
      const pool = [...items];
      const taken: T[] = [];
      while (taken.length < count && pool.length > 0) {
        taken.push(pool.splice(Math.floor(next() * pool.length), 1)[0]);
      }
      return taken;
    },
    /** True with the given probability. */
    chance(probability: number): boolean {
      return next() < probability;
    },
  };
}

export type Random = ReturnType<typeof createRandom>;

/**
 * Every generated date is derived from this instant rather than from the clock,
 * so a build in March and a build in November produce the same fixtures.
 */
export const SEED_EPOCH = new Date("2026-01-05T00:00:00.000Z");

/** ISO date-time `days` from the epoch. Negative goes backwards. */
export function isoFromEpoch(days: number): string {
  return new Date(SEED_EPOCH.getTime() + days * 86_400_000).toISOString();
}
