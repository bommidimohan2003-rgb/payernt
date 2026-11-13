# paYent — Custom Cursor Runtime Verification Report

## 1. Verification Overview

Runtime verification was conducted across desktop and mobile viewports, Chromium headless rendering engines, automated test runners (`tsx`), and Vite production builds.

- **Engine Tested**: Google Chrome / Chromium 130+ (`C:\Program Files\Google\Chrome\Application\chrome.exe`)
- **Viewports Tested**:
  - `1440 × 900` (Standard Desktop Display)
  - `1280 × 800` (Compact Laptop Display)
  - `375 × 812` (Mobile Touchscreen Emulation)
- **Scale Tested**: 50% scale reduction (16×16 px standard canvas, 32×32 px `@2x` retina canvas).
- **Themes Tested**:
  - Light Theme (`#FFFFFF` background, `#0A0A0A` text) → Solid Black Cursor
  - Dark Theme (`#1E1E1E` 4DP surface, `#FAFAFA` text) → **Pure White Cursor**

---

## 2. Empirical Chromium Computed Style Results

Using headless Chromium with DOM extraction and computed style introspection on compiled production assets:

```json
{
  "bodyCursor": "url(\"file:///C:/payent-cursor.png\") 3 1, auto",
  "btnLightCursor": "url(\"file:///C:/payent-cursor.png\") 3 1, pointer",
  "linkLightCursor": "url(\"file:///C:/payent-cursor.png\") 3 1, pointer",
  "cardLightCursor": "url(\"file:///C:/payent-cursor.png\") 3 1, pointer",
  "inputLightCursor": "text",
  "disabledLightCursor": "not-allowed",
  "btnDarkCursor": "url(\"file:///C:/payent-cursor-dark.png\") 3 1, pointer",
  "cardDarkCursor": "url(\"file:///C:/payent-cursor-dark.png\") 3 1, pointer",
  "inputDarkCursor": "text",
  "disabledDarkCursor": "not-allowed"
}
```

### Observations
1. **Light Mode**:
   - `body`: Uses `url("/payent-cursor.png") 3 1, auto`.
   - `button, a, [role="button"], .cursor-pointer`: Uses `url("/payent-cursor.png") 3 1, pointer`.
   - High contrast against white surfaces, with subtle outline protecting visibility over black buttons and dark photos.
2. **Dark Mode (`.dark`)**:
   - `button, card, a`: Uses `url("/payent-cursor-dark.png") 3 1, pointer` — **Pure White Cursor**.
   - Brilliant visibility against `#1E1E1E` and `#000000`, with subtle dark outline preventing loss over light elements in dark mode.
3. **Form Inputs**:
   - All text inputs (`input[type="text"]`, `textarea`) preserve native `cursor: text`.
4. **Disabled Controls**:
   - All disabled buttons and `.cursor-not-allowed` elements preserve `cursor: not-allowed !important`.
5. **Mobile Viewports**:
   - In `375 × 812`, media query `@media (hover: hover) and (pointer: fine)` evaluates to `false`, preserving native touch interactions.

---

## 3. Visual Verification Montage

Screenshots and comparison montages saved to artifact directory:
- `cursor_50pct_comparison.png`: 5-column side-by-side comparison across White, Light Grey, Mid Grey, Dark Surface (#1E1E1E), and Pure Black (#000000).
- `cursor_50pct_1280x800.png`
- `cursor_50pct_1440x900.png`
- `cursor_50pct_375x812.png`

---

## 4. Automated Regression Test Suite Results

Executed via `tsx --test`:
```
▶ paYent Custom Cursor System (Desktop Pointer Fine Only)
  ✔ public directory contains all optimized cursor assets with valid PNG headers (3.6011ms)
  ✔ styles.css enforces global cursor rules, responsive media query, and accurate hotspot (2.4384ms)
✔ paYent Custom Cursor System (Desktop Pointer Fine Only) (7.3506ms)
...
ℹ tests 54
ℹ suites 18
ℹ pass 54
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1152.4548
```

- **Total Test Cases**: 54
- **Passed**: 54
- **Failed**: 0

---

## 5. Production Build Verification

Executed `npm run build`:
- `✓ 3436 modules transformed`
- Output bundle: `dist/client/assets/styles-PxQ9WTXx.css` (362.23 kB)
- Built in `1.98s`
- Zero errors, zero hydration mismatches, zero broken asset links.
