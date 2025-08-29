import type { SortStep } from '../../core/stepEngine';

export function generateStepsBubble(arr: number[]): SortStep[] {
  const a = arr.slice();
  const steps: SortStep[] = [];
  let n = a.length;
  let swapped = true;
  for (let pass = 0; pass < n - 1 && swapped; pass++) {
    swapped = false;
    for (let i = 0; i < n - 1 - pass; i++) {
      const j = i + 1;
      steps.push({ type: 'compare', i, j });
      if (a[i] > a[j]) {
        [a[i], a[j]] = [a[j], a[i]];
        steps.push({ type: 'swap', i, j });
        swapped = true;
      }
    }
    steps.push({ type: 'markSorted', index: n - 1 - pass });
  }
  steps.push({ type: 'markSorted', index: 0 });
  return steps;
}