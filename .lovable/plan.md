## Resize Backdrop (smaller, desktop + mobile)

Reduce the visual footprint of the backdrop image in two places without changing layout structure or game logic.

### 1. In-game scene backdrop — `src/components/GameCanvas.tsx` (~line 862-872)

Currently the sky/backdrop layer is `height: 42%` of the scene with `bg-cover bg-center`, so the image fills the full top band edge-to-edge.

Change to render the backdrop smaller and centered within the same sky band:
- Keep the outer 42% sky container (so the road/curb layout is unaffected) but give it a soft sky gradient background so the area behind a smaller backdrop doesn't look empty.
- Change `bg-cover` → `bg-contain` and `bg-center bottom` so the image scales down proportionally and rests on the horizon.
- Reduce effective size via `backgroundSize`: roughly `auto 75%` on mobile and `auto 80%` on desktop (use a Tailwind responsive style or inline media-query-free value like `backgroundSize: '70%'` which works for both since it's percentage-based).

Result: the backdrop landmark (East High, mural, etc.) reads as a smaller scene element rather than a full wallpaper, on every screen size.

### 2. Backdrop Shop preview thumbnails — `src/components/BackdropShop.tsx`

Each card currently uses `aspect-video` with `<img className="w-full h-full object-cover" />`, which crops/fills the tile.

Change:
- Switch the image to `object-contain` so the full backdrop is visible at a smaller scale within the tile.
- Add a neutral background (e.g. `bg-muted`) behind it (already present on the wrapper) and a little padding (`p-2`) so the image doesn't touch the edges.

This makes the shop thumbnails feel smaller / more "preview-like" on both desktop and mobile, matching the in-game shrink.

### Out of scope
- No changes to road, curb, ball, bullseye, or game logic.
- No new images or assets.
- No changes to the backdrop list or pricing.

### Files to modify
- `src/components/GameCanvas.tsx` — sky/backdrop layer styles only.
- `src/components/BackdropShop.tsx` — card thumbnail image classes only.
