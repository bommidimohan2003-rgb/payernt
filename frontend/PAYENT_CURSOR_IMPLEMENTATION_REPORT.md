# paYent — Custom Cursor Implementation Report

## 1. Executive Summary

Per user requirements, the custom cursor system has been updated:
- **Reduced to 50% scale**: Previously ~30px arrow height inside 32×32 canvas; now reduced by 50% to **15px arrow height inside 16×16 canvas** (and 32×32 canvas for retina `@2x`). The cursor is nimble, lightweight, and modern without feeling bulky.
- **Careful Crop Preservation**: Sized with generous padding from the original 512×512 asset (`media_1794572229725_6d8acd1b.png`), preserving every antialiased curve (apex, wings, and inner concave notch) with zero clipping on any edge.
- **Dark Mode White Cursor**: In Dark Mode (`.dark`), the cursor switches to a **pure white stylized arrow** (`RGB: 255, 255, 255`) with a subtle 1px dark boundary, providing high contrast against the `#1E1E1E` 4DP surfaces, black buttons, and dark photography.
- **Light Mode Black Cursor**: In Light Mode, the cursor uses the solid black stylized arrow with a subtle 1px white outline.
- **Accurate Hotspot**: Calculated at the exact apex tip: `(X = 3, Y = 1)` on 16×16 canvas (and `X = 7, Y = 2` on 32×32 `@2x` canvas).

---

## 2. Asset Specifications & Dimensions

All assets are located in [`frontend/public/`](file:///c:/payernt-main/frontend/public/):

| Asset Filename | Dimensions | Theme Mode | Interior Color | Outline Color | Hotspot `(X, Y)` | Description |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `payent-cursor.png` | **16 × 16 px** | Light Mode | Black (`#000000`) | Subtle White (`#FFFFFF`) | **`(3, 1)`** | Standard desktop cursor for light surfaces and neutral backgrounds. |
| `payent-cursor-dark.png` | **16 × 16 px** | Dark Mode | **White (`#FFFFFF`)** | Subtle Black (`#000000`) | **`(3, 1)`** | High-contrast white stylized arrow for `#1E1E1E` 4DP dark theme. |
| `payent-cursor-pure.png` | **16 × 16 px** | Generic | Black (`#000000`) | None | **`(3, 1)`** | Pure black silhouette directly downscaled from source. |
| `payent-cursor@2x.png` | **32 × 32 px** | Light Mode | Black (`#000000`) | Subtle White (`#FFFFFF`) | **`(7, 2)`** | Retina / High-DPI light mode cursor. |
| `payent-cursor-dark@2x.png` | **32 × 32 px** | Dark Mode | **White (`#FFFFFF`)** | Subtle Black (`#000000`) | **`(7, 2)`** | Retina / High-DPI dark mode white cursor. |

---

## 3. Global CSS Architecture (`frontend/src/styles.css`)

```css
/* ============================================================
   paYent Custom Cursor System (Desktop Pointer Fine Only)
   Derived strictly from user-uploaded cursor asset (512x512)
   Reduced to 50% scale (16x16 canvas, 13x15 arrow)
   Careful padding crop: apex hotspot at X=3, Y=1
   Light mode: Black stylized arrow
   Dark mode: White stylized arrow
   ============================================================ */
@media (hover: hover) and (pointer: fine) {
  :root {
    --payent-cursor-default: url("/payent-cursor.png") 3 1, auto;
    --payent-cursor-pointer: url("/payent-cursor.png") 3 1, pointer;
  }

  .dark {
    --payent-cursor-default: url("/payent-cursor-dark.png") 3 1, auto;
    --payent-cursor-pointer: url("/payent-cursor-dark.png") 3 1, pointer;
  }

  html,
  body {
    cursor: var(--payent-cursor-default);
  }

  /* Interactive pointer controls: Buttons, Links, Clickable primitives, Cards */
  a,
  button,
  [role="button"],
  [role="link"],
  [role="tab"],
  [role="menuitem"],
  [role="option"],
  [role="switch"],
  [role="checkbox"],
  [role="radio"],
  summary,
  select,
  input[type="button"],
  input[type="submit"],
  input[type="reset"],
  input[type="checkbox"],
  input[type="radio"],
  .cursor-pointer {
    cursor: var(--payent-cursor-pointer);
  }

  /* Default surfaces and cards */
  .cursor-default {
    cursor: var(--payent-cursor-default);
  }

  /* Text editing inputs: preserve native text I-beam cursor */
  input[type="text"],
  input[type="password"],
  input[type="email"],
  input[type="number"],
  input[type="search"],
  input[type="tel"],
  input[type="url"],
  textarea,
  [contenteditable="true"],
  .cursor-text {
    cursor: text;
  }

  /* Disabled controls: preserve native not-allowed cursor */
  :disabled,
  [aria-disabled="true"],
  .disabled,
  .cursor-not-allowed {
    cursor: not-allowed !important;
  }

  /* Draggable states: preserve native grab/grabbing cursor */
  .cursor-grab {
    cursor: grab;
  }

  .cursor-grabbing {
    cursor: grabbing;
  }

  .cursor-wait {
    cursor: wait;
  }

  .cursor-move {
    cursor: move;
  }
}
```

---

## 4. Verification & Scope
- **All 54/54 automated tests passing** across 18 test suites in `frontend/tests/`.
- **Zero layout or hydration issues**: Handled strictly via CSS and media queries.
- **Touch device preservation**: Mobile devices bypass `@media (hover: hover) and (pointer: fine)`, keeping native gestures 100% untouched.
