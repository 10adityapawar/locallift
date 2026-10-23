# LocalLift: Small shops. Big reach.

A clickable demo app for our WPC 101 Spark Tank pitch. LocalLift lists **only verified small businesses**. Shoppers find them by location and interest, and owners see who's viewing them and get AI help with their profile.

It's a web app that you can also **add to your phone's home screen** (a "PWA"). It works offline after the first visit. Everything is fake demo data around ASU Tempe, so there are no accounts and no server database.

## Run it on your computer

You need Python (already on most computers). In this folder, run:

```bash
python -m http.server 8080
```

Then open http://localhost:8080 in Chrome.

> Opening `index.html` by double-clicking won't work, because browsers block the app's scripts from `file://`.

## Put it online (so it installs on phones)

Phones only let you "Add to Home Screen" as an app from an `https://` site. Either option is free:

- **Netlify Drop (easiest):** go to https://app.netlify.com/drop and drag this whole folder onto the page. You get a link like `https://something.netlify.app`.
- **GitHub Pages:** push this folder to a GitHub repo, then go to Settings → Pages → Deploy from branch → `main` / root.

### Install on a phone
- **iPhone (Safari):** open the link → Share button → **Add to Home Screen**.
- **Android (Chrome):** open the link → ⋮ menu → **Install app**. You can also use **⋯ → Add to home screen** inside LocalLift.

## What's in the demo

| Shop mode (customers) | Business mode (owners) |
|---|---|
| **For You** feed ranked by interests, taps, distance and deals, with a "why you're seeing this" note on each shop | **Dashboard**: views, taps, saves, a 7- or 30-day chart and a live counter |
| **Discover**: search, category filters, Open now / Has deal, and a mini map around the MU | **Who viewed you**: anonymous shoppers' interests and distance |
| **Deals**: unlock coupon codes, plus a welcome offer | **AI insights**: tips based on your own data |
| **Shop profiles** with the Verified Small Business badge | **AI Profile Assistant**: writes 3 bio options, suggests tags and writes product descriptions |
| **Saved** favorites | **Plans**: Starter (free), Pro $14.99/mo, Growth $29.99/mo, with a 50% off launch promo |
| | **List your business**: the small-business check (must be under $1M in sales and under 50 employees) |

Use the **Shop / Business** toggle at the top to switch sides. Use **⋯ → Reset demo** before every presentation.

## Suggested live demo (about 90 seconds of your pitch)

1. **⋯ → Reset demo.** Tap **I'm shopping local**, then pick Coffee, Vintage and Thrift. *"Shoppers tell us what they're into."*
2. **For You:** point to the ✨ reasons. *"Our AI explains every recommendation."* Open **Saguaro Sips** and tap a product.
3. Switch to **Business**. The dashboard shows **"live today"** and the *Shopper on this device* row with a LIVE tag. *"That was us, a second ago. Owners see who's interested, not just how many."*
4. **Profile → ✨ Write my bio.** *"Most small-business owners aren't marketers, so AI writes the profile for them."*
5. **Dashboard → ＋ List another business.** Enter a giant company (e.g. $50,000,000 sales, 2,000 employees) and show the rejection. *"No chains allowed. That's our differentiator."*
6. Finish on **Plans**. *"Free to join, $14.99 a month for the tools that grow you."*

## Change things

- **App name / slogan:** `js/data.js` (`APP`), `index.html` (`<title>` and the brand text) and `manifest.webmanifest`.
- **Businesses, products, deals, prices, plans:** all in `js/data.js`.
- **Colors:** the top of `css/styles.css` (`--brand` is maroon, `--gold` is gold).
- **Icons:** `icons/icon.svg`. The PNGs were made from the same design.
- After changing files on a live site, bump `VERSION` in `sw.js` so installed phones pick up the update.

## Files

```
index.html             app shell
css/styles.css         all styling (light + dark mode)
js/app.js              screens, navigation, buttons
js/data.js             demo businesses, interests, plans
js/store.js            saved state + analytics numbers
js/recommend.js        the For You ranking
js/ai.js               simulated AI (bios, tags, insights)
js/charts.js           small SVG charts
manifest.webmanifest   makes it installable
sw.js                  offline support
icons/                 app icons
```

All businesses in the demo are fictional.
