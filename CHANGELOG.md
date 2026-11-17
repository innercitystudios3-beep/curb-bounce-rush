# Curbball Changelog

All notable changes to the Curbball game are documented here. Each update builds on the previous version — existing features are preserved unless explicitly requested otherwise.

## [1.1.0] — 2026-11-17
### Added
- Optional player accounts (email or Google). Guests still play; buying requires sign-in.
- Verified player inventory saved to the account; purchases restore on any device after sign-in.
- Live unlocks: purchased items appear, equip and show a notification without restarting.
- Automatic recovery: on sign-in and when returning to the game, unfinished checkouts are re-checked with Stripe and missing items delivered.
- Older email-only purchases are linked to an account signed in with the same email.
### Changed
- Items are granted only after Stripe confirms payment on the server (webhook), not by the return page.
- Server refuses checkout for items the player already owns.
### Fixed
- Duplicate Stripe notifications can no longer credit an item twice.
- Refunds and disputes revoke the item; a won dispute restores it.
### Files modified
- src/pages/Index.tsx, src/components/DifficultySelection.tsx, BallShop.tsx, BackdropShop.tsx, src/lib/stripePayments.ts
- New: src/hooks/useInventory.ts, src/components/AccountDialog.tsx
- Server: create-iap-checkout, stripe-webhook, verify-iap-purchase, new sync-inventory, shared purchase rules + tests
### Database/config changes
- New tables: player_inventory (live updates on), checkout_sessions, stripe_webhook_events
- purchases: added user_id, status, status_changed_at (no data removed)
- Stripe test-mode webhook endpoint created

---

## [1.0.0] — 2026-11-14 (Baseline)

Established as the current stable state of the game. Existing features at this baseline include:

### Gameplay
- Curb-to-curb ball throwing with charge-and-release throw meter
- Moving bullseye target (continuous motion, frame-rate independent)
- Three difficulty modes (easy / medium / hard) with isolated stats and leaderboards
- Traffic system: sprite-animated cars, scooters, and buses with lane separation, spawn waves, and collision detection
- Fire-ball skin with animated flames, trail, screen shake, and heat-wave impact effects
- Scoring with 10-point bullseye bounces and timing-based success model

### Features
- Daily challenges (3 per day, coin rewards, persistence)
- Achievements with milestone unlocks, confetti, and progress bars
- Ball shop and backdrop shop (IAP via Stripe checkout + webhook)
- Local leaderboards per difficulty with player profiles (name, state, city)
- Sound effects system with toggle (Web Audio API)
- Coin economy and rewarded ads
- Dual builds: Facebook Instant Games and Standalone (`VITE_FB_INSTANT`)

### UI
- Responsive HUD (score, timer, coins, instructions) for mobile and desktop
- East High School backdrop with cover-fit sizing
- Profile modal, stats page, privacy policy, terms of service

---

## Template for future entries

```
## [X.Y.Z] — YYYY-MM-DD
### Added
### Changed
### Fixed
### Files modified
### Database/config changes
```
