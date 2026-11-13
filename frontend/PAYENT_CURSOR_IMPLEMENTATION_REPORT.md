# paYent — Custom Cursor Implementation Report

## 1. Executive Summary

As requested, the exact custom cursor from the attached user asset (`cursor.png` / `media_1794572229725_6d8acd1b.png`) has been integrated across the entire paYent platform.

The cursor is implemented exclusively via global CSS architecture (`frontend/src/styles.css`), ensuring:
- **Zero JavaScript overhead**: No `mousemove` listeners, animation loops, or fake DOM cursors.
- **Hardware-accelerated native rendering**: OS-level cursor movement with zero latency or jitter.
- **Zero hydration mismatch risk**: 100% CSS-driven with responsive media queries.
- **Full touch preservation**: Touch devices (smartphones, tablets without mouse) retain native touch interactions without mouse cursor emulation.
- **High-contrast readability across themes**: Optimized universal dual-tone crisp outline derived strictly from the original silhouette, rendering clearly on `#FFFFFF` light theme, `#1E1E1E` 4DP dark theme, black buttons (`bg-neutral-950`), dark modal overlays, and tech gear photography.

---

## 2. Asset Inspection & Optimization Analysis

### 2.1 Original Asset Analysis
- **Source File**: `media_1794572229725_6d8acd1b.png`
- **Format**: 32-bit PNG with RGBA transparency.
- **Canvas Dimensions**: 512 × 512 px.
- **Color Profile**: Solid black arrow silhouette (`RGB: 0, 0, 0`) with antialiased transparent alpha edge.
- **Content Bounding Box**:
  - `xmin = 128`, `xmax = 447` (Width: 320 px)
  - `ymin = 63`, `ymax = 447` (Height: 385 px)
- **Topmost Arrow Apex (Click Hotspot)**:
  - Coordinate: `(X = 172.0, Y = 64.0)`

### 2.2 Browser Constraints & Cursor Optimization
Modern browsers (Chromium, Firefox, Safari, WebKit) enforce strict dimensions for CSS custom cursors (`cursor: url(...) X Y, auto`). While standard maximum supported cursor dimensions are 128×128, standard desktop cursors render at **32 × 32 CSS pixels** (and 64 × 64 for retina `@2x` displays). Uncropped 512×512 images either fail to display or cause severe performance penalties.

### 2.3 Generated Production Assets in `frontend/public/`
The assets were derived directly from the original asset without altering the silhouette geometry:

| Asset Filename | Canvas Size | Bounding Content | Hotspot `(X, Y)` | Purpose |
| :--- | :---: | :---: | :---: | :--- |
| `payent-cursor.png` | **32 × 32 px** | 25 × 30 px | **(5, 2)** | Primary universal cursor with subtle 1px white outline for universal light/dark visibility. |
| `payent-cursor-dark.png` | **32 × 32 px** | 25 × 30 px | **(5, 2)** | Dark theme variant for `#1E1E1E` surface optimization. |
| `payent-cursor-pure.png` | **32 × 32 px** | 24 × 29 px | **(4, 1)** | Pure black original silhouette without outline. |
| `payent-cursor@2x.png` | **64 × 64 px** | 50 × 60 px | **(10, 3)** | High-DPI / Retina display asset. |

---

## 3. Hotspot Coordinate Derivation

To ensure the user clicks with the exact tip of the arrow rather than its bounding box center:

1. **Original Apex**: In the 512×512 canvas, the topmost curve is centered at `(172, 64)`.
2. **Padding Crop**: Dilated outline bounding box begins at `xmin_o = 120`, `ymin_o = 55`.
3. **Scaling Factor**: `scale = 30.0 / 401.0 ≈ 0.07481`.
4. **Canvas Offset**: `offset_x = 1`, `offset_y = 1`.
5. **Exact Calculation**:
   $$\text{Hotspot}_X = \text{round}((172.0 - 120) \times 0.07481 + 1) = 5$$
   $$\text{Hotspot}_Y = \text{round}((64.0 - 55) \times 0.07481 + 1) = 2$$

Verification on the 32×32 pixel array:
- `y = 1, x = 5`: Antialiased tip apex outline (`RGBA: 163, 163, 163, 226`).
- `y = 2, x = 5`: Solid black interior arrow point (`RGBA: 0, 0, 0, 255`).
- The entire arrow body cascades downwards and rightwards from `(5, 2)`, perfectly mirroring ergonomic OS pointer dynamics.

---

## 4. Global CSS Architecture (`frontend/src/styles.css`)

The cursor is configured in `frontend/src/styles.css` using modern Tailwind CSS v4 and native CSS custom properties scoped to fine pointer desktop environments:

```css
/* ============================================================
   paYent Custom Cursor System (Desktop Pointer Fine Only)
   Derived strictly from user-uploaded cursor asset (512x512)
   Calculated apex hotspot: X=5, Y=2 on 32x32 canvas
   ============================================================ */
@media (hover: hover) and (pointer: fine) {
  :root {
    --payent-cursor-default: url("/payent-cursor.png") 5 2, auto;
    --payent-cursor-pointer: url("/payent-cursor.png") 5 2, pointer;
  }

  .dark {
    --payent-cursor-default: url("/payent-cursor-dark.png") 5 2, auto;
    --payent-cursor-pointer: url("/payent-cursor-dark.png") 5 2, pointer;
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

## 5. Scope of Application Across Entire Application

Because `cursor` is an inherited CSS property applied to `html, body` and interactive selectors, the custom cursor automatically applies to:
- **Storefront & Navigation**: Home (`/payent`), Hero, Explore Rentals, Browse (`/browse`), Categories, Dock, Navbar, and Footer.
- **Product Flow**: Product Details (`/product/$id`), Product Selection, Rental Date Picker, and Review modals.
- **Customer Account**: Orders (`/orders`), Bookings, Wishlist (`/wishlist`), Profile (`/profile`), and KYC Verification modals.
- **Interactive Layers**: Search Overlay (`Ctrl+K`), Radix Dialogs, Dropdowns, Sheets, Tooltips, and Toast notifications.
- **Admin Suite**: Dashboard (`/admin`), Activity Logs, Agents, Users, Reports, and Inventory Management.

---

## 6. Files Modified and Created

1. **`frontend/public/payent-cursor.png`** (Created, 1,139 bytes): Primary 32×32 PNG asset with subtle white outline.
2. **`frontend/public/payent-cursor-dark.png`** (Created, 1,139 bytes): Dark theme 32×32 PNG asset.
3. **`frontend/public/payent-cursor-pure.png`** (Created, 481 bytes): Pure black 32×32 PNG asset.
4. **`frontend/public/payent-cursor@2x.png`** (Created, 2,338 bytes): Retina 64×64 PNG asset.
5. **`frontend/src/styles.css`** (Modified): Global CSS rules scoped to `@media (hover: hover) and (pointer: fine)`.
6. **`frontend/tests/cursor.test.ts`** (Created): Automated unit tests verifying asset integrity and CSS rule invariants.
