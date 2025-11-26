# Build Instructions for Curb Ball

This project supports two build configurations:
1. **Facebook Instant Games** - Includes FB SDK, leaderboards, sharing, and ads
2. **Standalone** - Pure web version without Facebook dependencies

## Quick Start

### Building for Facebook Instant Games

```bash
# 1. Copy Facebook environment config
cp .env.facebook .env

# 2. Install dependencies (if not already done)
npm install

# 3. Build the project
npm run build

# 4. Check the bundle size (MUST be under 5MB for Facebook)
du -sh dist

# 5. Create a ZIP file of the dist folder
cd dist
zip -r ../curbball-facebook.zip .
cd ..
```

The file `curbball-facebook.zip` is now ready to upload to Facebook Developer Dashboard.

### Building for Standalone/Other Platforms

```bash
# 1. Copy standalone environment config
cp .env.standalone .env

# 2. Install dependencies (if not already done)
npm install

# 3. Build the project
npm run build

# 4. Check the bundle size
du -sh dist

# 5. Create a ZIP file of the dist folder
cd dist
zip -r ../curbball-standalone.zip .
cd ..
```

The file `curbball-standalone.zip` is now ready to deploy to any web hosting platform.

## What's Different?

### Facebook Build Includes:
- ✅ Facebook Instant Games SDK integration
- ✅ Leaderboards with player data
- ✅ Share functionality to invite friends
- ✅ Rewarded video ads for earning coins
- ✅ Player data persistence via Facebook
- ✅ Loading screen optimized for Facebook
- ✅ `fbapp-config.json` manifest file

### Standalone Build:
- ✅ All Facebook features are disabled
- ✅ Uses localStorage for data persistence
- ✅ No external SDK dependencies
- ✅ Lightweight and platform-agnostic
- ✅ Works on any web hosting (Vercel, Netlify, GitHub Pages, etc.)
- ✅ No Facebook SDK loaded

## Important Notes

### Bundle Size Requirements
- **Facebook Instant Games**: Bundle MUST be under 5MB (hard requirement)
- **Standalone**: No strict size limit

To check your bundle size:
```bash
# After building
du -sh dist
# or
ls -lh dist
```

If your Facebook build exceeds 5MB:
1. Check for large assets in `public/` folder
2. Optimize images (use WebP format, compress)
3. Consider code splitting in `vite.config.ts`
4. Remove unused dependencies

### Testing

**Facebook build:**
- Upload to Facebook Developer Dashboard
- Test in Facebook's Instant Games environment
- Test with 20+ testers before publishing

**Standalone build:**
- Test in any web browser (Chrome, Firefox, Safari)
- Test on mobile devices
- Deploy to preview environment first

### Files Modified for Build System

The following files have been updated to support both build configurations:
- `.env.example` - Template environment file
- `.env.facebook` - Facebook Instant Games configuration
- `.env.standalone` - Standalone web configuration
- `index.html` - Conditional FB SDK loading
- `src/lib/fbInstantManager.ts` - Environment-aware FB manager
- `src/components/GameCanvas.tsx` - Conditional FB features
- `src/components/DifficultySelection.tsx` - Conditional share/ad buttons
- `src/pages/Index.tsx` - Conditional FB initialization
- `src/pages/Stats.tsx` - Conditional leaderboards
- `public/fbapp-config.json` - Facebook manifest file

## Deployment

### Facebook Instant Games:
1. Go to [Facebook Developers Console](https://developers.facebook.com/)
2. Navigate to your app > Instant Games > Hosting
3. Upload `curbball-facebook.zip`
4. Wait for processing (can take 5-10 minutes)
5. Test thoroughly before pushing to production

### Standalone Platforms:

**Vercel:**
```bash
npm i -g vercel
vercel --prod
```

**Netlify:**
```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

**GitHub Pages:**
```bash
# Push dist folder to gh-pages branch
npm install -g gh-pages
gh-pages -d dist
```

## Troubleshooting

**Issue: Build exceeds 5MB for Facebook**
- Solution: Compress images, remove unused assets, enable gzip in hosting

**Issue: Facebook SDK not loading**
- Solution: Check that VITE_FB_INSTANT=true in .env file
- Solution: Verify `fbapp-config.json` exists in public folder

**Issue: Leaderboards not showing**
- Solution: Must be running in Facebook Instant Games environment
- Solution: Check Facebook Developer Console for leaderboard configuration

**Issue: Ads not working**
- Solution: Replace placeholder IDs in `fbInstantManager.ts` with real placement IDs
- Solution: Ads require app approval from Facebook

## Environment Variables

The `.env` file controls which features are enabled:

```bash
# Set to 'true' for Facebook Instant Games
# Set to 'false' for standalone web version
VITE_FB_INSTANT=true
```

This single variable controls:
- FB SDK loading
- Leaderboard display
- Share buttons
- Ad buttons
- FB data persistence
- Loading screen behavior

## Next Steps

After building, you should:
1. ✅ Test both builds thoroughly
2. ✅ Verify bundle sizes meet requirements
3. ✅ Create privacy policy and terms of service (required for Facebook)
4. ✅ Set up app icons and screenshots
5. ✅ Configure Facebook App settings
6. ✅ Submit for Facebook review with 20+ testers

For Facebook submission requirements, see: [Facebook Instant Games Documentation](https://developers.facebook.com/docs/games/instant-games)
