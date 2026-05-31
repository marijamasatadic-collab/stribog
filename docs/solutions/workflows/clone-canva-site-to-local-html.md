---
title: Clone a Canva-Published Website to Local HTML
date: 2026-05-08
category: workflows
tags: [canva, html-clone, css, web-scraping, chrome-devtools-mcp, static-site, image-download]
problem_type: website-preservation
components: [chrome-devtools-mcp, html, css, python-http-server]
status: resolved
---

# Clone a Canva-Published Website to Local HTML

## Context

Canva websites are rendered as JavaScript-driven presentations with no native HTML export.
This documents the full workflow used to reverse-engineer the **STRIBOG Salon za masažu**
Canva site into a self-contained local HTML/CSS clone with all assets saved locally.

**Original:** `https://www.canva.com/design/DAG-lGQ7_Pk/_RCSHLf8TlvBd5nGPVr7uA/view`  
**Output:** `/Users/ljubisabugarski/Documents/learning/stribog/index.html` + `assets/images/` (17 images)

---

## What Was Built

| Section | Content | Notes |
|---|---|---|
| **Header** | Dark green `#266A60`, gold `#C8B272` brand text | Nav bar **added** (missing in Canva) |
| **Hero** | Stribog logo left, italic gold tagline centered, CTA buttons | Live Google Maps circle (replaced blob: URL) |
| **Services Overview** | 2×2 grid — MASAŽE, DUO MASAŽE, TRETMANI TELA, KORPORATIVNE MASAŽE | Images per card |
| **Category Pills** | Rounded pill links for all massage types | Beige + teal variants |
| **USLUGE** | Full price list — RELAX, TERAPEUTSKA, SPORTSKA, LIMFNA DRENAŽA, etc. | + SPA tretmani + Paketi sections |
| **Image Strip** | 3-column photo band | Full viewport width |
| **Masaža Lica** | Split layout — text + price table + facial image | |
| **SPA Tretmani** | Full-bleed spa background image, 3 therapist cards | Milica / Dragica / Slavica |
| **Poklon Vaučer** | Cream bg, both voucher images, "Kako poručiti?" instructions | |
| **Korporativne** | Dark office background image, corporate offer card | |
| **Ko je Stribog / O NAMA** | Cream bg, deity AI image + full mythology text | |
| **Kontakt** | Dark green bg, all contact details, social icons, doorway photo | |

---

## Solution

### Investigation

The Canva viewer renders all slides in a single scrollable DOM — no lazy loading.
All content is accessible via `evaluate_script` without paginating through slides.

Key extraction sequence:
1. Open page → wait for `.onhyOQ` containers to exist
2. Enumerate slides → extract text, positions, colors per slide
3. Read `@font-face` rules from `document.styleSheets` → identify font
4. Collect all `<img>` `src` attributes → separate signed vs public URLs
5. Download signed URLs immediately (expire same day)
6. Navigate through Canva pages with the "Next page" button to capture visuals

### Design Tokens Extracted

```
Font:        Montserrat (from @font-face src URL containing "Montserrat")
Dark green:  #266A60  →  rgb(38, 106, 96)
Gold:        #C8B272  →  rgb(200, 178, 114)
Cream:       #FFF8E3  →  rgb(255, 248, 227)
Beige:       #EDE4CC  (service card headers)
```

### Image URL Types Encountered

| Pattern | Type | Action |
|---|---|---|
| `media-public.canva.com/...` | Public CDN | Reference directly or download — permanent |
| `media.canva.com/v2/image-resize?...csig=...exp=...` | Signed / expiring | **Download immediately** via curl |
| `blob:https://www.canva.com/...` | In-memory blob | Convert in-page with `canvas.toDataURL()` or skip |

### Steps

