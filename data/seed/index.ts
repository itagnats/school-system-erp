import { generateDataset, type Dataset } from "./generate";

/**
 * The dataset every repository is seeded from.
 *
 * Built once at module load and never mutated. A repository takes its own copy
 * so that nothing downstream can reach back and change the seed.
 */
export const seed: Dataset = generateDataset();

export type { Dataset };
export { generateDataset };
