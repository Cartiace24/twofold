/** Deterministic per-item variation so handmade touches (tape, tilt, doodles)
 *  differ from page to page instead of repeating on a mechanical cycle.
 *  Same seed → same look; different seeds → varied looks. */

export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function hashSeedPick<T>(seed: string, arr: readonly T[]): T {
  if (arr.length === 0) throw new Error("hashSeedPick needs options");
  return arr[hashSeed(seed) % arr.length];
}