1. **Navigate** to the Canva URL via `mcp__chrome-devtools__new_page`
2. **Extract all slide content** in one `evaluate_script` pass (see reusable script below)
3. **Identify font** via `@font-face` CSS rules (not `getComputedStyle`)
4. **Extract colors** from computed styles of leaf elements (not wrappers)
5. **Collect all image URLs**, sort into signed / public / blob buckets
6. **Download signed images immediately** — they expire within hours:
   ```bash
   curl -sL "<signed-url>" -o assets/images/filename.png
   ```
7. **Download public images** for offline reliability:
   ```bash
   curl -sL "https://media-public.canva.com/..." -o assets/images/filename.jpg
   ```
8. **Navigate through pages** using the Canva viewer's "Next page" button to visually verify each section
9. **Build `index.html`** as a single file with all sections as `<section id="...">` anchors
10. **Add missing nav bar** (the Canva design had none) with links to all sections
11. **Replace blob: map URL** with a Google Maps `<iframe>` embed
12. **Serve locally** to verify:
    ```bash
    cd /path/to/project && python3 -m http.server 5500
    ```

### Key Code Snippets

**Font detection (correct method):**
```js
const fontFaces = [];
for (const sheet of document.styleSheets) {
  try {
    for (const rule of sheet.cssRules) {
      if (rule instanceof CSSFontFaceRule) {
        fontFaces.push({
          family: rule.style.getPropertyValue('font-family'),
          src: rule.style.getPropertyValue('src'),
        });
      }
    }
  } catch (_) {} // skip cross-origin sheets
}
// Canva obfuscates family names — search src URL for actual font name
fontFaces.filter(f => f.src.includes('Montserrat'));
```

**Color extraction from leaf elements:**
```js
const paragraphs = Array.from(document.querySelectorAll('p, span'));
paragraphs.map(p => {
  const cs = window.getComputedStyle(p);
  return { text: p.innerText?.slice(0, 40), color: cs.color, fontSize: cs.fontSize };
}).filter(p => p.text);
```

**All images in one pass:**
```js
Array.from(document.querySelectorAll('img'))
  .map(img => ({ src: img.src, alt: img.alt }))
  .filter(img => img.src && !img.src.includes('static.canva.com'));
```

**CSS design tokens:**
```css
:root {
  --green:      #266A60;
  --gold:       #C8B272;
  --green-dark: #1a4a42;
  --gold-dark:  #a8935a;
  --cream:      #FFF8E3;
  --beige:      #EDE4CC;
  --font:       'Montserrat', sans-serif;
}
```

**Sticky nav (added — was missing from Canva):**
```html
<header style="position:sticky; top:0; background:#266A60; z-index:100;">
  <div class="header-inner">
    <a href="#home" class="brand">
      <span class="brand-name">STRIBOG</span>
      <span class="brand-sub">SALON ZA MASAŽU</span>
    </a>
    <nav class="main-nav">
      <a href="#masaze">MASAŽE</a>
      <a href="#usluge">USLUGE</a>
      <a href="#spa">SPA TRETMANI</a>
      <a href="#masaza-lica">MASAŽA LICA</a>
      <a href="#vaucer">POKLON VAUČER</a>
      <a href="#o-nama">O NAMA</a>
      <a href="#kontakt">KONTAKT</a>
    </nav>
    <div class="header-location">🌐 Zemun / Novi Beograd</div>
  </div>
</header>
```

**Google Maps embed replacing blob: URL:**
```html
<div style="width:160px; height:160px; border-radius:50%; overflow:hidden; border:3px solid #266A60;">
  <iframe
    src="https://www.google.com/maps/embed?pb=!1m18!...!2sBeograd"
    style="border:0; width:100%; height:100%;"
    loading="lazy" allowfullscreen>
  </iframe>
</div>
```

### File Structure

