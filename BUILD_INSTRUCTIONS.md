# Build Instructions for Curb Ball

This is a standalone web game that can be deployed to any web hosting platform.

## Quick Start

### Building the Game

```bash
# 1. Install dependencies (if not already done)
npm install

# 2. Build the project
npm run build

# 3. Check the bundle size
du -sh dist

# 4. Create a ZIP file of the dist folder (optional)
cd dist
zip -r ../curbball.zip .
cd ..
```

The `dist` folder (or `curbball.zip`) is now ready to deploy to any web hosting platform.

## Features

- ✅ Physics-based ball throwing mechanics
- ✅ Three difficulty levels (Easy, Medium, Hard)
- ✅ Coin collection and scoring system
- ✅ Ball skins and backdrop customization
- ✅ Achievements and daily challenges
- ✅ Stripe payments for in-app purchases
- ✅ Local storage for data persistence
- ✅ Responsive design for mobile and desktop

## Deployment Options

### Vercel (Recommended)
```bash
npm i -g vercel
vercel --prod
```

### Netlify
```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

### GitHub Pages
```bash
# Push dist folder to gh-pages branch
npm install -g gh-pages
gh-pages -d dist
```

### Any Static Hosting
Simply upload the contents of the `dist` folder to your hosting provider.

## Environment Variables

The following environment variables are configured:

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key
- `VITE_FB_INSTANT=false` - Facebook Instant Games disabled
- `VITE_FB_REWARDED_PLACEMENT_ID` - Facebook rewarded ad placement ID
- `VITE_FB_INTERSTITIAL_PLACEMENT_ID` - Facebook interstitial ad placement ID

## Data Storage

All game data is stored in the browser's localStorage:
- Player coins per difficulty level
- High scores
- Games played
- Owned ball skins and backdrops
- Current selections
- Achievements progress
- Daily challenges

## Troubleshooting

**Issue: Game data not persisting**
- Solution: Check that localStorage is not blocked by browser privacy settings

**Issue: Stripe payments not working**
- Solution: Ensure the Stripe secret key is configured in the backend

**Issue: Build fails**
- Solution: Run `npm install` to ensure all dependencies are installed
