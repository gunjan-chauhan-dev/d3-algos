import type { GridStep } from '../../core/stepEngine';

export type Cell = { r: number; c: number; wall: boolean };
export type Grid = Cell[][];

export function generateGrid(N: number, wallP: number): Grid {
  const g: Grid = [];
  for (let r = 0; r < N; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < N; c++) {
      row.push({ r, c, wall: Math.random() < wallP });
    }
    g.push(row);
  }
  g[0][0].wall = false; g[N - 1][N - 1].wall = false;
  return g;
}

export function generateStepsBFS(grid: Grid, src: { r: number; c: number }, dst: { r: number; c: number }): GridStep[] {
  const N = grid.length;
  const inside = (r: number, c: number) => r >= 0 && c >= 0 && r < N && c < N;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const q: { r: number; c: number }[] = [src];
  const parent: ({ r: number; c: number } | null)[][] = Array.from({ length: N }, () => Array(N).fill(null));
  const seen: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false));
  const steps: GridStep[] = [];
  seen[src.r][src.c] = true;
  steps.push({ type: 'frontier', r: src.r, c: src.c });
  while (q.length) {
    const { r, c } = q.shift()!;
    if (r === dst.r && c === dst.c) break;
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (inside(nr, nc) && !seen[nr][nc] && !grid[nr][nc].wall) {
        seen[nr][nc] = true;
        parent[nr][nc] = { r, c };
        q.push({ r: nr, c: nc });
        steps.push({ type: 'frontier', r: nr, c: nc });
      }
    }
    steps.push({ type: 'visit', r, c });
  }
  // Reconstruct path
  let cur: { r: number; c: number } | null = (parent[dst.r][dst.c] || (src.r === dst.r && src.c === dst.c)) ? { r: dst.r, c: dst.c } : null;
  while (cur) {
    steps.push({ type: 'path', r: cur.r, c: cur.c });
    const p = parent[cur.r][cur.c];
    cur = p ? { r: p.r, c: p.c } : null;
  }
  return steps;
}