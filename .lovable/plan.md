## Make the Canvas a Living Curb-to-Curb Environment

Right now the backdrop image is sized at 70% and just sits as wallpaper, the street is a flat 256px strip glued to the bottom, and the ball/bullseye are both rendered on the same thin curb. It doesn't read as "I'm standing on one curb throwing across the street to the other."

This plan reshapes the play area so the environment IS the game world — with a near curb (player), a road in the middle (with perspective + obstacles), and a far curb (target with bullseye), all taking up the majority of the screen.

### New scene layout (top → bottom of screen)

```text
┌─────────────────────────────────────────────┐
│  HUD (score / time / coins) — overlay       │
├─────────────────────────────────────────────┤
│                                             │
│   SKY + BACKDROP IMAGE                      │  ~30% height
│   (East High / mural / tower fills width,   │
│    sits on the horizon line)                │
│                                             │
├─────────────────────────────────────────────┤
│   FAR CURB  ░░░░ 🎯 bullseye moves ░░░░    │  ~8% height
├─────────────────────────────────────────────┤
│                                             │
│   ROAD (perspective trapezoid)              │  ~35% height
│   - dashed yellow center line w/ vanishing  │
│   - obstacles drive across, scaled by depth │
│                                             │
├─────────────────────────────────────────────┤
│   NEAR CURB  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  ~6% height
├─────────────────────────────────────────────┤
│   SIDEWALK / player POV                     │  ~15% height
│   - ⚪ ball sits here at chosen lane         │
│   - lane position markers across sidewalk   │
└─────────────────────────────────────────────┘
                  Controls overlay
```

The ball arcs UP and AWAY from the near curb, lands on the far curb where the bullseye is — matching the "throw across the street" feel.

### Changes to `src/components/GameCanvas.tsx`

1. Replace the single `bg-top bg-no-repeat ... 70%` wrapper with a layered scene:
   - **Sky/backdrop layer**: top ~30% of screen, `bg-cover bg-center` so the East High / mural / tower image actually fills the width and feels like the environment, not a floating thumbnail. Add a subtle gradient fade at its bottom edge into the far curb.
   - **Far curb strip**: thin gray gradient bar directly under the backdrop. Bullseye target sits on/just above this strip (moves left↔right as today).
   - **Road**: a trapezoid shape between far curb and near curb using CSS `clip-path: polygon(...)` so it's wider at the bottom (near) and narrower at the top (far) — gives perspective without needing canvas/3D. Dark asphalt color (use existing `--game-street` token). Dashed yellow center line drawn with repeating gradient that also narrows toward the top.
   - **Near curb strip**: thicker gray gradient bar.
   - **Sidewalk**: bottom ~15%, lighter concrete tone. Holds the lane position markers and the resting ball.

2. **Ball placement & flight path**:
   - Resting position (`ballPhase === 'ready'`): on the near sidewalk at `bottom: ~8%`, horizontally at `ballHorizontalPosition`. Render slightly larger here (player's POV → ball is close).
   - During `flying`: animate from near-sidewalk Y up over the road to the far curb's Y. Re-tune the existing arc math so `y` interpolates between sidewalk-bottom and far-curb-top instead of the current 80→arc values, and scale the ball down as it travels (perspective: it's getting farther away). Approx `scale = 1 - 0.5 * progress`.
   - On `hit`/`bounce`/`missed`: land at far curb's Y (where the bullseye lives), then bounce back toward the player or fall.

3. **Obstacles** drive across the road trapezoid, not on the curb:
   - Position them within the road band (between far and near curb Y).
   - Scale them by their vertical position so cars further "back" look smaller. Simple linear scale based on a chosen lane Y for each obstacle.

4. **Curb coins**: keep them hovering above the **far** curb (since that's the target curb), positioned along the far-curb strip rather than the current single curb.

5. **Lane / position markers**: move them onto the **near sidewalk** (bottom area) so they read as "where you, the thrower, are aiming from." Active marker still highlights green based on `ballHorizontalPosition`.

6. **Bullseye**: keep the moving target, but anchor it on the far curb strip with the existing pulse/glow. Slightly larger so it's readable from the player's POV across the road.

7. **Win/celebration coloring**: keep the `gameWon` purple recolor but apply it across the new layered structure (sky tint, road tint, curb gold) so the whole environment celebrates, not just the old strip.

### Out of scope

- No new images, no canvas/WebGL rewrite — pure CSS/Tailwind layering and tweaks to existing animation math.
- Stripe webhook secret can be added later as you noted; webhook function code is already in place.

### Files to modify
- `src/components/GameCanvas.tsx` — JSX scene structure (the `return (...)` block from ~line 741 onward) and the `throwBall` Y-interpolation/scale math (~lines 448–500 and the hit/bounce timeouts).
