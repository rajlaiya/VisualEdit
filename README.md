# VEdit — Simple Video Editor Landing Page

A lightweight, responsive landing page for a video editor app featuring smooth scrolling powered by Locomotive Scroll.

## What's inside

- HTML with semantic sections: Hero, Features, Gallery (parallax), CTA, Footer
- CSS for a clean, modern look with responsive layout
- JS to initialize Locomotive Scroll and handle anchor navigation

## Run locally (Windows)

You can open `index.html` directly in your browser. For best results with cross-origin image policies and smooth scrolling, use a simple static server.

### Option 1: PowerShell (Python)

If Python is installed:

```powershell
# in this folder
python -m http.server 5500
```

Then open: http://localhost:5500/

### Option 2: Node (http-server)

If you have Node.js installed, you can use `npx`:

```powershell
npx http-server -p 5500 -c-1
```

## Edit points

- Update images in the Gallery section inside `index.html`.
- Adjust colors and spacing via CSS custom properties at the top of `styles.css`.
- Tweak Locomotive Scroll options in `script.js` (lerp, multiplier, offsets).

## Notes

- This page uses the Locomotive Scroll CDN (v4.1.4). If the CDN fails to load, the JS falls back to native smooth scrolling for anchor links.
- Decorative parallax elements use `data-scroll-speed` to create subtle depth.

---

Made with ❤️ and smooth scrolling.
