# Bethany Hope Leeman — Portfolio 2026

> *Painting, Textiles, Pressed Botanicals & Photography — South Africa*

**Live Site:** [bethany-hope-leeman.nkentekhiwe.workers.dev](https://bethany-hope-leeman.nkentekhiwe.workers.dev)

---

## Overview

An editorial, multi-page art portfolio and installable Progressive Web App (PWA) showcasing the 2026 body of work by South African artist **Bethany Hope Leeman**. Built as a fast, zero-build static web application with a private, passcode-protected Studio Admin mode for curating and updating artworks.

### Portfolio Structure

- **Home & Artist Statement (`#home`, `#statement`)** — Full-bleed responsive cover artwork paired with the artist's statement exploring care as a material, social, and political force.
- **Selected Artworks (`#works`)** — Filterable exhibition catalogue featuring four series:
  - *Ode to My Mother* (Intaglio Print & Oil Painting)
  - *A Portrait of All the Women Who Came Before Me* (Photography & Mixed Media)
  - *Return to the Garden* (Charcoal Drawings to Oil Paintings)
  - *An Oil Study on Flowers* (Oil on Canvas — Native South African Flora)
- **Archive & Lace (`#archive`)** — Curated into two bodies of work with a fullscreen gallery lightbox (`←` / `→` keyboard & button navigation):
  - *An Archive of Tender Things* (Pressed Botanicals & Tulle, *Flowers from my mother's garden* backlit installations, and Outdoor Garden Suspensions)
  - *Veils, Lace & Nocturnal Gardens* (9-photograph editorial contact sheet)

---

## Architecture

```text
.
├── index.html             # Multi-page portfolio shell, editorial layout & Lightbox
├── admin.js               # Private Studio Admin module (upload, rotate, library, export)
├── data.js                # Multi-layer persistence engine (IndexedDB, localStorage, optional Firebase)
├── firebase-config.js     # Optional Firebase config & Studio passcode settings
├── admin.html             # Direct entry redirect into Studio Admin (#admin)
├── manifest.json          # PWA web app manifest
├── admin-manifest.json    # Studio Admin PWA manifest
├── sw.js                  # Offline-first service worker
├── icon.svg               # Editorial monogram app icon
├── images/                # High-resolution artwork plates (51 photographs & paintings)
└── .github/workflows/     # Optional Cloudflare Workers CI/CD deployment workflow
```

---

## Features

- **View-Only Public Experience** — Clean, distraction-free gallery with natural aspect ratios and fullscreen Lightbox navigation.
- **Private Studio Dashboard** — Accessible via `#admin`, `/admin.html`, the footer `Studio` link, or `Cmd/Ctrl + Shift + E` with passcode protection (`window.STUDIO_PASSCODE` in `firebase-config.js`).
- **Installable PWA** — Offline caching via `sw.js` and custom SVG iconography.
- **Zero-Build Static Architecture** — Runs directly on Cloudflare Workers Static Assets, GitHub Pages, or any static host with no bundler required.

---

## Local Preview

Open `index.html` directly in any browser, or run a local static server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

---

## Deployment

### Cloudflare Workers (Automated via GitHub Actions)

1. Push this repository to GitHub.
2. In your GitHub repository, go to **Settings → Secrets and variables → Actions** and add:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. Every push to `main` automatically deploys to `https://bethany-hope-leeman.nkentekhiwe.workers.dev` via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

---

## Copyright

© 2026 **Bethany Hope Leeman**. All rights reserved. All photographs, paintings, textiles, and images are produced and made by Bethany Hope Leeman.