```
stribog/
├── index.html                    (~46 KB, single-page site)
├── docs/
│   └── solutions/
│       └── workflows/
│           └── clone-canva-site-to-local-html.md
└── assets/
    └── images/
        ├── logo-stribog.png       (private — downloaded from signed URL)
        ├── spa-bg.png             (private — downloaded from signed URL)
        ├── voucher-bg1.png        (private — downloaded from signed URL)
        ├── voucher-bg2.png        (private — downloaded from signed URL)
        ├── stribog-deity.png      (private — downloaded from signed URL)
        ├── couple-massage.jpg     (public CDN)
        ├── women-bathrobes.jpg    (public CDN)
        ├── therapist-head.jpg     (public CDN)
        ├── massage-strip1.jpg     (public CDN)
        ├── massage-table.jpg      (public CDN)
        ├── spa-table.jpg          (public CDN)
        ├── facial-massage.png     (public CDN)
        ├── woman-meditating.png   (public CDN)
        ├── person-massage.jpg     (public CDN)
        ├── doorway.jpg            (public CDN)
        ├── icon-email.png         (public CDN)
        ├── icon-instagram.png     (public CDN)
        └── icon-whatsapp.png      (public CDN)
```

---

## Prevention & Best Practices

### 1. Signed Image URLs Expire the Same Day

Canva signed URLs contain `csig=` and `exp=` (Unix timestamp). Parse `exp=` to check validity — download immediately, never queue for later.

```js
const exp = new URL(src).searchParams.get('exp');
if (exp && Date.now() / 1000 > parseInt(exp)) {
  console.warn('Already expired:', src);
}
```

### 2. Font Detection — Use `@font-face`, Not `getComputedStyle`

`getComputedStyle(el).fontFamily` returns Canva's obfuscated internal names (e.g. `YAFdtQi73Xs_0`). The actual font name is only in the `src:` URL of the `@font-face` rule (e.g. `Montserrat-Regular.woff2`).

### 3. Blob URLs Are Tab-Scoped — Convert In-Page or Skip

```js
async function blobToBase64(blobUrl) {
  const resp = await fetch(blobUrl);
  const blob = await resp.blob();
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}
```

### 4. Extract Colors From Leaf Nodes Only

Parent/wrapper divs return `transparent`. Target actual `<p>`, `<span>`, or `<svg>` elements for reliable color values.

### 5. All Slides Are in the DOM at Once

Canva renders the full presentation into one scrollable container. One `querySelectorAll('.onhyOQ')` returns all slides — no scrolling or pagination needed.

### 6. Image URL Bucketing Rule

After extracting all `img.src` values, sort into three buckets before acting:

| Bucket | Pattern | Action |
|---|---|---|
| Public | `media-public.canva.com` | OK to embed by URL or download |
| Signed | `media.canva.com/v2/image-resize?...csig=` | Download immediately with curl |
| Blob | `blob:https://www.canva.com/` | Convert in-page or skip |

---

## Reusable Script — Full Slide Extraction

Run via `evaluate_script` after the Canva page has fully loaded:

```js
const extractAll = () => {
  // Slides
  const slides = Array.from(document.querySelectorAll('.onhyOQ'));
  const slideData = slides.map((slide, i) => ({
    index: i,
    width: slide.style.width,
    height: slide.style.height,
    text: slide.innerText?.slice(0, 800),
    images: Array.from(slide.querySelectorAll('img')).map(img => ({
      src: img.src, alt: img.alt
    })),
    bgColors: Array.from(slide.querySelectorAll('[style*="background"]'))
      .map(el => el.style.background || el.style.backgroundColor)
      .filter(c => c && c !== 'transparent')
  }));

  // @font-face rules
  const fontFaces = [];
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule instanceof CSSFontFaceRule) {
          fontFaces.push(rule.cssText.slice(0, 200));
        }
      }
    } catch (_) {}
  }

  // All images on page
  const allImages = Array.from(document.querySelectorAll('img'))
    .map(img => ({ src: img.src, alt: img.alt }))
    .filter(img => img.src && !img.src.includes('static.canva.com'));

  return { slideData, fontFaces: fontFaces.slice(0, 5), allImages };
};

JSON.stringify(extractAll(), null, 2);
```
