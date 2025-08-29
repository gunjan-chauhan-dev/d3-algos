import type { SortStep } from '../../core/stepEngine';

export function generateStepsInsertion(arr: number[]): SortStep[] {
  const a = arr.slice();
  const steps: SortStep[] = [];
  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    let j = i - 1;
    while (j >= 0 && a[j] > key) {
      steps.push({ type: 'compare', i: j, j: j + 1 });
      a[j + 1] = a[j];
      steps.push({ type: 'overwrite', index: j + 1, value: a[j] });
      j--;
    }
    a[j + 1] = key;
    steps.push({ type: 'overwrite', index: j + 1, value: key });
  }
  for (let k = 0; k < a.length; k++) steps.push({ type: 'markSorted', index: k });
  return steps;
}