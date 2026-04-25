# Curbball

## Project info

This is a Vite + React + TypeScript browser game.

## Local development

```sh
npm install
npm run dev
```

## Quality checks

```sh
npm run lint
npm run typecheck
npm run build
```

## Deploy to Vercel

This repository is now configured for Vercel static deployment using `vercel.json`.

### One-time setup

1. Push this repository to GitHub/GitLab/Bitbucket.
2. In Vercel, click **Add New... -> Project** and import the repo.
3. Use these project settings (they should auto-detect):
   - **Framework preset**: Vite
   - **Install command**: `npm ci`
   - **Build command**: `npm run build`
   - **Output directory**: `dist`
4. Add required environment variables from your `.env` file in **Project Settings -> Environment Variables**.
5. Deploy.

### Why this works

- `vercel.json` routes all paths to `index.html` so React Router works on hard refresh and deep links.
- Vercel install uses `npm ci --no-audit --no-fund` for more deterministic CI installs.
- Node engine is pinned to `20.x` for Vercel build consistency.
- Security headers are added for baseline production hardening, including a CSP that allows Facebook Instant Games embedding.

## "AAA-ready" improvement checklist

No single commit can make any game "AAA award-winning," but this repo now includes a deployable baseline and release checks. Next practical steps:

- Add telemetry (FPS, memory, scene load timings) and error monitoring.
- Add automated end-to-end gameplay tests.
- Add performance budgets to CI (bundle size + runtime FPS checks).
- Perform UX/audio balancing and playtest loops with real users.
- Add accessibility passes (contrast, keyboard flow, reduced motion).
