# Bethany Hope Leeman — Portfolio 2026 (Setup Guide)

This folder is structured identically to **Terra Club (`Bethany Snail Mail`)** as **one central website and installable web app** (`index.html`) with a separated data persistence layer (`data.js`), interactive studio manager (`admin.js`), configuration (`firebase-config.js`), and PWA assets (`manifest.json`, `sw.js`, `icon.svg`), configured for your Cloudflare Workers domain **`https://beths-portfolio.nkentekhiwe.workers.dev`**.

## Deploying to `beths-portfolio.nkentekhiwe.workers.dev`

`wrangler.toml` is already configured in this folder with `name = "beths-portfolio"`. To include the `images/` folder inside this directory and deploy directly to **`https://beths-portfolio.nkentekhiwe.workers.dev`**, run:

```bash
cd "/Users/khiwe/Downloads/Websites/Bethany Portfolio 2026"
cp -R "../Bethany Hope Leeman — Portfolio 2026_files/images" ./images
npx wrangler deploy
```

## Files in this folder (upload **all of them** when publishing)

| File | Purpose |
|---|---|
| `index.html` | The central multi-page portfolio shell (Home Cover, Artist Statement, Selected Artworks, Archive & Lace, and Lightbox) |
| `admin.js` | Picture Studio Manager module loaded inside the central app (1-click photo upload, drag-and-drop, 51-picture library modal, rotation, and direct HTML auto-save) |
| `data.js` | Shared data & multi-layer persistence engine (`localStorage` + `IndexedDB` + `window.name` + Browser `FileSystemFileHandle` + optional Firebase Firestore sync) |
| `firebase-config.js` | **Your optional Firebase database keys and admin email list** |
| `admin.html` | Redirects straight into the central app (`index.html#works`) |
| `manifest.json`, `sw.js`, `icon.svg` | Makes the portfolio site installable as a standalone PWA |

## Multi-Page Navigation
The portfolio is organized into 4 dedicated views inside `index.html`:
- **Page 1 (`#home`)**: Full-bleed cover hero (*"Ways of seeing" — multimedia, lace on photograph, 2026*).
- **Page 2 (`#statement`)**: Dedicated warm-paper **Artist Statement** page.
- **Page 3 (`#works`)**: **Selected Artworks** exhibition catalogue with series filters:
  - *01 • Ode to My Mother*
  - *02 • A Portrait of All the Women Who Came Before Me*
  - *03 • Return to the Garden*
  - *04 • An Oil Study on Flowers*
- **Page 4 (`#archive`)**: **An Archive of Tender Things** & **Veils, Lace & Nocturnal Gardens**.

## Automatic Picture Saving (Works Out of the Box)
When you open `index.html` and add, replace, or rotate any picture:
1. **Instant Browser Auto-Save**: Every change is saved immediately to `localStorage`, `IndexedDB` (`BethanyPortfolioStudio2026`), and `window.name`.
2. **Direct File Auto-Overwrite**: Click **⚡ Enable Direct File Auto-Save** (or **✓ Auto-Save: ON**) in the bottom-right studio toolbar to link `index.html` on disk so every picture edit writes directly into the file automatically.

## Optional Live Cloud Sync (Firebase Spark Plan — Free)
Just like `Bethany Snail Mail`, you can optionally paste your Firebase keys into `firebase-config.js` (`window.FIREBASE_CONFIG`) so slot overrides also sync to a Firestore `portfolio_slots` collection across devices. Leave `firebase-config.js` blank to run in 100% self-contained local studio mode.
