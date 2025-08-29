export type SortStep =
  | { type: 'compare'; i: number; j: number }
  | { type: 'swap'; i: number; j: number }
  | { type: 'overwrite'; index: number; value: number }
  | { type: 'markSorted'; index: number };

export type GridStep =
  | { type: 'frontier'; r: number; c: number }
  | { type: 'visit'; r: number; c: number }
  | { type: 'path'; r: number; c: number };

export type Step = SortStep | GridStep;

// Seeded RNG (Mulberry32)
export function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}