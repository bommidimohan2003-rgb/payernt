# paYent Frontend — Unslop UI/UX & Engineering Audit Report

> **Audit Mode**: Strict Installation & Audit Only (Zero production code, styles, routes, APIs, backend, or `package.json` modified)  
> **Official Skill Credit**: Built using [unslop](https://github.com/heydamir/unslop) by Damir Sokolovsky (`@heydamir`, CC BY 4.0)  
> **Audit Date**: 2026-11-09  
> **Resolved Project Root**: `C:\payernt-main\payernt-main\frontend\` *(Prompt referenced `C:\payERNT\frontend\`, which does not exist on disk; all work was executed in the actual project workspace.)*

---

## 1. Executive Summary

### Overall UI Quality
The **paYent Rentals Home Page** (`frontend/src/pages/Home.tsx` and `frontend/src/components/home/*`) is in **light-to-moderate slop / clean architectural shape** on desktop: it maintains a disciplined monochrome Light/Dark palette (`bg-white` / `dark:bg-neutral-950`), clean Lucide line icons, a clear editorial Hero composition matching the approved brief, and structured product grids.

By contrast, the **global stylesheet and Secondary Pages** (`frontend/src/styles.css`, `ProductDetails.tsx`, `Categories.tsx`, `Filters.tsx`, `Wishlist.tsx`, `Profile.tsx`, `Orders.tsx`) exhibit **heavy design-system drift and functional fragility**. Cobalt-blue gradients (`btn-gradient`, `--primary: #2868E8`/`#4D8DFF`), multi-hue SaaS pill badges (`emerald`, `sky`, `purple`, `indigo`, `amber`, `rose`, `red`, `#16A36A`, `#8FAF7E`), `#1E1E1E` vs `#0A0A0A` dark surface conflicts, broken cross-page URL params, keyboard-inaccessible filter checkboxes, fake fallback data masking missing records, and compile/runtime bugs degrade the end-to-end user journey.

### Main Strengths
- **Strict Monochrome Home Surfaces (`Home.tsx`, `Hero.tsx`, `Navbar.tsx`, `RentalProductCard.tsx`, `Footer.tsx`)**: Zero colored gradients, neon glows, or decorative emojis on the core Rentals Home sections; clean `dark:bg-neutral-950` / `bg-white` parity.
- **Approved Studio Hero Composition (`Hero.tsx`)**: Preserves the approved split layout (`Rent Anything` / `You Need`, monochrome divider, `"Get What You Need, Without Owning It."`, single `"Explore Rentals"` CTA, and the silver laptop, black headphones, and DSLR camera trio with matched Light/Dark WebP assets).
- **Thoughtful Logged-In Privacy & Empty-Section Handling (`RecentlyViewed.tsx`, `RecommendedForYou.tsx`)**: Both sections cleanly hide themselves (`return null`) for logged-out visitors rather than cluttering the Home Page with empty placeholder boxes, and **no Dual-Side Colour Fill button animation** remains in `Button.tsx`.
- **Clean Modular Component Separation**: Home cards (`RentalProductCard.tsx`), search overlay (`SearchOverlay.tsx`), navbar (`Navbar.tsx`), and footer (`Footer.tsx`) live in focused modules rather than monolithic spaghetti.

### Main Weaknesses
1. **Broken Core User Flows & Runtime/TypeScript Bugs (`P0`)**: Home card wishlist toggle passes the whole `Product` object instead of `product.id`; Home/SearchOverlay category navigation passes `?category=` while `/browse` reads `?cat=`; `Orders.tsx:2343` references unimported `<Loader2 />` (runtime `ReferenceError` crash in the receipt modal); `styles.css:828-833` + `Button.tsx:114-129` force every SVG icon left (`order: -1 !important`), flipping trailing arrows (`Explore Rentals ->`, `Next >`, mobile footer chevrons).
2. **Design-System Split Between Home and Secondary Pages**: `styles.css` defines cobalt-blue `--primary` tokens, glowing `.btn-gradient`, and forces `.dark` containers to `#1E1E1E` while Home uses `#0A0A0A` (`neutral-950`). Secondary pages mix `ProductCard` (dark image-bleed + tilt + rainbow pills) with Home's minimalist `RentalProductCard`.
3. **Fake Fallback Data & Conflicting Brand Identity**: `ProductDetails.tsx:362-383` hardcodes a fake `"Sony Alpha a7 III"` fallback (making `"Product not found"` unreachable); `Orders.tsx:79-152` writes 4 cancelled mock orders into `localStorage`; `Profile.tsx:894` hardcodes fallback `"XXXXX1234F"`; four conflicting brand spellings (`Payent`, `paYent`, `PAYENT`, `pay₹ent`) and three taglines compete across pages.
4. **Severe Mobile & Accessibility Gaps**: `Filters.tsx` custom checkboxes (`<label onClick>`) have no `<input>` or keyboard support; `Filters` and `ProductDetails` squeeze `grid-cols-3` down to `7px–9.5px` micro-text on `360px–430px` phones; `Hero.tsx:111` wraps an infinite typewriter in `aria-live="polite" aria-atomic="true"`; `Navigation4` overlaps the desktop `Footer` (`md:pb-12` vs `bottom-6` + dock height).

### Highest-Priority Improvements
- **Fix all `P0` runtime, navigation, CSS icon-order, and accessibility blockers** (`RentalProductCard.tsx`, `?category=` -> `?cat=`, `Orders.tsx` `Loader2` + mock orders removal, `styles.css:828` rule removal, `Filters.tsx` native/accessible checkboxes, `Profile.tsx` KYC API shape fix, `ProductDetails.tsx` removal of silent fake product fallback).
- **Unify global palette tokens (`styles.css`) to paYent monochrome Light/Dark tokens** so Secondary Pages match Home and eliminate cobalt gradients and multi-hue badge noise.
- **Resolve `Navigation4` overlap, mobile touch targets (`>= 44px`), `Hero` continuous `aria-live` typewriter trap, and mobile `grid-cols-3` sub-11px card cramping**.

---

## 2. Installation Report

### Source & Target Details
- **Official Repository URL**: `https://github.com/heydamir/unslop` (Owner: Damir Sokolovsky / `@heydamir`, License: `CC-BY-4.0`)
- **Requested Path**: `C:\payERNT\frontend\.agents\skills\unslop\` (`C:\payERNT` does not exist on disk)
- **Resolved Installation Location**: `C:\payernt-main\payernt-main\frontend\.agents\skills\unslop\`
- **Installation Method**: Cloned official Git repository (`--depth 1`) to a temporary directory, copied only `skills/unslop/` into `C:\payernt-main\payernt-main\frontend\.agents\skills\unslop\`, then removed the temporary clone.
- **`package.json` & Dependencies**: Verified untouched via `git -C C:\payernt-main\payernt-main diff frontend/package.json` (zero diff; Unslop was not added as an npm dependency).

### Installation Verification
Every required file and directory in the Unslop distribution was verified on disk:

| File / Directory | Status | Size (Bytes) | Verified Details |
| :--- | :--- | :--- | :--- |
| `SKILL.md` | Present & Readable | `31,893` | YAML metadata verified: `name: unslop`, `license: CC-BY-4.0`, `metadata.author: Damir Sokolovsky`, `x: https://x.com/heydamir`, `site: https://heydamir.design/unslop`; all 9 passes & checklist read completely. |
| `agents/openai.yaml` | Present | `200` | Agent metadata manifest intact. |
| `references/signs.md` | Present & Readable | `7,141` | Exact Unslop anti-pattern pairs read in full. |
| `references/tokens.md` | Present & Readable | `6,629` | Exact 4px spacing, neutral ramps, buttons, type scale, radii, motion tokens read in full. |
| `references/visuals.md` | Present & Readable | `8,390` | Hero scenes, code previews, WebP/AVIF & mask rules read in full. |
| `references/effects.md` | Present & Readable | `4,977` | Code visual effects reference verified on disk. |
| `references/refs.md` | Present & Readable | `2,475` | Reference image guide + 5 `.webp` files in `references/refs/` (`beacon-engraving.webp`, `meadow-3d.webp`, `story-dashboard-frames.webp`, `unslop-dashboard-after.webp`, `unslop-hero-after.webp`) verified on disk. |
| `scripts/snapshot.mjs` | Present | `8,468` | Snapshot capture utility verified on disk. |
| `scripts/story.mjs` | Present | `25,885` | Story video generator verified on disk. |

- **Missing Files or Installation Errors**: **None.** Zero extra repo files (no `README`, `.git`, or test fixtures from upstream) were copied into the frontend directory.

### Google Antigravity Skill Discovery Verification
- **Current Auto-Discovery Status**: **Not automatically discovered in the current workspace configuration (`C:\payernt-main`) without a reload or path alignment.**
- **Empirical Findings**:
  1. Active workspace root is `C:\payernt-main`, whose own `C:\payernt-main\.agents\skills\` directory contains only the 12 previously loaded GSD skills (`codebase-mapper` through `verifier`). `Test-Path "C:\payernt-main\.agents\skills\unslop"` returned `False`.
  2. Antigravity scans `<activeWorkspace>/.agents/skills/` (walking up toward `.git`) and `~/.gemini/antigravity/skills/` on **session initialization / window reload**; it does **not** walk *down* from `C:\payernt-main` into nested `payernt-main\frontend\.agents\skills\unslop\`, nor does it hot-reload skills mid-session.
- **Action Required for Automatic Discovery**: Either (a) open `C:\payernt-main\payernt-main\frontend` directly as the Antigravity workspace and reload/start a new conversation, or (b) create a directory junction/copy at `C:\payernt-main\.agents\skills\unslop` (or `%USERPROFILE%\.gemini\antigravity\skills\unslop`) and start a new conversation.

---

## 3. Unslop Audit Findings (9 Design Areas)

To keep accountability exact, every finding below distinguishes:
- **`[Unslop]`**: Directly derived from `SKILL.md`, `references/signs.md`, `references/tokens.md`, and `references/visuals.md`.
- **`[paYent Brand Rule]`**: Enforced by the approved paYent specification (strict Black/White/Neutral Grey monochrome, approved Hero text/composition, no Dual-Side Colour Fill).
- **`[Engineering / A11y / Bug]`**: Functional, TypeScript, routing, responsive CSS, or WCAG accessibility defect.

> **Unslop Direction Check (Context for Audit)**  
> - **Product**: Peer-to-peer tech, camera, tool, and vehicle rental marketplace (`paYent`) connecting verified lenders and renters.  
> - **Character**: Monochrome editorial, tactile studio precision, trustworthy and utilitarian.  
> - **World**: Studio photography bench — matte black hardware, brushed aluminum, natural softbox falloff on archival white (`#FFFFFF`) or deep obsidian charcoal (`#0A0A0A`).  
> - **Moments**: (1) Hero studio gear trio; (2) real gear product cards/galleries with authentic dates, availability, and verified rental pricing.  
> - **Signature**: Monochrome hairlines + crisp `4-digit PIN` escrow verification and calendar date-range slots.

### 1. Spacing (`SKILL.md` §1, `tokens.md` `4px` scale)
- **`[Unslop]` / `[Engineering]` Non-existent / off-grid Tailwind spacing tokens**:
  - `Filters.tsx:987, 1067, 1146`, `Orders.tsx:416, 1069`, `Navigation4.tsx:129`, `ProductCard.tsx:418`, and `ProductDetails.tsx:2284` use `py-0.2` (`0.2` is not in Tailwind's spacing scale -> collapses vertical pill padding to `0px`), violating `tokens.md` `4px` steps.
  - Arbitrary / uneven section spacing: Home sections alternate between `py-5 sm:py-6` (`Categories.tsx:104`), `py-4 sm:py-6 md:py-7 lg:py-8` (`Hero.tsx:57`), and `py-5 sm:py-7` (`ExploreRentals.tsx:106`, `NewArrivals.tsx:48`, `RecentlyViewed.tsx:54`, `RecommendedForYou.tsx:65`, `CustomerReviews.tsx:64`, `HowItWorks.tsx:27`, `WhyChoose.tsx:70`), while card containers use `p-1 xs:p-1.5 sm:p-3.5` in `Filters.tsx:1131` vs `p-4` in `RentalProductCard.tsx:107` vs `p-6` in `ProductDetails.tsx:2449`.
- **`[Engineering]` Layout clearance deficit**: `MainLayout.tsx:14` applies `md:pb-12` (`48px`), which is shorter than the fixed desktop `Navigation4` dock (`bottom-6` = `24px` + `44px–56px` height + `16px` padding = `84px–96px`), causing dock overlap at the bottom of pages. `Orders.tsx:1921` compensates with a manual `<div className="h-16 sm:h-20" />`, while `Categories.tsx:804` uses `pb-32` (`128px`).
- **`[Unslop]` Uneven desktop grid rhythm (`WhyChoose.tsx:82`)**: 10 benefit cards in a 4-column desktop grid (`md:grid-cols-4`) produce rows of `4 + 4 + 2`, leaving 2 orphaned slots at the bottom right.

### 2. Color System (`SKILL.md` §2, `signs.md` `Surfaces and color`)
- **`[paYent Brand Rule]` + `[Unslop]` Severe Color Token Split Between Home & Secondary Pages**:
  - `styles.css:104-174` & `194-281` set primary brand tokens to **cobalt blue** (`--primary: #2868E8` Light / `#4D8DFF` Dark, `--ring: #2868E8`, `--payent-accent: #2868E8`, plus `--admin-orange-start: #F9856A` / `--admin-orange-end: #FF7655`).
  - `styles.css:620-689` defines `@utility btn-gradient` with multi-stop blue linear gradients and colored blue glow shadows (`rgba(40, 104, 232, 0.35)` / `rgba(77, 141, 255, 0.5)`), actively used in `Profile.tsx:450, 499, 1141`. This directly breaks both **Unslop** (`signs.md:7-9` — no hue gradients or colored glows) and the **paYent Brand Rule** (strict monochrome; zero blue/green/purple/orange accents).
  - **Dark background collision (`#1E1E1E` vs `#0A0A0A`)**: `styles.css:181, 295-394` forces `.dark` surfaces and many hex utilities to `#1E1E1E !important`, whereas the Home Page (`Home.tsx`, `Navbar.tsx`, `Hero.tsx`, `Footer.tsx`) uses `dark:bg-neutral-950` (`#0A0A0A`) and `dark:bg-neutral-900` (`#171717`). On `Filters.tsx` and `Categories.tsx`, notch label cutouts (`bg-[#1E1E1E]`) contrast awkwardly if rendered on `neutral-950`.
  - **Secondary Page Multi-Hue Chrome Overload**:
    - `ProductDetails.tsx`: mixes `text-primary` blue (`1458, 1504, 2148, 2395, 2424, 2461`), `amber-400` (`2297, 2373, 2475`), `emerald-600/400` (`2191`), `red-600/400` on `"T&C will apply"` (`2274`), and a `bg-primary/5 blur-3xl` radial wash behind empty reviews (`2503`).
    - `ProductCard.tsx`: overlays `amber-500` (`286`), `emerald-500` (`291, 407, 471`), `sky-500` (`310`), `red-500` (`354, 393`), and `text-primary` blue hover states (`415, 427`) onto every catalog card.
    - `Orders.tsx`: summary KPI cards and status pills use simultaneous `emerald`, `amber`, `red`, plus full hue-shifted palettes across active filters and timeline states (`966-1010`).
    - `Profile.tsx` & `Sidebar.tsx`: combine `text-purple-500` phone icon (`Profile.tsx:546`), `emerald-500` badges (`515, 538, 1119`), `text-primary` cobalt (`437, 525, 542, 638-678`), `amber-500` (`413, 1123`), `Sidebar.tsx:137-148` emerald escrow box.
    - `Filters.tsx`: injects `text-amber-400` Sun and `text-blue-400` Moon (`1217, 1222`) into the floating Theme button and `#8FAF7E` sage accents in a monochrome drawer.
    - `HelpChatbot.tsx:203, 226, 252`: introduces bright green `#16A36A` (`focus:ring-[#16A36A]`, ping dot) globally over monochrome Home.

### 3. Icons (`SKILL.md` §3, `signs.md` `Icons`)
- **`[Unslop]` Inconsistent sizes, stroke widths, and per-icon colors**:
  - Within Home alone, icon strokes and sizes drift (`h-3 w-3 stroke-[2.2]` in `Hero.tsx:132`, `h-4 w-4 stroke-[2]` in `Navbar.tsx:103`, `h-4.5 w-4.5 stroke-[1.8]` in `Categories.tsx:155`, `h-3.5 w-3.5` vs `h-4 w-4` in adjacent `"View All"` links at `Categories.tsx:122` vs `NewArrivals.tsx:67`, `h-4 w-4` stroke `1.6` in `Navigation4.tsx:226`). Unslop specifies a single consistent size (`16px` or `18px`) and stroke (`1.5`), colored by text role (`muted`/`secondary`), never arbitrary accent colors (`text-purple-500`, `text-sky-400`, `text-emerald-400`).
- **`[Unslop]` Decorative `Sparkles` & ASCII character icons**:
  - `Sparkles` appears purely decoratively in `WhyChoose.tsx:45` (`"Easy Booking Process"`), `Profile.tsx:438` (`"Verified Account"`), and `ProductDetails.tsx:2436, 2539` (`"Write a Review"`).
  - Raw text/ASCII characters substitute for Lucide icons: `Filters.tsx:980, 1064` uses literal `&lt;` (`<`) inside `<button>` for close/open filters; `Orders.tsx:2337` uses literal `✕` for closing the Receipt Modal.

### 4. Copywriting (`SKILL.md` §4, `signs.md` `Copy`)
- **`[paYent Brand Rule — PRESERVE]` Hero headline & caption**:
  - `"Rent Anything / You Need"` and `"Get What You Need, Without Owning It."` (including the trailing period on the caption) were **explicitly mandated by the user's Hero spec** and must **NOT** be altered under Unslop's general "no trailing period on captions" rule.
- **`[Unslop]` Exclamation marks & hype copy elsewhere**:
  - `ProductDetails.tsx:2838`: `"Terms & conditions accepted!"` and `ProductCard.tsx:230, 380`: `"Saved to wishlist!"`, `"Listing deleted permanently!"`.
  - Hype / marketing buzzwords: `"frictionless"` (`HowItWorks.tsx:34`), `"world-class work"` (`WhyChoose.tsx:64`), `"100% SAFE"` (`Sidebar.tsx:146`), `"Active & Protected"` (`Profile.tsx:472`).
- **`[Unslop]` Wordy search placeholders**:
  - `Navbar.tsx:104`: `"Search gear, vehicles, electronics..."`
  - `SearchOverlay.tsx:202`: `"Search gear, laptops, cameras, bikes, tools..."`
  - `Categories.tsx:565`: `"Search gear, cameras, drones, laptops..."`
  - Unslop (`SKILL.md:107`) prefers crisp `"Search"` or short `"Search rentals"`.
- **`[Unslop]` Trailing periods on short UI captions/subheadings & inconsistent casing**:
  - `Categories.tsx:104` has no period on subtitle, `ExploreRentals.tsx:116` has no period, `NewArrivals.tsx:57` has no period — while `WhyChoose.tsx` all 10 card descriptions and `HowItWorks.tsx` all 3 step captions use single-sentence trailing periods (`SKILL.md:109`).
- **`[Unslop]` + `[Engineering]` Conflicting brand spellings, taglines, and hardcoded fake data**:
  - **4 brand spellings**: `"Payent"` (`branding.ts:9`, `__root.tsx:155`, `Navbar` via `LogoIcon`), `"paYent"` (`Hero.tsx:56`, `HowItWorks.tsx:31`, `WhyChoose.tsx:74`, `Footer.tsx:34`), `"PAYENT"` (`AppPreloader.tsx:17, 224`, `routes/browse.tsx:34`, `ProductDetails.tsx:2531`), `"pay₹ent"` (`Navigation4.tsx:149`, `routes/payant.tsx:8`, `routes/payent.tsx:7`).
  - **3 taglines**: `"Gear Rental for Creators"` (`branding.ts:10`), `"Get What You Need, Without Owning It."` (`Hero.tsx:4`), `"Everything You Need, Nothing You Need to Own."` (`Footer.tsx:160`).
  - **Hardcoded placeholder/fake data**: `ProductDetails.tsx:362-383` (`"Sony Alpha a7 III"`, `"Sai Teja"`, `"Vizag, AP"`, `reviews: 124`), `ProductDetails.tsx:2166` (`"Arun Kumar"`), `ProductDetails.tsx:2376` (`rel.reviews || 84`), `Profile.tsx:894-895` (`"XXXXX1234F"`), `Orders.tsx:79-152` (4 sample cancelled orders).

### 5. Typography (`SKILL.md` §5, `signs.md` `Type`, `tokens.md`)
- **`[Unslop]` Excessive `700–900` weights (`font-bold` / `font-extrabold` / `font-black`)**:
  - `SKILL.md:118` specifies weights `400` and `500` (with `600` sparingly, and zero `700–900` headings). Currently `LogoIcon.tsx:24, 34` uses `font-black` (`900`), `Categories.tsx:808`, `Profile.tsx:434, 509, 561`, `ProductDetails.tsx:1500, 2326, 2425` use `font-extrabold` / `font-black`, and nearly every card title/price/pill uses `font-bold`. (Keep `"You Need"` bold in `Hero.tsx:97` per `[paYent Brand Rule]`.)
- **`[Unslop]` Uppercase wide-tracked labels (`uppercase tracking-wider`)**:
  - Violations on `Categories.tsx:177` (`Explore in ...`), `HowItWorks.tsx:8, 14, 20, 51, 77` (`DISCOVER`, `BOOK`, `ENJOY & RETURN`, `STEP 01`), `Footer.tsx:168, 210` (all 6 group titles), `SearchOverlay.tsx:456`, `Categories.tsx:669`, `Orders.tsx:398, 1388`, `Profile.tsx:437, 467, 513, 1117`, `ProductCard.tsx:406, 439`, `Sidebar.tsx:56`, `ProductSelection.tsx:187, 230`.
- **`[Unslop]` Negative letter-spacing (`tracking-tight`) on `< 16px` text & sub-`11px` micro-text**:
  - `Hero.tsx:114` applies `tracking-tight` on `text-[11px]`–`text-sm`; `Filters.tsx:557, 872, 1155` applies `tracking-tight` and drops mobile text down to `text-[7px]`, `text-[8px]`, `text-[8.5px]`, `text-[9.5px]`. `ProductDetails.tsx:2373-2394` drops mobile text to `text-[7.5px]`–`text-[9.5px]`.
- **`[Unslop]` Italic emphasis & missing `tabular-nums`**:
  - `ProductDetails.tsx:2489` renders review body quotes in `italic`.
  - Currency prices (`RentalProductCard`, `ProductCard`, `Filters`, `Orders` metrics/totals) and counts omit `tabular-nums`.

### 6. Layout (`SKILL.md` §6, `tokens.md` `App layout`)
- **`[paYent Brand Rule — PRESERVE]` Mobile Hero 2-Column Split**:
  - User explicitly requested keeping the 2-column Hero composition on mobile screens (`Hero.tsx:87`). Do **not** convert it into a vertical stack unless the user reverses that decision; instead, tune fluid padding/min-height/CTA height so the 2-col layout remains legible and tappable (`>= 44px`).
- **`[Unslop]` Floating Dual Bottom Chrome & Dock-over-Footer Overlap**:
  - Desktop viewport bottom holds both `Navigation4` (`bottom-6` centered floating dock across all renter routes) AND `HelpChatbot` (`bottom-6 right-6`). On `/filters`, a 3rd floating `Theme` button (`bottom-5 right-5`) sits in the exact same corner as `HelpChatbot` (`bottom-6 right-6`). `MainLayout.tsx:14` `md:pb-12` allows `Navigation4` to cover the bottom copyright bar of `Footer`.
- **`[Unslop]` Hero-Style Photo Banner & Overlayed `<h1>` on Secondary Pages**:
  - `ProductDetails.tsx:1497-1512` places the `<h1>` title directly on top of a bottom black gradient inside the product image card (`aspect-[4/3]` container), rather than resting cleanly above the fold on the page canvas.
  - `Profile.tsx:460-478` uses an abstract dark dot-matrix cover strip with `-mt-16` negative overlap and 4 equal KPI boxes (`555-628`).
- **`[Unslop]` Home Page Entry Double Preloader**:
  - First visit hits `AppPreloader.tsx` (~5.9s `#000000` `PAYENT` splash that redirects `/` -> `/select` via `__root.tsx:239-243`), followed on Home mount by `Home.tsx:61-73` (another 200ms `animate-pulse` full-screen curtain).

### 7. Component Details (`SKILL.md` §7, `signs.md` `Components`)
- **`[Engineering / Bug]` Global CSS Icon-Reversal Rule (`styles.css:828-833` + `Button.tsx:114-129`)**:
  - `button:where(:not([data-no-auto-order])) > svg` with `order: -1 !important` forces **every** button icon to render on the LEFT, inverting Hero CTA (`-> Explore Rentals`), Home pagination (`< Next`), and Footer mobile accordion `<ChevronDown>`. `Button.tsx:127` even renders `rightIcon` on the left (`icon || leftIcon || rightIcon`) and ignores its prop semantics.
- **`[Unslop]` Pill & Badge Overuse**:
  - Inputs (`Input.tsx:37` `rounded-[20px]`), Hero buttons (`rounded-full`), Filter/Sort controls (`ExploreRentals.tsx:126` `rounded-xl`), Navbar (`Navbar.tsx:100` `rounded-full`), and SearchOverlay (`rounded-3xl`, `rounded-full`) mix pill and rounded-rect geometry inconsistently instead of Unslop's radius hierarchy (`8–10px` controls, `12–16px` cards, `14–20px` panels).
  - Status badges and filter chips across `ProductCard`, `Profile`, and `Orders` render as heavy frosted/colored bordered pills rather than quiet mono meta/hairline tags.
- **`[Unslop]` Card Component Inconsistency**:
  - Home displays clean monochrome bordered cards with content **below** the photo (`RentalProductCard.tsx`), while `/browse` (`Categories.tsx`) and `/wishlist` (`Wishlist.tsx`) display dark full-bleed `ProductCard.tsx` (gradient overlays, 3D tilt, up to 6 overlaid pills), creating two completely different storefronts.
- **`[Unslop]` Non-interactive UI Lookalikes**:
  - `Footer.tsx:68-74` renders `"paYent Web App"` inside a pill-bordered card that visually looks like a downloadable app store button (`<div>` with `<Smartphone />`), but has zero interaction or install trigger.
  - `CustomerReviews.tsx:170-179` renders pagination indicator dots (`<span>`) on mobile that are not clickable buttons.

### 8. Visual Assets (`SKILL.md` §8, `references/visuals.md`)
- **`[paYent Brand Rule — PRESERVE]` Studio Hero Assets**:
  - `hero_laptop.webp`, `hero_headphones.webp`, `hero_camera.webp` (and `*_dark.webp` variants) are clean studio product renders (`81 KB–181 KB`) on solid/matched backdrops without fake text or AI blobs baked in — compliant with `visuals.md`.
- **`[Unslop]` + `[Engineering]` Dual-Image Eager Fetch & Missing Intrinsics (`Hero.tsx:151-215`)**:
  - Each of the 3 hero products renders two separate `<img>` elements (`dark:hidden` + `hidden dark:block`) both marked `loading="eager"`, causing browsers in Light Mode to potentially download all 6 `.webp` images (~753 KB total) and lacking `width`/`height` attributes to prevent layout shift before CSS applies.
- **`[Unslop]` Layered Blur Glows / Drop Shadows & Background Noise**:
  - `Hero.tsx:60-83, 149-202` stacks multiple `blur-md`/`blur-lg`/`blur-xl` rounded ovals beneath each hero item + window shadow gradients; `ProductDetails.tsx:2503` places a `bg-primary/5 blur-3xl` radial orb behind the empty review card; `ProductSelection.tsx:125-139` draws SVG `<feTurbulence>` noise (`signs.md` + `SKILL.md:213`).
- **`[Engineering]` Image Fallback Inconsistency**:
  - `RentalProductCard.tsx:83`, `ProductCard.tsx`, `Filters.tsx:1142`, `ProductDetails.tsx:2365` hardcode an external Unsplash camera URL (`images.unsplash.com/photo-1516035069371-29a1b244cc32`) as `onError` fallback even for bicycles/laptops/tools, while `ProductCard.tsx:271-276` uses a clean monochrome `<Package>` placeholder box.

### 9. Animations & Interactions (`SKILL.md` §9, `signs.md` `Motion`)
- **`[Unslop]` Continuous `animate-pulse` & `animate-ping` on Non-Live UI**:
  - `Hero.tsx:117` (`animate-pulse` cursor alongside a 46ms/24ms infinite JS `setTimeout` typing/deleting loop), `Home.tsx:66` (`animate-pulse` splash overlay), `RentalProductCardSkeleton` (`72, 129`), `CustomerReviews.tsx:105`, `Categories.tsx:886`, `Profile.tsx:559` (skeletons), `Sidebar.tsx:55` (`animate-pulse` dot on `"Creator Workspace"`), `ProductDetails.tsx:2140` (`animate-pulse` dot on `"Available for Rent"`), `ProductCard.tsx:292` (`animate-pulse`), `Orders.tsx:980, 1295` (`animate-ping`), `HelpChatbot.tsx:226` (`animate-ping`).
- **`[Unslop]` Universal `transition-all` & Hover Scale / Card Lift**:
  - `transition-all` appears dozens of times across `Navbar`, `Hero`, `RentalProductCard`, `Categories`, `Navigation4`, `Categories.tsx`, `Filters.tsx`, `ProductDetails.tsx`, `Profile.tsx`, and `Orders.tsx` (`SKILL.md:173`: prefer `transition-colors` or `transition-[transform,opacity]`).
  - `hover:scale` / lift violations: `Hero.tsx:145, 167, 193` (`hover:scale-[1.02]`/`[1.03]` on non-clickable product `<div>`s), `RentalProductCard.tsx:58, 87` (`hover:-translate-y-1`, `group-hover:scale-102`), `Categories.tsx:151` (`scale-102`), `ProductCard.tsx:242-269` (`CSSTiltCard` + `whileHover={{ y: -4 }}` + `group-hover:scale-108`), `Filters.tsx:1131, 1139, 1212` (`hover:-translate-y-0.5`, `group-hover:scale-105`, `hover:scale-105`), `Profile.tsx:499` (`hover:scale-102`), `.card-premium` (`styles.css:691-705` used even on the non-interactive empty Wishlist container `Wishlist.tsx:50`).
- **`[Unslop]` Bouncy Springs & Heavy Motion**:
  - `Navigation4.tsx:81, 101, 161` uses multi-spring magnification (`stiffness: 200–400`), `ProductDetails.tsx:2186-2245` uses a 4-stage spring SVG path/polygon overshoot for T&C checkmarks, and `Orders.tsx:1939` / `HelpChatbot.tsx` use custom springs instead of Unslop's single ease-out curve `cubic-bezier(0.22, 1, 0.36, 1)`.

---

## 4. Page-by-Page Findings

### Part A — Rentals Home Page (12 Audited Areas)

#### 1. Navbar
- **Component**: `frontend/src/components/layout/Navbar.tsx` (`1–183`)
- **Existing Design Quality**: Crisp monochrome bar (`h-16`), sticky blur on scroll, keyboard shortcut badge (`⌘K`), clean Light/Dark theme switch.
- **Problems Identified**:
  1. **Brand Link Mismatch (`85`)**: `<Link to="/payent">` hardcodes `/payent` while `/` is Gateway and `/payant` is an alternate Home route.
  2. **Mobile Search Target Below `44px` (`120`)**: Mobile Search button uses `h-9 w-9` (`36×36px`) and Theme button on mobile uses `h-9 w-9` (`36×36px`, `132`).
  3. **Verbose Placeholder (`104`)**: `"Search gear, vehicles, electronics..."` violates Unslop's concise label rule (`SKILL.md:107`).
  4. **Scroll Autohide Hazard (`33-44, 78`)**: Hiding the entire top header (`-translate-y-full`) past `100px` downward scroll on mobile removes instant access to Search, Theme toggle, and Log In/Profile without scrolling back up.
  5. **Motion (`86, 132, 148, 164`)**: `transition-all` + `active:scale-95`/`98` (`SKILL.md:173`).
- **Why It Matters**: Sub-44px tap targets fail mobile usability; autohiding the navbar hides search/login; verbose placeholder adds visual clutter.
- **Recommended Correction**: Increase mobile icon buttons to `h-11 w-11` (`44px`), shorten placeholder to `"Search"` or `"Search rentals"`, verify whether mobile autohide should remain sticky-compact instead of disappearing, and replace `transition-all` with `transition-colors`.

#### 2. Hero Section
- **Component**: `frontend/src/components/home/Hero.tsx` (`1–224`)
- **Existing Design Quality**: **Already well aligned visually on desktop** — reproduces the approved studio composition, strict monochrome contrast in Light and Dark themes, clear hierarchy, single primary CTA, and generous spacing.
- **Problems Identified**:
  1. **CSS Icon Reversal Bug (`129-132` + `styles.css:828-833`)**: `Explore Rentals` + `<ArrowRight />` renders visually as **`-> Explore Rentals`** because the global stylesheet forces `order: -1 !important` on all button SVGs.
  2. **Continuous Typewriter Accessibility Trap (`109-121`)**: Wrapping the continuously typing/deleting caption in `aria-live="polite" aria-atomic="true"` causes screen readers to re-read fragments (`"G"`, `"Ge"`, `"Get..."`) indefinitely, paired with `animate-pulse` on the cursor (`117`).
  3. **Mobile Squeeze at `360px–430px` (`87-135`)**: Keeping the mandated 2-column grid at `360px` leaves only ~155px for the left column: `<h1>` shrinks to `18.4px` (`text-[1.15rem]`), caption drops to `11px` with `tracking-tight`, and CTA drops to `~32px` height (`py-2 text-[11px]`, below `44px`).
  4. **Non-Interactive Hover Scaling & Duplicate `eager` Images (`145-215`)**: Product wrappers (`<div>`) scale on hover (`hover:scale-[1.02]`/`[1.03]`) despite not being clickable; Light and Dark `<img loading="eager">` tags both mount without `width`/`height` attributes.
- **Why It Matters**: Reversed CTA arrow hurts comprehension; live-region typewriter makes assistive tech unusable on Home; sub-44px CTA fails mobile ergonomics.
- **Recommended Correction**: Remove global `order: -1 !important` (or opt out on directional trailing CTAs), replace `aria-live` on the animated typewriter with a static `sr-only` full caption + `aria-hidden="true"` visual typing span, ensure mobile Hero CTA reaches `min-h-[44px]` while keeping the approved 2-column visual composition, remove hover scaling from static product divs, and use `<picture>`/`sizes` + explicit aspect attributes or theme-aware source switching.

#### 3. Categories Section (Home)
- **Component**: `frontend/src/components/home/Categories.tsx` (`1–209`)
- **Existing Design Quality**: Clean 6-item circular monochrome icon selector + interactive subcategory chips.
- **Problems Identified**:
  1. **Broken Category URL Param (`97, 182`)**: Navigates to `/browse` with `search: { category: selectedCatId }`, whereas `/browse` (`src/pages/Categories.tsx:156` & `routes/browse.tsx:7`) reads `search.cat`! Selecting any subcategory or `"Browse <Category>"` lands on `"All Tech Gear"` unfiltered.
  2. **Arrow Reversed / Inconsistent Icon Size (`122, 155, 186`)**: `<Icon className="h-4.5 w-4.5 ... stroke-[1.8]" />` vs `h-3.5 w-3.5 stroke-[2]` (`ArrowRight`); subcategory `"Browse"` link uses `ChevronRight` vs header `ArrowRight`.
  3. **Type & Motion (`151, 164, 177`)**: `text-xs uppercase tracking-wider font-bold` on `"Explore in ..."` (`177`); `scale-102` on active circular frame (`151`); `text-[10px]` item count (`164`).
  4. **Narrow-Screen Layout (`127`)**: `grid-cols-3` at `360px` renders ~100px-wide items forcing `"Cameras & Photography"` / `"Tools & Equipment"` to truncate with `line-clamp-1`.
- **Why It Matters**: `P0` functional failure (every category browse link from Home drops the category filter); truncated labels obscure category names on 360px phones.
- **Recommended Correction**: Change `?category=` to `?cat=` (matching `/browse` & `/categories` schemas); switch `Explore in ...` to sentence case (`12px` regular/medium); standardize icon stroke to `1.5`; widen mobile tap spacing (`grid-cols-2 xs:grid-cols-3` or wrapped list so full names read cleanly).

#### 4. Explore Rentals Section
- **Component**: `frontend/src/components/home/ExploreRentals.tsx` (`1–252`)
- **Existing Design Quality**: **Generally well designed** — monochrome cards below-image copy, explicit loading/error/empty/retry states, session pagination/sort persistence, accessible `<select aria-label>`.
- **Problems Identified**:
  1. **`RentalProductCard` Wishlist Bug (`212` -> `RentalProductCard.tsx:47`)**: Passes whole `Product` object to `toggle(product)` instead of `product.id`, breaking Home wishlist toggles and TS compilation (`TS2345`).
  2. **Reversed Pagination Arrow (`240-241` + `styles.css:828`)**: `Next` renders as `< Next`.
  3. **TypeScript Property Drift (`60-66`)**: Reads `a.daily_rate` and `a.created_at` (not declared on `Product` interface in `src/types/index.ts:39-86`), causing 8 TS errors (`TS2339`).
  4. **Control Radius & Client-Side Full-Catalog Slice (`52-90, 126, 142, 223`)**: Fetches the entire catalog without pagination params and slices client-side (`slice(startIndex, startIndex + 8)`); mixes `rounded-xl` buttons/select with `rounded-full` Hero CTA and `rounded-2xl` cards.
- **Why It Matters**: Broken wishlist + reversed `"Next"` arrow directly harm core browsing/saving.
- **Recommended Correction**: Fix `toggle(product.id)` in `RentalProductCard.tsx:47`; fix `styles.css:828`; align `Product` type or backend mapper so `daily_rate`/`created_at` are typed; pass pagination params or cap safely once backend supports pagination.

#### 5. New Arrivals Section
- **Component**: `frontend/src/components/home/NewArrivals.tsx` (`1–140`)
- **Existing Design Quality**: Clean, minimal, matches `ExploreRentals` rhythm, preserves `"View All"` link to `/browse?sort=newest`.
- **Problems Identified**:
  1. **Missing Empty State (`97-134`)**: When `products.length === 0` (no error, finished loading), the header `"New Arrivals"` renders with blank space below instead of an empty state or section hide (`return null`).
  2. **Reversed `"Next"` Chevron (`128-129` + `styles.css:828`)**: Global CSS puts `<ChevronRight />` to the left of `"Next"`.
  3. **TypeScript Errors & Inherits `RentalProductCard` Bug (`24-25, 101`)**: 4 `TS2339` errors (`created_at` missing on `Product`) + broken wishlist heart.
  4. **Header Icon Size Mismatch (`67`)**: `"View All"` arrow is `h-4 w-4`, whereas `Categories` `"View All"` (`122`) is `h-3.5 w-3.5`.
- **Why It Matters**: Blank section if API returns `[]`; inconsistent chevron order & icon sizing.
- **Recommended Correction**: Hide section or show empty state when `products.length === 0`; fix CSS SVG ordering and standardize `"View All"` icon size (`16px` stroke `1.5`).

#### 6. Recently Viewed Section
- **Component**: `frontend/src/components/home/RecentlyViewed.tsx` (`1–76`)
- **Existing Design Quality**: **Already well designed** — strictly logged-in only, cleanly returns `null` when empty (`49-51`), matching 4-col / 2-col card grid.
- **Problems Identified**:
  1. Inherits the `P0` `RentalProductCard` wishlist toggle bug (`toggle(product)`).
  2. `RentalProductCardSkeleton` (`72` in `RentalProductCard.tsx`) uses `animate-pulse` (`SKILL.md:170`), and `RecentlyViewed` renders nothing (`null`) while fetching (`!loaded`), causing post-hydration layout shift down the page for logged-in users with history.
- **Why It Matters**: Minor layout shift for returning authenticated users and broken heart toggle.
- **Recommended Correction**: Fix `RentalProductCard` wishlist ID bug; use a static neutral shimmerless surface for skeleton loading placeholders.

#### 7. Recommended For You Section
- **Component**: `frontend/src/components/home/RecommendedForYou.tsx` (`1–94`)
- **Existing Design Quality**: **Already well designed** — clean personalized/trending fallback, logged-in gated, returns `null` cleanly when empty (`60-62`).
- **Problems Identified**:
  1. Inherits the `RentalProductCard` wishlist bug (`toggle(product)`) and `RentalProductCardSkeleton` `animate-pulse`.
  2. Same `null`-until-loaded vertical shift pattern as `RecentlyViewed` for logged-in users (`isLoading` renders 4 skeletons, then disappears if both personalized and trending return empty).
- **Why It Matters**: Minor visual shift + broken wishlist toggle.
- **Recommended Correction**: Fix `RentalProductCard` wishlist bug and replace `animate-pulse` skeleton pulse with subtle static loading blocks.

#### 8. Customer Reviews Section
- **Component**: `frontend/src/components/home/CustomerReviews.tsx` (`1–189`)
- **Existing Design Quality**: Monochrome 5-star rendering (no bright yellow clutter on Home), graceful empty hide (`return null`), desktop prev/next carousel buttons.
- **Problems Identified**:
  1. **Non-Interactive Mobile Dots & Card Sizing (`128, 169-181`)**: Mobile cards are `w-[88vw]` (`scrollBy(clientWidth * 0.85)` vs `newIdx = Math.round(scrollLeft / clientWidth)` causes dot index drift!), pagination dots are unclickable `<span>`s (`171`), and mobile users get zero arrow controls.
  2. **`select-none` on Review Text (`128`)**: Blocks users from selecting/copying quote text or equipment names.
  3. **Touch Target & Skeleton Pulse (`83, 91, 105`)**: Desktop nav arrows are `36×36px` (`h-9 w-9 < 44px`); loading skeletons use `animate-pulse`.
- **Why It Matters**: Dot indicator goes out of sync with `88vw` snap scroll; `select-none` breaks standard browser text selection on user reviews.
- **Recommended Correction**: Remove `select-none` from review card bodies, compute `activeIndex` from actual card step width, make pagination dots interactive `<button>`s with `aria-label` (or show compact prev/next buttons across breakpoints), and enlarge carousel buttons to `40–44px`.

#### 9. How paYent Works Section
- **Component**: `frontend/src/components/home/HowItWorks.tsx` (`1–96`)
- **Existing Design Quality**: Clean 3-step connected horizontal (desktop) and vertical (mobile) progression with matching monochrome circular Lucide icons.
- **Problems Identified**:
  1. **Uppercase Tracking & Step Eyebrows (`8, 14, 20, 51, 77`)**: `DISCOVER`, `BOOK`, `ENJOY & RETURN`, and `STEP 01` violate Unslop's sentence-case rule (`signs.md:19`: uppercase labels with wide tracking become sentence case).
  2. **Copywriting (`9, 15, 21, 34`)**: Subtitle uses `"frictionless"` (`SKILL.md:110`); all 3 step captions end with trailing periods on single-phrase UI captions (`SKILL.md:109`).
- **Why It Matters**: Uppercase monospace eyebrows and shouting headings read like an AI landing template alongside the refined Hero.
- **Recommended Correction**: Convert `DISCOVER`/`BOOK`/`ENJOY & RETURN` and `STEP 01` to sentence case (`Discover`, `Book`, `Enjoy and return`, `01` / `Step 1`), drop trailing periods on single-line step captions, and replace `"frictionless"` with concrete copy (`"Three verified steps with escrow protection and doorstep delivery"`).

#### 10. Why Choose paYent Section
- **Component**: `frontend/src/components/home/WhyChoose.tsx` (`1–108`)
- **Existing Design Quality**: Monochrome card grid with consistent icon containers and subtle border hover.
- **Problems Identified**:
  1. **Orphaned 10-Card Grid (`16-67, 82`)**: 10 uniform cards in `md:grid-cols-4` leave **2 orphaned cards** on row 3 (`4 + 4 + 2` asymmetric gap), triggering Unslop's template/feature-grid anti-pattern (`signs.md:73` + uneven row fill).
  2. **`Sparkles` Slop Icon & Copy (`45, 64`)**: Benefit #6 (`"Easy Booking Process"`) uses decorative `Sparkles` (`signs.md:31`); `"world-class work"` (`64`) is generic hype copy; all 10 short descriptions carry trailing periods.
- **Why It Matters**: Orphaned row breaks visual balance on `1024px–1440px` viewports; 10 repetitive generic boxes dilute the unique rental value props (escrow, 4-digit handover PIN, flexible shoots).
- **Recommended Correction**: Curate to **8 concrete benefits** (completing two clean `4×2` rows on desktop and `2×4` on mobile, or 6 items in `3×2`), swap `Sparkles` for a concrete Lucide icon (`CheckCircle` / `Zap` / `CalendarCheck`), tighten copy without hype words/trailing periods.

#### 11. Footer
- **Component**: `frontend/src/components/layout/Footer.tsx` (`1–269`)
- **Existing Design Quality**: Monochrome contrast, clean desktop 3×2 group grid collapsing to single-open accordions on mobile, semantic `<footer>`.
- **Problems Identified**:
  1. **Occluded Bottom Bar on Desktop (`MainLayout.tsx:14` + `Navigation4.tsx:282`)**: Floating `Navigation4` overlaps the centered copyright row (`Footer.tsx:256-263`) when scrolled to the bottom of the page because `MainLayout` only reserves `md:pb-12` (`48px`).
  2. **Reversed Mobile Accordion Chevron (`212-218` + `styles.css:828`)**: Global SVG `order: -1` flips the mobile accordion `<ChevronDown>` to the **LEFT** of the group heading text!
  3. **Duplicate / Mismatched Legal Links & Fake App Tile (`57, 59, 68-74, 260-261`)**: `"Terms of Service"` and `"Terms"` link to `/privacy`; `"Rental Agreement & Escrow"` links to `/about`; `"Security"` links to `/support`; `"paYent Web App"` (`68-74`) looks like an actionable install button but is a dead `<div>`.
  4. **Typography, Copy & Touch Targets (`114, 160, 168, 210`)**: Logo links to `/payent` (`156`); tagline `"Everything You Need, Nothing You Need to Own."` (`160`) conflicts with Hero `"Get What You Need, Without Owning It."` and `branding.ts`; all 6 group titles use `uppercase tracking-wider`; social links are `32×32px` (`h-8 w-8 < 44px`).
- **Why It Matters**: Occluded footer links + broken Terms route + reversed accordion chevrons hurt trust and usability.
- **Recommended Correction**: Increase `MainLayout` bottom padding on desktop (`md:pb-24`) or integrate Footer clearance; fix CSS icon ordering; wire real routes or anchors for Terms/Agreement; align tagline with brand config; enlarge social touch targets to `40–44px`; switch group titles to sentence case.

#### 12. Mobile Navigation (Floating Dock)
- **Component**: `frontend/src/components/navigation/Navigation4.tsx` (`1–325`) & `frontend/src/components/layout/MobileBottomNav.tsx` (`1–8`)
- **Existing Design Quality**: Clean monochrome active pill state, accessible `aria-label` + `aria-current="page"`, automatically hidden on `/admin` and `/payernt`.
- **Problems Identified**:
  1. **Touch Targets Below `44px` on Mobile (`176`)**: `effectiveBaseItemSize` is `38px` (`< 44px` WCAG/Apple/Google mobile target floor).
  2. **Hover-Only Labels Invisible on Touch (`117-135`)**: Item labels (`Home`, `Explore`, `Orders`, `Profile`, `More`) live exclusively inside `<AnimatePresence>` tooltips shown on `isHovered`/`onFocus` — mobile tap users see unlabeled icon squares unless tapping/long-pressing, and tooltips collide with finger position.
  3. **Desktop Dock Overlaps Footer & HelpChatbot Competes for Fixed Space (`282` + `HelpChatbot.tsx:203`)**: Fixed bottom dock on desktop is redundant with top `Navbar` + `Sidebar` links while blocking footer content; `MainLayout` lacks sufficient bottom clearance.
  4. **Outdated Docstring & Bouncy Spring Motion (`148-155, 81, 101, 161`)**: Comment claims 4 items (`Cart`, `User Dashboard`) while code renders 5; spring magnification violates `[Unslop Motion]`.
- **Why It Matters**: Icon-only 38px targets on mobile increase mis-taps and rely on hidden hover tooltips for navigation comprehension.
- **Recommended Correction**: Enlarge mobile dock buttons to `>= 44×44px` with subtle persistent compact labels on mobile (or standard tab bar), replace spring magnification with a clean ease-out `transition-colors`, ensure `MainLayout` bottom padding clears `Navigation4`, and align `Home` destination consistency (`/payent` vs `/payant`).

---

### Part B — Secondary Pages Audit (6 Pages)

#### 1. Product Details Page
- **Component**: `frontend/src/pages/ProductDetails.tsx` (`1–2848`)
- **Problem Identified**:
  1. **Unreachable "Product not found" via Fake Fallback (`362-383`)**: When lookup fails, assigns hardcoded `"Sony Alpha a7 III"` (`Sai Teja`, `Vizag, AP`, `₹499`, `124` reviews), silently hiding real 404/unlisted gear; line `2166` falls back empty lender to `"Arun Kumar"`.
  2. **Massive Visual/Color Drift vs Home (`1458, 1500, 1504, 2140, 2191, 2274, 2350-2400, 2503`)**: Cobalt `text-primary` highlights, emerald animated checkmark swoosh (`spring` bounce), red warning `"T&C will apply"` link (`2274-2287`), `amber-400` star pills, `bg-primary/5 blur-3xl` radial glow (`2503`), `Sparkles` buttons (`2436, 2539`), `animate-pulse` dots (`2140`), and dark-bleed `<h1>` baked inside the product gallery frame (`1500`).
  3. **Mobile Related Products Cramping & Route Jump (`2346-2394`)**: Uses `grid-cols-3` at `< 640px` (`text-[7.5px]`–`text-[9.5px]`) and links cards directly to `/payent/products/$id` (`2350`) even when opened via `/product/$id`.
  4. **TypeScript Diagnostics**: 4 compile errors (`1386-1387` nullable `JsonLd`, `1721-1722` callback signatures).
- **Why It Is a Problem**: Showing fake Sony camera specs on a deleted URL misleads users into attempting invalid bookings; colored pills/glows/blur/uppercase copy clash completely with Home's monochrome identity; mobile 3-column related cards are unreadable at `360px`.
- **Recommended Correction**: Remove the fake fallback at `362-383` so `"Product not found"` works properly; move `<h1>` onto calm canvas surface above/beside gallery; neutralize blue/red/purple chrome to paYent monochrome; change Related Products mobile grid to `grid-cols-2` (`>= 12px` text) and reuse consistent `/product/$id` routing + `<RentalProductCard>` parity.

#### 2. Search Results Page (`/browse`, `/categories`, `/payent/explore`)
- **Component**: `frontend/src/pages/Categories.tsx` (`1–925`)
- **Problem Identified**:
  1. **Query Param Broken Integration (`156` vs `Home Categories.tsx:97, 182` & `SearchOverlay.tsx:302, 468`)**: Consumes `search.cat`, dropping incoming `?category=` params from Home and SearchOverlay.
  2. **Missing `<h1>` Landmark (`808`)**: Starts hierarchy at `<h2>`; category icon buttons (`767-796`) display **icons only** with zero visible labels for touch users; notification/wishlist/message buttons (`621-662`) render at `32×32px` on mobile (`p-1.5` + `20px` SVG).
  3. **Card & Surface Mismatch (`546, 630, 808, 886, 917`)**: Renders heavy dark `ProductCard` (`tilt`, `scale-108`, sky/emerald/amber pills) instead of monochrome `RentalProductCard`; `#1E1E1E` dark cards clash with Home's `#0A0A0A`; `bg-red-600` notif badge (`630`); `font-extrabold` & `uppercase tracking-wider` (`669, 808`).
  4. **TypeScript Error (`792`)**: Passes `strokeWidth={1.85}` onto `CategoryDefinition.icon` whose TS type omits `strokeWidth` (`TS2769`), plus `created_at` (`458`).
- **Why It Is a Problem**: Landing from any Home category drops the user's filter; icon-only category bubbles are ambiguous without hovering; screen readers lack a top-level `<h1>`.
- **Recommended Correction**: Support `cat` seamlessly across Home/SearchOverlay/`Categories.tsx`; upgrade `<h2>` (`808`) to `<h1>`; add concise text labels beneath category circles; unify catalog card styling with Home monochrome tokens; enlarge icon actions to `44px` hitboxes.

#### 3. Filter Page (`/filters`)
- **Component**: `frontend/src/pages/Filters.tsx` (`1–1230`)
- **Problem Identified**:
  1. **Keyboard & Screen-Reader Inaccessible Checkboxes (`537-570, 853-885`)**: Category and Condition controls are clickable `<label onClick>` elements containing `<div />` squares — **no `<input type="checkbox">`, `tabIndex`, `role="checkbox"`, or `aria-checked`**. Unreachable via `Tab`/`Space`/`Enter`.
  2. **Mobile `grid-cols-3` Sub-11px Cramping (`1114-1170`)**: Renders 3 narrow columns on `360px` phones (`~105px` cards) with `text-[7px]`, `text-[8px]`, `text-[8.5px]`, `text-[9.5px]` text and hidden vendor names `< xs`.
  3. **Overlay Collisions & ASCII Chrome (`909-1228`)**: Bypasses `MainLayout` yet global `Navigation4` (`__root.tsx:262`) still covers the bottom; adds a floating bottom-right `Theme` pill (`1208-1227`) with `text-amber-400`/`text-blue-400` icons colliding with `HelpChatbot`; drawer header/toggle (`980, 1064`) renders literal ASCII `<`; badge mixes `emerald-500/20` (`987`) and `py-0.2` (`987, 1067, 1146`).
  4. **Inconsistent Copy**: Drawer uses `"Reset"` (`525, 998`), bottom uses `"Clear all"` (`898`), header uses `"Clear all"` (`1096`).
- **Why It Is a Problem**: Critical `P0` accessibility blocker (keyboard users cannot filter); sub-10px mobile grid is illegible; overlapping fixed widgets clutter mobile bottom-right.
- **Recommended Correction**: Replace visual `<label onClick>` boxes with native accessible `<input type="checkbox" className="sr-only">` inside interactive `<label>` elements (preserving visual design); switch `< 640px` results grid to `grid-cols-2` (`>= 12px` body); replace `<` with Lucide `<X>`/`<SlidersHorizontal>`; remove duplicate bottom-right floating Theme pill when Navbar/Chatbot already cover it, and reserve dock clearance.

#### 4. Wishlist Page (`/wishlist`, `/payent/wishlist`)
- **Component**: `frontend/src/pages/Wishlist.tsx` (`1–66`)
- **Problem Identified**:
  1. **Broken Synergy with Home Wishlist Bug (`15, 31`)**: Reads `ids` from `useWishlist()`. Because `RentalProductCard.tsx:47` passes a full `Product` object instead of `id` when toggling from Home, `ids.includes(p.id)` stays `false` for items favorited on the Home Page!
  2. **Visual & Route Inconsistency (`36, 46, 50`)**: Empty state (`50`) wraps non-interactive content in `.card-premium` (lifts and adds rim-shadow on hover even though nothing happens on click); grid renders dark full-bleed `ProductCard` (`46`) rather than monochrome `RentalProductCard`; `BackButton fallback="/categories"` (`36`) and `"Browse marketplace"` go to `/categories` instead of `/browse` or `/payent`.
  3. **Public-Only Catalog Filter (`21-31`)**: Calls `api.getPublicProducts()`, silently hiding wishlisted items if an approved listing isn't in that single fetch snapshot.
- **Why It Is a Problem**: Users favoriting gear on the Home Page open `/wishlist` and see `"0 saved items"` or broken persistence; empty-state card pretends to be clickable.
- **Recommended Correction**: Fix `RentalProductCard.tsx:47` (`toggle(product.id)`); remove `.card-premium` hover lift from empty state container; align Wishlist card UI with monochrome Home cards.

#### 5. Profile Page (`/profile`, `/payent/profile`)
- **Component**: `frontend/src/pages/Profile.tsx` (`1–1271`) & `frontend/src/components/layout/Sidebar.tsx` (`1–184`)
- **Problem Identified**:
  1. **KYC Hydration Mismatch & Fake PAN Fallback (`112-114, 894-895, 1126`)**: Checks `res.success && res.data` (`data` does not exist on typed `api.getKycStatus` return shape!) and falls back to `user?.kycStatus` (does not exist on `User`); line `894-895` displays hardcoded `"XXXXX1234F"` when user PAN is missing.
  2. **Heavy Non-Monochrome Styling (`437-478, 499, 542-546, 638-678, 775, 1117, 1141`)**: Uses blue `.btn-gradient` (`450, 499, 1141`), `Sparkles` + `"Verified Account"` pill (`438`), `bg-primary` tabs (`638-678`), purple/emerald/amber/blue accents, negative banner overlap (`-mt-16`), `hover:scale-102`, `font-black` headings, `animate-pulse` skeletons (`559`) & sidebar dot (`Sidebar.tsx:55`).
  3. **Accessibility Gaps (`731, 891`)**: Creator Bio `<textarea>` (`731`) lacks `id` / `htmlFor` binding to `<label>` (`725`), and PAN `<Input>` (`891`) omits `id`/`label` binding (`<label>` at `875` has no `htmlFor`).
  4. **Workspace Sidebar Slop (`Sidebar.tsx:55-62, 137-168`)**: `uppercase tracking-wider`, `"100% SAFE"` emerald callout box, and `bg-neutral-950` dark concierge card with `text-emerald-400`.
- **Why It Is a Problem**: KYC API payload mismatch risks hiding/corrupting verification status; fake `"XXXXX1234F"` PAN creates severe trust/legal confusion; cobalt `.btn-gradient` violates brand monochrome & Unslop.
- **Recommended Correction**: Fix `Profile.tsx:112-114, 1126` KYC payload parsing and remove `"XXXXX1234F"` (show `"Not linked"` instead); remove `.btn-gradient` and `Sparkles` pills in favor of monochrome `<Button>`; add explicit `htmlFor`/`id` bindings on bio `<textarea>` and PAN input.

#### 6. Orders Page (`/orders`, `/payent/bookings`)
- **Component**: `frontend/src/pages/Orders.tsx` (`1–2417`)
- **Problem Identified**:
  1. **Receipt Modal Runtime Crash (`2343`)**: Renders `<Loader2 />` while `receiptLoading` is `true`, but `Loader2` is **not imported** (`Orders.tsx:1-37`) -> throws `ReferenceError: Loader2 is not defined` (`TS2304`).
  2. **Mock Sample Cancelled Orders Pollute Empty/Logged-Out View (`79-152, 646-681`)**: `DEFAULT_SAMPLE_ORDERS` (4 cancelled mock orders) is written to `localStorage` (`679`) and displayed when logged out or empty, preventing the `<EmptyState title="No orders yet" />` (`1140-1147`) from appearing cleanly and causing 4 TypeScript errors (`cancelledAt` missing on `Order`).
  3. **Broken Typed Router Navigate (`1125`)**: `navigate({ to: "/payments" })` fails TanStack Router type-checking (`TS2345`) because `routes/payments.tsx:14-17` requires `q` and `status` in search state.
  4. **Multi-Hue Status Chrome & Slop (`966-1010, 1388, 1921, 2337`)**: Heavy emerald/amber borders + `animate-ping` dot (`980`); `uppercase tracking-wider` section divider (`1388`); literal `✕` button text lacking `aria-label` in Receipt Modal (`2332-2338`); manual `h-16 sm:h-20` dock spacer (`1921`).
- **Why It Is a Problem**: Clicking `"Official Rental Receipt"` while loading crashes React; showing 4 fake cancelled orders to new/logged-out users destroys platform credibility.
- **Recommended Correction**: Import `Loader2` from `lucide-react`; remove `DEFAULT_SAMPLE_ORDERS` seeding; pass `{ q: "", status: "all" }` on `/payments` navigation; replace `✕` with `<X className="h-4 w-4" />` + `aria-label="Close receipt"`; remove `animate-ping` and tone KPI borders down to monochrome hairlines + subtle semantic indicators only where status requires distinction.

---

## 5. Responsive Audit (Viewport Matrix)

*Note: Per Phase 5 rules, live Chromium rendering could not run in this sandbox (see Section 10). All responsive checks below are verified directly against Tailwind CSS v4 breakpoints (`xs: 475px`? Note Tailwind default `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`; check custom `@theme` / utility classes in `styles.css`), CSS rules, container widths, and flex/grid definitions.*

### Desktop (`1440×900` & `1366×768`)
- **Horizontal Overflow**: Protected cleanly by `max-w-7xl` / `max-w-[1600px]` containers (`Home`, `Categories`, `Filters`, `Orders`). However, `Hero.tsx` product wrappers overhang right edges slightly and rely safely on `<section className="overflow-hidden">`.
- **Navbar Visibility**: Visible and sticky (`h-16`) at both `1440×900` and `1366×768` (`md:translate-y-0` keeps desktop unaffected by mobile autohide).
- **Bottom Navigation Overlap (`MainLayout.tsx:14` vs `Navigation4.tsx:282`)**: **Actual Defect.** `Navigation4` stays pinned at `bottom-6` (`24px`) + `44–56px` height on desktop while `MainLayout` only adds `md:pb-12` (`48px`), covering the bottom legal links of `Footer` at `1366×768` and `1440×900`.
- **Hero Composition**: Fits cleanly above the fold (`min-h-[385px]` + `py-8` + `64px` Navbar = `~513px` total height out of `768px`/`900px`), leaving visible space for the top of `Categories` cleanly inviting a scroll without a dead empty band.
- **Product Grids & Spacing**: `ExploreRentals`, `NewArrivals`, `RecentlyViewed`, `RecommendedForYou` render crisp `lg:grid-cols-4` grids; `WhyChoose` (`md:grid-cols-4`) leaves 2 empty slots in row 3 (`10` cards); `Filters.tsx` sidebar (`lg:w-[280px] xl:w-[26%]`) + `lg:grid-cols-3` cards balance comfortably.

### Tablet (`1024×768` & `768×1024`)
- **Grid Breakpoint Transitions**:
  - `1024px` (`lg`): Triggers `lg:grid-cols-4` on Home product sections (`~215px` card width) and shows the desktop `Sidebar` (`lg:block w-64`) in `Profile` and `Orders`. `Filters` gives `lg:w-[280px]` sidebar + `lg:grid-cols-3` cards (`~210px` wide).
  - `768px` (`md`): Home `ExploreRentals`/`NewArrivals` drop back to **`grid-cols-2`** (`md` has no 3-col step — cards jump from ~350px wide at `768px` directly to 4-col at `1024px`), leaving tall 3:4 portrait cards at `768×1024` portrait! Meanwhile `Categories.tsx` uses `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.
  - `768px` Tablet Hero (`md`): `min-h-[265px]`, `h1` `2.25rem`, caption `0.95rem` (`Hero.tsx:87-114`) keeps clean 2-col balance without overlap.
  - `768px` Tablet Navigation: `Navigation4` switches to desktop sizes at `window.innerWidth >= 768` (`Navigation4.tsx:170`), triggering tooltip overflow risks near screen edges on touch tablets (`iPad` `768×1024`), while `Sidebar` (`lg:block`) is hidden on `768px` portrait (forcing Profile/Orders users onto `DashboardLayout` without the left menu!).
  - `Filters.tsx:966`: At `768px` (`sm`/`md`), sidebar stays open in-flow at `200px–240px` beside `sm:grid-cols-2` results (`~235px` per card), which works well without overflow.

### Mobile (`430×932`, `390×844`, `360×800`)
- **Hero Composition (`Hero.tsx:87-217`)**: Enforces the approved 2-column split across all 3 mobile widths (`48fr / 52fr`). At `360px` (`px-3` = `24px` + `gap-2` = `8px` -> `328px` content width):
  - Left column (`~157px`): `h1` wraps cleanly in 2 lines (`18.4px`), `"Get What You Need, Without Owning It."` wraps onto 2–3 lines at `11px`, CTA `"Explore Rentals ->"` fits on one line (`whitespace-nowrap`), **but CTA height is only ~32px (`py-2 text-[11px]`)**, failing the 44px touch target floor.
  - Right column (`~171px`): `h-[145px]` holds overlapping studio laptop/headphones/camera proportionally within `overflow-hidden`.
- **Product Grids & Micro-Typography (`Filters.tsx` & `ProductDetails.tsx`)**:
  - **Severe Cramping**: `Filters.tsx:1114` uses `grid-cols-3 gap-1.5` below `640px`. At `360px` (`344px` main content width), each card is only `~109px` wide with `p-1` (`4px` padding) and `text-[7px]`–`text-[9.5px]` labels (`p.condition`, `/day`, vendor hidden). `ProductDetails.tsx:2346` Related Products also uses `grid-cols-3` (`~104px` wide on `360px`) with `text-[7.5px]`–`text-[9.5px]`.
  - Home product grids (`ExploreRentals`, `NewArrivals`, `RecentlyViewed`, `RecommendedForYou`) use `grid-cols-2` (`~158px` cards on `360px`), which fits cleanly! However `Categories.tsx` (Search Results) uses `grid-cols-1` below `640px` (`882, 915`), creating very long mobile vertical scrolling vs Home's `grid-cols-2`.
- **Home Categories Truncation (`Categories.tsx:127`)**: `grid-cols-3` at `360px` compresses 6 categories into ~102px columns where `"Cameras & Photography"` and `"Musical Instruments"` truncate (`line-clamp-1`).
- **Customer Reviews Card Overflow/Sync (`CustomerReviews.tsx:128`)**: `w-[88vw]` (`316px` at `360px`, `378px` at `430px`) scrolls cleanly inside `overflow-x-auto`, though pagination dot indexing (`Math.round(scrollLeft / clientWidth)`) drifts slightly on repeated swipes.
- **Navbar & Bottom Chrome Overlap (`Navbar.tsx`, `Navigation4.tsx`, `HelpChatbot.tsx`, `Filters.tsx`)**:
  - Mobile `Navbar` autohides past `100px` scroll down (`33-41`); mobile Search and Theme buttons are `36×36px` (`h-9 w-9 < 44px`).
  - `Navigation4` mobile dock targets are `38×38px` (`< 44px`). At `360px`, `5 × 38px + 4 × 6px gaps + 20px padding = 234px` (`fits within calc(100vw-1rem)` without overflow), while hover magnification widens to `46px` if touched/dragged.
  - Floating bottom-right `HelpChatbot` launcher (`bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-3 h-12 w-12`) sits directly above the right edge of the mobile `Navigation4` dock; on `/filters`, `Filters.tsx:1208` places its own `bottom-5 right-5` `Theme` pill directly behind/beside it!
- **Footer Behavior (`Footer.tsx:201-253`)**: Single-open accordion stacks cleanly without overflow at `360px`, `390px`, and `430px`, though `<ChevronDown>` is wrongly pushed to the LEFT of group headings by `styles.css:828`, and social links remain `32×32px` (`< 44px`).

---

## 6. Accessibility Findings

| Area | Empirical Finding & Location | Severity | Suggested Fix |
| :--- | :--- | :--- | :--- |
| **Keyboard Nav / Form Controls** | `Filters.tsx:537-570, 853-885`: Category & Condition checkboxes are bare `<label onClick>` + visual `<div>` squares — zero `<input type="checkbox">`, `role="checkbox"`, `tabIndex={0}`, or `onKeyDown` handlers. Entirely inoperable via keyboard or screen reader. | **P0** | Render `<input type="checkbox" checked={isChecked} onChange={...} className="sr-only" />` inside `<label>` (or native `<Checkbox>`), keeping custom styling via `peer-focus-visible:ring-2`. |
| **Screen-Reader Live Region** | `Hero.tsx:109-121`: Continuous `setTimeout` typing/deleting loop (`HERO_CAPTION`) wraps animated text in `aria-live="polite" aria-atomic="true"`, flooding screen readers with partial phrases indefinitely. | **P1** | Render the complete static string in a `<p className="sr-only">` inside the Hero text block, and mark the animated visual `<p>` + caret with `aria-hidden="true"`. |
| **Semantic Heading Hierarchy** | `Categories.tsx:808`: Search Results page starts at `<h2>` with zero `<h1>`. `Filters.tsx:922, 1183`: skips from `<h1>` (`922`) to `<h3>` (`1183`) in Empty State / `<h4>` (`1155`) in Product Card titles (`Filters` has `<h4>` cards under `<h1>` with no `<h2>`/`<h3>`). | **P1** | Promote `Categories.tsx:808` to `<h1>`; ensure Filters cards use `<h2>`/`<h3>` cleanly; keep one semantic `<h1>` per page. |
| **Icon-Only & Close Button Labels** | `Filters.tsx:980, 1064` uses literal `<` text; `Orders.tsx:2337` uses literal `✕` button without `aria-label`; `Categories.tsx:679, 695, 710, 725, 739` filter-chip remove `<button>`s and `Categories.tsx:570` search clear `<button>` lack `aria-label`; `SearchOverlay.tsx:207` clear button lacks `aria-label`; `ProductDetails.tsx` full-screen photo thumbnails (`2690, 2814`) lack meaningful accessible button labels (`Photo 1`, `Photo 2`). | **P1** | Add explicit `aria-label` to every icon-only / clear / close `<button>` and replace raw Unicode `✕` / `&lt;` with `aria-hidden="true"` Lucide SVGs. |
| **Dialog Keyboard / Focus Trap** | `SearchOverlay.tsx:177-185`: `role="dialog" aria-modal="true"` only handles `Escape` inside `<input onKeyDown>` (`200`), failing if focus moves to location drawer buttons or close button; does not trap focus or restore focus to trigger button on close. `ProductDetails.tsx:2550` fullscreen lightbox + `Orders.tsx:2322` Receipt modal lack `role="dialog" aria-modal="true"` and `Escape` handlers. | **P1** | Add window `Escape` listener when open, restore previous activeElement on close, add `role="dialog" aria-modal="true"` to all custom modals, or reuse existing Radix `@radix-ui/react-dialog` (`package.json:27`). |
| **Touch Target Sizes (`>= 44px`)** | `Hero.tsx:129` (`~32px` mobile CTA height), `Navbar.tsx:120, 132` (`h-9 w-9` = `36px`), `Navigation4.tsx:176` (`38×38px` mobile dock items), `RentalProductCard.tsx:97` (`h-8 w-8` = `32px`), `ProductCard.tsx:333, 348` (`h-8 w-8` = `32px`), `Categories.tsx:624, 638, 652` (`32px`), `Footer.tsx:114` (`h-8 w-8` = `32px`), `CustomerReviews.tsx:83, 91` (`36px`). | **P1** | Ensure interactive controls meet `min-h-[44px] min-w-[44px]` (or invisible hit-area expansion) on touch breakpoints (`< 768px`). |
| **Form Label Association** | `Profile.tsx:725-737` (Creator Bio `<label>` not linked to `<textarea>` via `htmlFor`/`id`); `Profile.tsx:875-899` (PAN `<label>` not linked to `<Input>`, while `<Input>` itself receives no `label` prop -> `id` is `undefined`). `Filters.tsx:627` Price numeric inputs and date inputs should also be verified for explicit labels. | **P1** | Bind every form label via explicit `htmlFor`/`id` or pass `label`/`aria-label` directly to `<Input>`. |
| **Visible Focus States** | `Navbar.tsx:120` mobile search `<button>` and `Footer.tsx:210` mobile accordion `<button>` (`focus:outline-none` without `focus-visible:ring`), `Filters.tsx:977` / `ProductDetails.tsx:2181, 2274` (`focus:outline-hidden` with no visible replacement ring), `Orders.tsx:1112` (`focus:outline-hidden focus:border-emerald-500`), `Categories.tsx:593` `<Link>` rely on browser defaults stripped or inconsistent with `focus-visible:ring-2`. | **P2** | Enforce unified `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white` globally on interactive buttons, links, checkboxes, and inputs. |
| **Image `alt` & Ambiguous Fallbacks** | `ProductDetails.tsx:2690, 2814` fullscreen grid/thumb `<img>` use `alt=""` on non-decorative selectable thumbnails; `RentalProductCard.tsx:83` / `Filters.tsx:1142` fallback image URL shows a DSLR photo regardless of item category; `Hero.tsx:153-213` duplicate hidden theme images repeat identical `alt` text. | **P2** | Provide descriptive `alt` text on gallery buttons/thumbs (`Photo 1 of <Title>`) or clear button `aria-label`; use neutral monochrome fallback placeholder or item-appropriate icon placeholder. |
| **Color Contrast (Light & Dark)** | Light Mode: `Hero.tsx` `text-neutral-500` on `bg-white` (`#737373` on `#FFFFFF` = `4.74:1`, passes AA for normal text), `text-neutral-400` (`#A3A3A3` on `#FFFFFF` = `2.54:1`, **FAILS AA** where used for readable text/icons/placeholders/meta at `WhyChoose`, `Categories`, `Filters:567`, `Orders:957, 2349`, `HowItWorks:51` (`STEP 01`), `Hero:114`? Hero uses `neutral-900` so OK). Dark Mode: `text-neutral-500` on `#1E1E1E` / `#0A0A0A` (`#737373` on `#1E1E1E` = `3.46:1`, **FAILS 4.5:1**; `Categories.tsx:810` `text-neutral-400` on `bg-white` fails if not dark-overridden). `ProductDetails.tsx:2274` `text-red-600` on `bg-card` vs `text-red-400` on `#1E1E1E`, and disabled booking class `text-amber-300` on `bg-amber-900/40` (`2297`) risk low contrast in Light Mode! | **P1** | Replace informational `text-neutral-400` in Light Mode and `text-neutral-500` in Dark Mode with `neutral-600` (`5.74:1` on white) and `neutral-400` (`>= 6.5:1` on `#1E1E1E`/`#0A0A0A`); ensure disabled banner styles include dark/light readable text tokens. |
| **Reduced-Motion Support** | `__root.tsx:376` sets `<MotionConfig reducedMotion="user">` and `Hero.tsx:14` checks `prefers-reduced-motion: reduce`, **however** Tailwind CSS class animations (`animate-pulse` in `Hero.tsx:117`, `Home.tsx:66`, `Sidebar.tsx:55`, `ProductDetails.tsx:2140`, `ProductCard.tsx:292`; `animate-ping` in `Orders.tsx:980`, `HelpChatbot.tsx:226`) and `hover:-translate-y-1` / `scale-105` transitions (`RentalProductCard`, `Filters`, `ProductCard`) ignore `MotionConfig` unless gated with `motion-reduce:animate-none motion-reduce:transition-none` or removed outright. | **P2** | Remove non-live `animate-pulse`/`animate-ping` and `hover:scale`/`lift` animations per Unslop §9, and gate necessary transitions with `motion-reduce:transition-none`. |

---

## 7. Priority Classification

Every unique, verified issue identified across Phases 3–11 is cataloged once below (`F-01`–`F-40`):

### Summary Table
| Severity | Definition | Count | Finding IDs |
| :--- | :--- | :---: | :--- |
| **P0** | Critical usability, crash, broken flow, or accessibility blocker | **8** | `F-01` – `F-08` |
| **P1** | Major visual, design-system, responsive, or accessibility issue | **14** | `F-09` – `F-22` |
| **P2** | Moderate design, copywriting, typography, icon, detail, or motion inconsistency | **12** | `F-23` – `F-34` |
| **P3** | Minor code/CSS/layout refinement | **6** | `F-35` – `F-40` |
| **Total** | **All verified real issues** | **40** | `F-01` – `F-40` |

---

### P0 — Critical Usability or Functionality Problems (8)
- **F-01 (`P0`)**: **Home Card Wishlist Passes Full `Product` Object Instead of `string` ID** — `RentalProductCard.tsx:47` vs `useWishlist.ts:83-102`. Breaks wishlist state (`has(product.id)` never becomes `true`), sends wrong argument type to `api.toggleWishlist`, causes `TS2345`, and breaks Wishlist page sync.
- **F-02 (`P0`)**: **Broken Category Filter Query Key (`?category=` vs `?cat=`)** — `Home Categories.tsx:97, 182` & `SearchOverlay.tsx:302, 468` emit `?category=<id>`, whereas `Categories.tsx:156`, `routes/browse.tsx:7`, and `routes/categories.tsx:7` read `?cat=<id>`. Every Home subcategory/category CTA drops the category filter on `/browse`.
- **F-03 (`P0`)**: **Receipt Modal Runtime Crash (`ReferenceError: Loader2 is not defined`)** — `Orders.tsx:2343` renders `<Loader2 />` without importing `Loader2` at `Orders.tsx:1-37` (`TS2304`). Opening a booking receipt crashes the UI while loading.
- **F-04 (`P0`)**: **Global CSS Reverses Trailing Icons & `<Button>` Misplaces `rightIcon`** — `styles.css:828-833` + `Button.tsx:114, 123, 127, 129`. `order: -1 !important` on button SVGs inverts `Explore Rentals ->` (`Hero`), `Next >` (`ExploreRentals`, `NewArrivals`), and mobile Footer accordion chevrons (`Footer.tsx:213`).
- **F-05 (`P0`)**: **Fake Hardcoded Fallbacks Mask Missing/Real Data** — `ProductDetails.tsx:362-383` forces `"Sony Alpha a7 III"` (`Sai Teja`, `₹499`, `124` reviews), making `"Product not found"` (`1365-1382`) unreachable; `ProductDetails.tsx:2166` defaults lender to `"Arun Kumar"`; `Profile.tsx:894-895` shows fake PAN `"XXXXX1234F"`.
- **F-06 (`P0`)**: **Hardcoded Cancelled Sample Orders Pollute Empty/Logged-Out `Orders` & Invalid `/payments` Nav** — `Orders.tsx:79-152, 646-681` seeds 4 fake cancelled bookings into `localStorage`; `Orders.tsx:1125` calls `navigate({ to: "/payments" })` missing required `search` params (`routes/payments.tsx:14-17`, `TS2345`).
- **F-07 (`P0`)**: **Keyboard & Screen-Reader Inaccessible Filter Checkboxes** — `Filters.tsx:537-570, 853-885`. Interactive `<label onClick>` visual boxes lack native `<input type="checkbox">`, `role`, `tabIndex`, and keyboard activation.
- **F-08 (`P0`)**: **Broken KYC Response Parsing Type/Runtime Mismatch** — `Profile.tsx:112-114, 1126` reads `res.data` (`TS2339`: fields live at top level of `api.getKycStatus` response) and `user?.kycStatus` (`TS2551`: `User` defines `status`), risking wrong or empty KYC status rendering.

### P1 — Major Visual, Design-System, Responsive, or Accessibility Issues (14)
- **F-09 (`P1`)**: **Design-System Color Violation (`styles.css:104-281, 620-689`)** — Cobalt blue `--primary`/`--ring`, `.btn-gradient` blue glows, `#16A36A` (`HelpChatbot`), `#8FAF7E` (`Filters`), and emerald/purple/sky/amber/rose chrome across Secondary Pages violate `[paYent Brand Rule]` monochrome and `[Unslop Color]`, alongside `#1E1E1E` vs `#0A0A0A` dark surface clashes.
- **F-10 (`P1`)**: **Mobile `grid-cols-3` Sub-11px Card Cramping** — `Filters.tsx:1114-1170` and `ProductDetails.tsx:2346-2394` squeeze 3 cards per row on `360px–430px` phones (`~105px` width, `7px–9.5px` micro-text).
- **F-11 (`P1`)**: **Mobile Hero Text & Touch-Target Squeeze** — `Hero.tsx:87-135` at `360px–390px`: keeping the mandated 2-column split drops `<h1>` to `18.4px`, caption to `11px`, and primary `"Explore Rentals"` CTA height to `~32px` (`< 44px`).
- **F-12 (`P1`)**: **Floating `Navigation4` Overlaps Desktop `Footer` & Uses Sub-44px Mobile Targets** — `MainLayout.tsx:14` (`md:pb-12`) vs `Navigation4.tsx:176, 282` (`38×38px` mobile buttons, hover-only tooltips invisible on touch, overlaps Footer bottom bar and collides visually with `HelpChatbot`/`Filters` Theme button).
- **F-13 (`P1`)**: **Hero Typewriter `aria-live="polite"` Screen-Reader Flood** — `Hero.tsx:109-121` continuously announces typing/deleting letters forever, alongside `animate-pulse` caret.
- **F-14 (`P1`)**: **SearchOverlay Keystroke Full-Fetch, `window.alert()`, & Modal Focus Trap Gaps** — `SearchOverlay.tsx:98-124, 148, 161, 178-184` refetches `getFilteredProducts()` without sending `q` or aborting stale requests, reads non-existent `p.name`/`p.daily_rate`, blocks UI with `window.alert()` on GPS denial, and only handles `Escape` when `<input>` is focused without restoring focus.
- **F-15 (`P1`)**: **Storefront Card & Route Split (`RentalProductCard` vs `ProductCard`)** — `Categories.tsx` and `Wishlist.tsx` use dark-bleed tilted/scaled multi-pill `ProductCard` (`/payent/products/$id` context shift) instead of Home's monochrome `RentalProductCard` (`/product/$id`).
- **F-16 (`P1`)**: **Product Details Gallery-Baked `<h1>`, Red `"T&C will apply"`, Spring SVG & Route Hardcode** — `ProductDetails.tsx:1432-1512, 2186-2287, 2350` traps `<h1>` over photo gradient overlay, styles legal terms in error-red beside bouncy SVG spring paths, and hardcodes Related Products links to `/payent/products/$id`.
- **F-17 (`P1`)**: **TypeScript Schema Drift Blocking Strict Type-Checks (`tsc --noEmit`)** — `RentalProductCard.tsx`, `ExploreRentals.tsx`, `NewArrivals.tsx`, `SearchOverlay.tsx`, `Categories.tsx:792` (`strokeWidth` on icon prop `TS2769`), `ProductDetails.tsx:1386-1387, 1721-1722` fail `tsc` against `Product` (`daily_rate`, `name`, `created_at`) and component prop types.
- **F-18 (`P1`)**: **Double Preloading Delay, Route Target Split, & Mobile Navbar Autohide** — `AppPreloader.tsx` (~5.9s splash redirecting `/` -> `/select`) + `Home.tsx:61-73` (2nd 200ms `animate-pulse` curtain); `Navbar`/`Footer`/`Navigation4` point to `/payent` alongside `/payant`; mobile Navbar (`33-41, 120`) autohides past `100px` down-scroll and uses a `36×36px` Search button (`< 44px`).
- **F-19 (`P1`)**: **Search Results Missing `<h1>`, Label-Free Category Circles, & Small Header Hitboxes** — `Categories.tsx:595, 621-662, 767-796, 808` lacks an `<h1>`, gives touch users icon-only category circles without text labels, hides `"Filters"` `< xs`, and leaves Notification/Wishlist/Messages icons at `32×32px` on mobile.
- **F-20 (`P1`)**: **Filter Page Duplicate Floating Theme Pill Colliding with Chatbot & Missing Dock Clearance** — `Filters.tsx:905-1228` omits `MainLayout` yet renders `Navigation4` + `HelpChatbot` + its own fixed `bottom-5 right-5` `Theme` button (`amber-400`/`blue-400` icons), plus literal `<` ASCII Close buttons.
- **F-21 (`P1`)**: **Profile Heavy Gradient/Slop Styling & Unlabeled Form Controls** — `Profile.tsx:438-503, 546, 731, 891` + `Sidebar.tsx` combine `.btn-gradient`, `<Sparkles>` `"Verified Account"` pill, negative banner overlap (`-mt-16`), unlabeled Bio `<textarea>` & PAN `<Input>`, pulsing dot, and emerald `"100% SAFE"` sidebar box.
- **F-22 (`P1`)**: **Orders Multi-Hue KPI Noise, `animate-ping` Dots, & Unlabeled `✕` Modal Close** — `Orders.tsx:966-1010, 1388, 1921, 2337` + contrast failures on `neutral-400`/`500` captions across dark/light modes (`ProductDetails:2297`, `HowItWorks:51`, `Orders:957, 2349`).

### P2 — Moderate Design, Copywriting, Type, Detail, or Motion Inconsistencies (12)
- **F-23 (`P2`)**: **Four Brand Spellings & Three Taglines** — `"Payent"`, `"paYent"`, `"PAYENT"`, `"pay₹ent"` + 3 taglines (`branding.ts:10`, `Hero.tsx:4`, `Footer.tsx:160`) + dead `PayentLogoMark` returning `null` (`LogoIcon.tsx:12`).
- **F-24 (`P2`)**: **`[Unslop Motion]` `transition-all` & Hover Scale/Lift** — `Hero.tsx:145, 167, 193`, `RentalProductCard.tsx:58, 87`, `Categories.tsx:151`, `Navbar.tsx`, `Filters.tsx:1131, 1139, 1212`, `ProductCard.tsx:244, 269`.
- **F-25 (`P2`)**: **`[Unslop Type]` Heavy Weights (`700–900`), Uppercase Wide Tracking, Negative Small-Text Tracking, & Italics** — `HowItWorks:8-20`, `Footer:168`, `Categories:177`, `LogoIcon`, `Profile`, `ProductDetails:2489` italics, `Hero:114` / `Filters:557` tight tracking on `< 16px`.
- **F-26 (`P2`)**: **`[Unslop Copy]` Exclamation Marks, Wordy Placeholders, Hype Words & Trailing Periods** — `ProductDetails:2838`, `ProductCard:230`, `Navbar:104`, `SearchOverlay:202`, `Categories:565`, `HowItWorks:34`, `WhyChoose:64`.
- **F-27 (`P2`)**: **Hero Dual `<img>` Eager Loading & Missing Intrinsics + Layered Shadow Blobs** — `Hero.tsx:60-83, 144-216` renders both Light and Dark `loading="eager"` `<img>` tags without `width`/`height`.
- **F-28 (`P2`)**: **Home Categories Mobile Truncation & Inconsistent Icon Sizing** — `Categories.tsx:122, 127, 155, 186` vs `NewArrivals:67`; 3-col layout at `360px` clips long names (`Cameras & Photography`, `Musical Instruments`).
- **F-29 (`P2`)**: **WhyChoose 10-Card Orphaned 4-Col Grid & Decorative `Sparkles` Icon** — `WhyChoose.tsx:45, 82` leaves 2 orphaned slots on row 3 (`md:grid-cols-4`).
- **F-30 (`P2`)**: **CustomerReviews `select-none`, Non-Clickable Dots & `88vw` Dot-Index Drift** — `CustomerReviews.tsx:83, 128, 169-181`.
- **F-31 (`P2`)**: **Footer Duplicate Legal Links (`/privacy`, `/about`, `/support`), Dead App Store Box & 32px Social Icons** — `Footer.tsx:57-74, 114, 259-261`.
- **F-32 (`P2`)**: **Home Grid Client-Side Full-Catalog Slicing, Control-Radius Mix & Missing New Arrivals Empty State** — `ExploreRentals.tsx:52-90, 126`, `NewArrivals.tsx:20-28, 97-134`.
- **F-33 (`P2`)**: **Wishlist Empty-State `.card-premium` Hover Lift & Home Back-Route Mismatch** — `Wishlist.tsx:36, 46, 50` + `ProductCard` visual inconsistency.
- **F-34 (`P2`)**: **Missing `tabular-nums`, Inconsistent Price Fonts, & Icon Stroke Drift (`1.5–3.0`)** — `RentalProductCard`, `ProductCard`, `Filters`, `Orders`, `Hero`, `Categories`, `Navbar`.

### P3 — Minor Refinements (6)
- **F-35 (`P3`)**: `Navigation4.tsx:18, 148-155, 214` — Stale JSDoc claiming 4 items while rendering 5, plus unused `CircleHelp` & `tCommon` imports.
- **F-36 (`P3`)**: `ExploreRentals` / `NewArrivals` / `RecentlyViewed` / `RecommendedForYou` — Section `py-*` micro-inconsistencies, `animate-pulse` skeletons, and post-hydration vertical jump when `RecentlyViewed` loads asynchronously.
- **F-37 (`P3`)**: `Input.tsx:37` & `SectionBox.tsx:4` — `rounded-[20px]` oversized pill-ish input radius vs `rounded-xl` adjacent buttons (`tokens.md`: 8–10px), plus `SectionBoxProps` `TS2430` type signature conflict with `HTMLAttributes<HTMLDivElement>`.
- **F-38 (`P3`)**: Non-existent Tailwind spacing class `py-0.2` (`Filters.tsx:987, 1067, 1146`, `Orders.tsx:416, 1069`, `Navigation4.tsx:129`, `ProductCard.tsx:418`, `ProductDetails.tsx:2284`) silently rendering `0px` vertical padding.
- **F-39 (`P3`)**: Minor copy & decorative icon polish (`Filters.tsx` `"Reset"` vs `"Clear all"`; `ProductDetails.tsx` `"BOOK NOW"` uppercase vs `"Write a Review"` + `<Sparkles>`).
- **F-40 (`P3`)**: Gateway `/` & `/select` (`ProductSelection.tsx:125-139, 187, 230`) — editorial uppercase metadata (`ORIGIN | paYent / GATEWAY | 2026`) and SVG `feTurbulence` noise background.

---

## 8. Recommended Implementation Order

Execute fixes incrementally across **6 focused phases**, verifying TypeScript (`npx tsc --noEmit`) and responsive Light/Dark views at each step without breaking any backend or payment workflow:

1. **Phase 1 — Hotfix Runtime Crashes, Broken Flows & Keyboard P0s (`F-01` – `F-08`)**
   - Fix `RentalProductCard.tsx:47` (`toggle(product.id)`).
   - Unify category query param to `cat` in `Home Categories.tsx` & `SearchOverlay.tsx` (with fallback reader for `?category=` in `Categories.tsx` to preserve any shared bookmarks!).
   - Import `Loader2` in `Orders.tsx`, remove `DEFAULT_SAMPLE_ORDERS` seeding, and fix `navigate({ to: "/payments", search: { q: "", status: "all" } })`.
   - Remove global `styles.css:828-833` `order: -1 !important` rule and make `<Button>` respect `rightIcon` separately from `leftIcon`/`icon` (never touching click behavior).
   - Replace `Filters.tsx` fake checkboxes with accessible `<input type="checkbox" className="sr-only">` inside interactive `<label>`s.
   - Remove fake `ProductDetails` fallback (`362-383`), fake lender `"Arun Kumar"`, and fake `"XXXXX1234F"` PAN fallback; fix `Profile.tsx:112-114, 1126` KYC payload parsing cleanly against the actual API JSON shape (confirm backend field naming first!).
2. **Phase 2 — Strict TypeScript Alignment & Accessibility Baseline (`F-13, F-14, F-17, F-19, F-21a`)**
   - Align `Product` (`src/types/index.ts`) and API mappers so `daily_rate`/`name`/`created_at` drift resolves; fix `Categories.tsx:792`, `SectionBox.tsx:4`, and `ProductDetails.tsx` TS diagnostics.
   - Fix `Hero` `aria-live` continuous typewriter trap (add static `sr-only` caption), add `<h1>` to Search Results (`Categories.tsx`), bind Profile Bio `<textarea>` & PAN `<Input>` labels, add modal `Escape` + focus restoration + `aria-label`s on icon-only buttons, replace `window.alert()` in `SearchOverlay` with non-blocking toast/inline error text.
3. **Phase 3 — Global Monochrome Token & Secondary Page Convergence (`F-09, F-15, F-20, F-21, F-22, F-23`)**
   - Align `styles.css` tokens (`--primary`, `--ring`, `.btn-gradient`, dark surface base) to paYent monochrome Light/Dark values (keeping subtle semantic colors *only* where order/KYC/error status conveys meaning, inside monochrome hairlines).
   - Standardize brand wordmark (`paYent` or `Payent` confirmed by stakeholder), canonical Home route (`/payent` vs `/payant`), tagline, and unify catalog card design across `/browse` and `/wishlist`.
   - Clean up `ProductDetails` (calm header typography off photo overlay, monochrome `"Terms apply"` trigger), `Profile`, and `Orders` badges.
4. **Phase 4 — Mobile Responsive & Navigation Shell Polish (`F-10, F-11, F-12, F-18, F-20`)**
   - Fix `MainLayout.tsx` bottom clearance (`md:pb-24` or hide redundant floating dock on desktop); raise mobile icon/button hitboxes to `>= 44×44px` (`Navbar`, `Hero` CTA, `Navigation4`, card hearts); remove duplicate `/filters` floating `Theme` button colliding with `HelpChatbot`.
   - Switch `Filters` and `ProductDetails` Related Products mobile grids from `grid-cols-3` -> `grid-cols-2` with `>= 12px` text; widen `Home Categories` mobile columns cleanly.
5. **Phase 5 — Unslop Craft Passes (`F-24` – `F-34`)**
   - Spacing (`4px` grid, fix `WhyChoose` 10-card orphan grid to 8 or 6), Typography (`tabular-nums`, weights `400–600`, sentence case labels, no italics/negative small-text tracking), Icons (single size & stroke `1.5`, remove decorative `Sparkles` & raw `✕`/`<`), Copywriting (clean up exclamation marks, wordy placeholders, hype words), and Footer link verification.
6. **Phase 6 — Motion, Assets & Cleanup (`F-35` – `F-40`)**
   - Strip `transition-all`, non-live `animate-pulse`/`animate-ping`, bouncy springs, and card hover scale/lift; convert Hero theme image duplication to single active/responsive loading with intrinsics; remove non-existent `py-0.2` classes.

---

## 9. Existing Functionality Risks

Every proposed UI/Audit fix must protect the following 15 live production flows:

| # | Functionality / Integration | Current Integration State | Risk During Redesign / How to Protect |
| :--- | :--- | :--- | :--- |
| **1** | **Product API Integration** | `api.getFilteredProducts()`, `api.getPublicProducts()`, `api.getProductById()` + localStorage `"payent_server_products"` cache & fake-product filter (`isFakeOrDeletedProduct`). | **High**: When removing `ProductDetails.tsx:362-383` fake fallback, ensure backend `/products/:id` returns clean HTTP 404/null without breaking preloaded product caches; preserve `api.cacheProduct()` for fast navigation. |
| **2** | **Category API Integration** | `api.getPublicCategories()` / `api.getCategories()` merged with canonical/primary frontend category IDs (`electronics`, `vehicles`, `cameras`, `tools`, `music`, `gaming` vs `/browse` `cameras`, `laptops`, `bikes`, `sound`, `tools`, `drones`). | **Critical**: Home `CANONICAL_CATEGORIES` (`Hero`/`Categories`) uses IDs like `electronics`, `vehicles`, `cameras`, whereas `/browse` (`Categories.tsx:55-65`) uses `laptops`, `bikes`, `audio`, `cameras`. Fix `?category=` -> `?cat=` AND ensure `matchCategory()` handles `electronics` & `vehicles` aliases cleanly! |
| **3** | **Search & SearchOverlay** | `SearchOverlay` calls `api.getFilteredProducts()` client-side; `Categories.tsx` calls `searchWithML()` / `advancedSearch()`. | **Medium**: Moving SearchOverlay from full-catalog polling to server-side query search must gracefully fall back to cached catalog if `searchML` fails, and preserve search history (`api.recordSearch` / `getSearchHistory`). |
| **4** | **Filtering (`/filters` & URL Search)** | URL-synced search params (`q`, `cat`, `min_p`, `max_p`, `city`, `pincode`, `cond`, `start`, `end`, `sort`). | **High**: Converting fake `<label onClick>` checkboxes to `<input type="checkbox">` must keep `handleToggleCat` / `handleToggleCondition` & `syncUrlParams()` exact behavior, preserving multi-select comma-joined `?cat=a,b` URLs. |
| **5** | **Sorting** | Home `ExploreRentals` (`relevant`, `newest`, `price_asc`, `price_desc`) and `/browse` (`featured`, `newest`, `price_asc`, `price_desc`, `rating`). | **Low**: Keep mapped query param values identical; wait until backend guarantees sorted payloads before dropping client sort fallbacks (`daily_rate ?? price`). |
| **6** | **Pagination & State Restore** | `ExploreRentals` saves `{ page, sort }` in `sessionStorage["payent_explore_state"]`. | **Low**: Keep `sessionStorage` key and `#explore-rentals` scroll anchor intact when updating pagination arrows/styles. |
| **7** | **Wishlist (`useWishlist`)** | Module-level singleton `_globalWishlistIds` synced with `api.getWishlist(token)` / `api.toggleWishlist(token, id)`. | **Critical**: Fixing `RentalProductCard.tsx:47` to pass `product.id` immediately restores cross-page wishlist sync between Home, `Categories`, `ProductDetails`, and `/wishlist`. Preserve unauthenticated login redirect prompt (`toast` + `/login`). |
| **8** | **Authentication & Session Handling** | `useAuth()` + `STORAGE_KEYS` + global `payent-session-expired` event (`__root.tsx:299-335`). | **Medium**: Navbar & Profile visual updates must keep `/login`, `/register`, protected-route redirect params (`?redirect=...`), and account-pending banners intact. |
| **9** | **Product Details Navigation** | Dual routes (`/product/$id` from Home & Filters vs `/payent/products/$id` from `/payent` & Related Products). | **Medium**: Standardize link destinations carefully while keeping **both** TanStack route files active so existing deep links and SEO canonical paths never 404. |
| **10** | **Booking & Slot Availability** | `ProductDetails.tsx` duration modes, time slots, date-overlap checks against `STORAGE_KEYS.orders`, `termsAccepted` gate, `BOOK NOW` availability verify -> `/checkout`. | **High**: When restyling `ProductDetails` T&C checkbox (replacing spring SVG) and `BOOK NOW` button, preserve `termsAccepted`, `role="checkbox"`, `handleBookNowAction`, and Checkout query params (`id`, `start`, `end`, `slot`, `mode`). |
| **11** | **Payments & Checkout** | `Checkout.tsx` loads Razorpay script, saved addresses (`UserAddress`), promo codes, booking creation, and `/payments` (`PaymentHistory.tsx`). | **High**: Do not touch Razorpay/Checkout payload shapes; only pass `{ q: "", status: "all" }` when navigating from `Orders.tsx:1125` to `/payments` so route `validateSearch` contract stays valid. |
| **12** | **Orders, PIN & Receipts** | `Orders.tsx` booking lifecycle tabs, 4-digit handover PIN / cancellation / location change requests, and Receipt modal (`getReceipt`). | **High**: Verify whether any test/demo environment depends on `DEFAULT_SAMPLE_ORDERS` before removing seeding, and ensure `Loader2` is imported cleanly in `Orders.tsx`. |
| **13** | **User Profile & KYC** | `Profile.tsx` stats (`getUserProfileStats`), KYC status (`getKycStatus`), GPS detection (`detectCurrentLocation`), webcam selfie photo modal, password/session management. | **Critical**: Inspect live backend `/kyc/status` response format before altering `Profile.tsx:112` (`res.data` vs top-level `res`) — if the backend actually wraps inside `.data` at runtime despite the TS client return type, changing `.data` blindly would break KYC display! Update the TypeScript type to match reality first. |
| **14** | **Theme Switching (Light / Dark / System)** | `useTheme()` shared class-based `.dark` root toggle synced across Navbar, Gateway, Filters. | **Medium**: When retiring `#1E1E1E` overrides in `styles.css` in favor of monochrome surface tokens, test every secondary route (`Checkout`, `Admin`, `Profile`, `Filters`) so dark mode text/inputs (like `SectionBox` cutout backgrounds `cutoutBgClass`) never lose background masking. |
| **15** | **Mobile Navigation, Dock & Chatbot** | `Navigation4` (`__root.tsx:262`), `HelpChatbot` (`__root.tsx:266`), `CartDrawer` (`__root.tsx:265`). | **Medium**: Adjusting `Navigation4` sizing/visibility or `MainLayout` padding must preserve z-index layering above content without covering `CartDrawer` (`z-50`), `SearchOverlay` (`z-50`), or mobile `HelpChatbot` launcher (`#payent-chatbot-launcher`). |

---

## 10. Final Summary

### What Was Inspected & Empirically Verified
1. **Official Unslop Skill Installation**: Installed and verified on disk at `C:\payernt-main\payernt-main\frontend\.agents\skills\unslop\` (`SKILL.md`, `agents/openai.yaml`, all 5 `references/*.md`, 5 `references/refs/*.webp`, `scripts/snapshot.mjs`, `scripts/story.mjs`). Verified `frontend/package.json` and all production files unmodified via `git diff` and `git status -s`.
2. **Antigravity Skill Discovery Check**: Verified empirically via `Test-Path` and `Get-ChildItem` against active workspace `C:\payernt-main\.agents\skills\` (contains 12 GSD skills, not `unslop`) — confirmed why reload/path alignment is required for automatic discovery.
3. **Full Frontend Architecture & Routing Audit**: Inspected `frontend/package.json`, `src/styles.css`, `src/config/branding.ts`, `src/types/index.ts`, `src/hooks/useTheme.ts`, `src/hooks/useWishlist.ts`, `src/layouts/MainLayout.tsx`, `src/layouts/DashboardLayout.tsx`, `src/routes/__root.tsx`, `src/routeTree.gen.ts`, and core route definitions (`index`, `select`, `payant`, `payent`, `browse`, `categories`, `filters`, `payments`, `product.$id`, `payent/products.$id`, `payent/explore`, `payrent`).
4. **Source-Level Audit of All 12 Home Page Areas & 6 Secondary Pages**: Inspected every line of `Home.tsx`, `Navbar.tsx`, `Hero.tsx`, `SearchOverlay.tsx`, `Categories.tsx` (Home), `ExploreRentals.tsx`, `NewArrivals.tsx`, `RecentlyViewed.tsx`, `RecommendedForYou.tsx`, `CustomerReviews.tsx`, `HowItWorks.tsx`, `WhyChoose.tsx`, `Footer.tsx`, `Navigation4.tsx`, `MobileBottomNav.tsx`, `RentalProductCard.tsx`, `ProductCard.tsx`, `Button.tsx`, `Input.tsx`, `SectionBox.tsx`, `LogoIcon.tsx`, `AppPreloader.tsx`, `Sidebar.tsx`, `HelpChatbot.tsx`, `ProductSelection.tsx`, and Secondary Pages (`ProductDetails.tsx`, `Categories.tsx`, `Filters.tsx`, `Wishlist.tsx`, `Profile.tsx`, `Orders.tsx`, `Checkout.tsx`).
5. **Static TypeScript Check (`npx tsc --noEmit`)**: Executed against `frontend/tsconfig.json`, surfacing real compile/runtime-risk diagnostics across audited components (`RentalProductCard`, `ExploreRentals`, `NewArrivals`, `SearchOverlay`, `Categories`, `Filters`, `Orders`, `ProductDetails`, `Profile`, `SectionBox`).

### What Remains Unverified (Environment Constraint)
- **Live Browser Rendering & Pixel-Level Visual Inspection**: Could **not** be executed because the Windows AppContainer terminal sandbox blocks localhost socket binding (`connect EACCES` / loopback restrictions) and crashes headless Chromium (`exit code -1073741819`), preventing live dev-server startup and Playwright screenshot capture (`scripts/snapshot.mjs`).
- As a result, rendered pixel overflow, computed font kerning/line-breaks on live API product strings, dynamic third-party map/Razorpay modal visuals, and runtime API JSON shapes (e.g., `/kyc/status` actual response shape vs TypeScript client signature) remain **unverified at runtime** and should be visually inspected locally at `1440×900`, `1366×768`, `1024×768`, `768×1024`, `430×932`, `390×844`, and `360×800` once implementation begins.
