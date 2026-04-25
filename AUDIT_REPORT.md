# Curb Ball Launch Readiness Audit (April 24, 2026)

## What I validated in this pass

- Reviewed the full gameplay flow in code from start -> timed run -> end-of-game state transitions.
- Reviewed monetization hooks for rewarded and interstitial ad entry points.
- Reviewed Vercel deployment configuration for deterministic installs and SPA routing.

## Issues found and fixed

1. **Gameplay interval cleanup bug**
   - `chargeIntervalRef` is created by `setInterval` but was being cleaned up with `cancelAnimationFrame`.
   - Fixed to use `clearInterval`, preventing orphaned timers and inconsistent input behavior after unmount.

2. **Vercel install reliability**
   - Updated Vercel install command to `npm ci --no-audit --no-fund` to reduce failures from advisory endpoint/network policy differences.

3. **Build/runtime consistency on Vercel**
   - Pinned Node runtime to `20.x` in `package.json` to avoid Node-version drift issues in build tooling.

4. **Header policy simplification for deploy stability**
   - Removed custom global security-header overrides from `vercel.json` to avoid accidental CSP/X-Frame embedding conflicts while stabilizing deployment.

## Gameplay/UI/UX audit findings

### Strengths
- Core loop has clear progression: difficulty select, timed round, score tracking, persistence, and post-game summary.
- Good feedback loops (coins, confetti, challenge progression, toasts).
- Mobile-focused safeguards exist (wake lock hooks, pause handling, touch inputs).

### Remaining improvements before aggressive ad spend
- Add a first-session tutorial overlay for aiming/power timing.
- Add explicit ad cadence caps (e.g., interstitial every N rounds) and cooldown state.
- Add telemetry events for funnel monitoring (session start, round complete, ad-show, ad-reward, churn points).

## Playthrough note

A literal manual browser playthrough could not be executed in this environment because browser automation tooling is not available in this run context. The audit above is based on code-level state-flow analysis plus TypeScript validation.
## Scope completed in this pass

- Deployment configuration audit for Vercel + Facebook Instant Games hosting constraints.
- Static gameplay/playability audit from source code review.
- UI/UX flow audit for game start, loop, monetization, and retention hooks.
- Ads readiness audit for rewarded + interstitial placement configuration.

## Blocking issues found and fixed

1. **TypeScript compile blocker in `GameCanvas`**
   - Duplicate ref declarations (`isChargingRef`, `gameAreaRef`) caused a hard build break.
   - Fixed by removing duplicate declarations.

2. **Facebook embedding blocked by security headers in `vercel.json`**
   - `X-Frame-Options: DENY` prevents Facebook iframe embedding.
   - Replaced with CSP `frame-ancestors` policy allowing Facebook domains.

3. **Ad placement IDs hardcoded placeholders**
   - Rewarded and interstitial ad IDs used placeholder strings.
   - Replaced with env-based IDs:
     - `VITE_FB_REWARDED_PLACEMENT_ID`
     - `VITE_FB_INTERSTITIAL_PLACEMENT_ID`
   - Added explicit warnings and safe early returns when unset.

## Playability and UX review

### Core loop status

- Difficulty selection and timed run loop are implemented.
- Scoring, progression, achievements, and daily challenges are present.
- Local persistence exists for coins, owned items, challenges, and scores.

### UX strengths

- Strong feedback systems (toasts, confetti, floating coin feedback).
- Shop and unlock loops are integrated with progression.
- Responsive-focused gameplay (touch + wake lock + pause handling).

### UX risks before paid traffic

- No explicit first-time tutorial funnel; new users may drop before understanding throw timing.
- Rewarded ad value is static and not dynamically balanced by difficulty/session length.
- No explicit ad frequency cap policy documented for interstitial cadence.

## Recommendation checklist before scaling ads

- [ ] Add first-session onboarding tooltips (aim, charge, release, scoring zones).
- [ ] Define interstitial cadence (e.g., every 2 games max, never on first session).
- [ ] Add ad cooldown timers and ad-failure fallback rewards.
- [ ] Instrument funnel analytics: start rate, finish rate, retry rate, ad opt-in rate, D1 retention.
- [ ] Add consent/privacy flow depending on region/ad network requirements.
- [ ] Add pre-release smoke checklist in CI: `typecheck`, `lint`, `build`.

## Platform readiness notes

- **Facebook Instant Games**: Security header and placement ID fixes now support expected integration path.
- **Vercel**: SPA routing and output directory are configured correctly.
- **Other platforms**: Build output is static and portable to Netlify/GitHub Pages/CDN hosting.

## Manual playthrough note

A full browser playthrough could not be executed in this environment due package registry restrictions preventing a complete toolchain install for runtime (`vite` binary unavailable). Static audit and compile checks were completed instead.
