# NOVA Ring — Store Website

Single-page static site for NOVA Ring, a Dubai-based smart ring boutique. Plain HTML/CSS/JS — no build step.

## Run locally

```
npx serve .
```

Then open the printed `http://localhost:...` URL. (Avoid `python3 -m http.server` for local testing — it doesn't support HTTP Range requests, which some browsers need to start playing the hero video. Any real host — Netlify, Vercel, GitHub Pages, Nginx — supports Range natively, so this only matters for local preview.)

## Structure

```
index.html
assets/
  css/style.css
  js/main.js
  img/favicon.svg
    hero-poster.jpg   — poster frame shown while the hero video loads
  video/
    hero-ring.mp4      — H.264, broad browser support
    hero-ring.webm     — VP9, smaller/sharper where supported
```

## Hero video

The hero plays `assets/video/hero-ring.webm` (falling back to `hero-ring.mp4`), with `assets/img/hero-poster.jpg` as the poster frame shown while it loads — a vertical, dark-background clip of the ring with its "Dola AI" watermark removed and re-encoded from the original upload. If both video sources ever fail to load, `main.js` automatically swaps in an animated CSS/SVG ring graphic instead, so the hero never breaks.

These 3 files are binary, so they were handed back separately rather than committed through this PR — add them at the paths above (see the PR description / chat for the files) and the hero switches from the CSS fallback to the real video automatically, no code changes needed.

## Placeholders to replace before launch

- **Address** — Contact Information section (`index.html`, "Address" block) currently has a generic Downtown Dubai placeholder.
- **Phone / WhatsApp / Email** — placeholder numbers/domain in the same section and in the floating WhatsApp button (`wa.me/971500001234`).
- **Social links** — Instagram/TikTok icons currently link to `#`.
- **Consultation form** — client-side only right now (shows a confirmation message but doesn't send anywhere). Wire it to an email service (e.g. Formspree) or backend endpoint when ready.
- **Pricing/specs** — sample AED pricing and specs for the 4 models (Silver Classic/Pro, Gold Classic/Pro); update to match real inventory.
