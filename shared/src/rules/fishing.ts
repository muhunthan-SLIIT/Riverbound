// How many unfed fish one accepted Catch action gives.
// v2.3: the shop's fishing tools were removed; the player uses a free hand net.
// v2.4 (15 Nov 2026, the author's request): each catch gives a RANDOM 1, 2, 3 or 4 fish (equal chance).
// The SERVER rolls the number (crypto.randomInt); the browser only shows the result it is given.
export const CATCH_MIN = 1;
export const CATCH_MAX = 4;

/** True for a catch size the rules allow (whole number from CATCH_MIN to CATCH_MAX). */
export function isValidCatch(n: number): boolean {
  return Number.isInteger(n) && n >= CATCH_MIN && n <= CATCH_MAX;
}

/**
 * Rolls a catch size. `randomInt(min, maxExclusive)` is passed in, so the server can use
 * crypto.randomInt and tests can use a fixed or seeded function.
 */
export function rollCatch(randomInt: (min: number, maxExclusive: number) => number): number {
  const n = randomInt(CATCH_MIN, CATCH_MAX + 1);
  if (!isValidCatch(n)) throw new Error(`Catch roll out of range: ${n}`);
  return n;
}
