# Bethany Hope Leeman — Portfolio 2026

> *Painting, Textiles, Pressed Botanicals & Photography — South Africa*

**Live Site:** [bethany-hope-leeman.nkentekhiwe.workers.dev](https://bethany-hope-leeman.nkentekhiwe.workers.dev)  
**Instagram:** [@bethany.leaman](https://www.instagram.com/bethany.leaman/)  
**Studio Inquiries:** [studio@bethanyleeman.com](mailto:studio@bethanyleeman.com)

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
├── LICENSE                # Copyright & rights reservation
└── README.md              # Documentation & guide
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

The portfolio is deployed live on **Cloudflare Workers Static Assets** at [bethany-hope-leeman.nkentekhiwe.workers.dev](https://bethany-hope-leeman.nkentekhiwe.workers.dev).

Any updates saved locally or in Antigravity are automatically synchronized to the live site. Because this is a zero-build static application, it can also be hosted on GitHub Pages or any static CDN.

---

## Copyright

© 2026 **Bethany Hope Leeman**. All rights reserved. All photographs, paintings, textiles, and images are produced and made by Bethany Hope Leeman.
