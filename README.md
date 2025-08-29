# D3 Algorithm Visualizations (Vite + TypeScript)

Interactive visualizations for classic algorithms using D3.js. Built with Vite + TS.

## Run locally
```bash
npm ci
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Structure
- `src/algorithms/*`: **Step generators** output strongly-typed `Step[]` actions
- `src/app.ts`: UI + renderer; maps steps → D3 animations
- `src/core/stepEngine.ts`: shared types/utilities (e.g., RNG)
- `public/`: static assets
- `.github/workflows/gh-pages.yml`: deploy to GitHub Pages on push to `main`

## Add a new algorithm
1. Create `src/algorithms/<category>/<name>.ts` exporting `generateSteps(input): Step[]`.
2. Register it in `src/app.ts` (UI select + renderer).
3. Optionally add tests in `tests/`.

## License
MIT
