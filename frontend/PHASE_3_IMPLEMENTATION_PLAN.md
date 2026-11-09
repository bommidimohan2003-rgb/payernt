# paYent Marketplace — Phase 3 Implementation Plan (`F-23` – `F-34`)

> **Phase**: Phase 3A — Read-Only P2 Verification & Implementation Plan  
> **Date**: 2026-11-09  
> **Frontend Root**: `c:\payernt-main\payernt-main\frontend`  
> **Backend Root**: `c:\payernt-main\payernt-main\backend`  
> **Authoritative Audit Source**: [`UNSLOP_AUDIT_REPORT.md`](./UNSLOP_AUDIT_REPORT.md)  
> **Prior Phase Reports**: [`P0_FIX_REPORT.md`](./P0_FIX_REPORT.md) | [`P0_RUNTIME_VERIFICATION_REPORT.md`](./P0_RUNTIME_VERIFICATION_REPORT.md) | [`PHASE_2_IMPLEMENTATION_REPORT.md`](./PHASE_2_IMPLEMENTATION_REPORT.md) | [`PHASE_2_RUNTIME_VERIFICATION_REPORT.md`](./PHASE_2_RUNTIME_VERIFICATION_REPORT.md)

---

## 1. Phase 3 Guardrails & Preservation Matrix

Before any source modification, the following production contracts and verified Phase 1 / Phase 2 invariants are locked:

1. **Approved Hero Showcase Composition**: Preserve [`Hero.tsx`](./src/components/home/Hero.tsx) two-column layout across all breakpoints (`grid-cols-[minmax(0,48fr)_minmax(0,52fr)]`), headline `"Rent Anything"` (`font-medium`) / `"You Need"` (`font-bold`), static+animated caption `"Get What You Need, Without Owning It."` (retaining its canonical trailing period), and `"Explore Rentals"` primary CTA (`min-h-[44px]`).
2. **Phase 1 P0 Preservation (`F-01` – `F-08`)**: Preserve string ID wishlist normalization/rollback (`useWishlist.ts`, `RentalProductCard.tsx`), `cat` category normalization (`categoryFilter.ts`), receipt loading/error/retry and `Loader2` import (`Orders.tsx`), natural button SVG order (`Button.tsx`, `ui/button.tsx`, `styles.css`), authentic product/owner/PAN non-fabrication (`ProductDetails.tsx`, `Profile.tsx`), zero legacy sample order injection (`Orders.tsx`), accessible `sr-only` filter checkboxes (`Filters.tsx`), and flat `/api/kyc/status` parsing (`utils/kyc.ts`).
3. **Phase 2 P1 & Runtime Observation Preservation (`F-09` – `F-22`, `Obs A` – `Obs D`)**: Preserve monochrome CSS tokens (`--background: #0A0A0A`, `--card: #141414`, `--primary: #FAFAFA`), SSR/CSR hydration parity (`Obs B`), `/api/search/stats` (`Obs A`), `Orders` HTTP 500 error propagation (`Obs C`), desktop vs mobile filter ID prefix separation (`Obs D`), `44px+` touch targets, `Navigation4` (`isDesktop ? 46 : 48`), `MainLayout` (`md:pb-32`), `SearchOverlay` `AbortController` + focus trap, `ProductDetails` calm `<h1>` + `relatedPageSize = 4`, and existing passing tests (`p0-fixes.test.ts`, `phase2-p1-fixes.test.ts`).
4. **Data & Gateway Compatibility**: Keep gateway dual-path branding (`paye₹nt` lender pathway vs `pay₹ent` renter pathway) intact in [`ProductSelection.tsx`](./src/components/selection/ProductSelection.tsx) and `/payant` / `/payent` aliases, keep all `localStorage` / `sessionStorage` keys untouched, and perform zero mutations against live TiDB Cloud customer tables.

---

## 2. Scope Summary (`F-23` – `F-34`)

| Finding | Initial Classification | Risk Level | Summary of Current State |
| :--- | :---: | :---: | :--- |
| **F-23** | `CONFIRMED` | Low | 4 brand spellings (`Payent`, `paYent`, `PAYENT`, `pay₹ent`) and mismatched taglines remain across config, SEO heads, `AppPreloader`, `PrivacyPolicy`, `About`, `Support`, `CreatorCommunity`; dead `PayentLogoMark` in `LogoIcon.tsx` (`About.tsx`); unused legacy `ProductCard.tsx` still in tree. |
| **F-24** | `CONFIRMED` | Low | Residual `transition-all`, hover/active scale (`scale-102`, `active:scale-95`, `group-hover:scale-[1.02]`), missing unified `focus-visible:ring-2`, and fallback DSLR photo URLs (`RentalProductCard.tsx`, `Filters.tsx`) remain in active storefront components. |
| **F-25** | `CONFIRMED` | Low | Heavy `font-black` / `font-extrabold`, uppercase wide-tracked eyebrows/steps (`HowItWorks`, `Categories`, `Orders`, `Profile`, `PrivacyPolicy`, `About`), italics (`Orders`), negative tight tracking on small text (`Hero`, `Navigation4`, `RentalProductCard`, `ProductDetails`), and low-contrast `text-neutral-400` in `HowItWorks` remain. |
| **F-26** | `CONFIRMED` | Low | Exclamation marks in UI copy/toasts (`ProductDetails`, `Orders`, `Profile`), hype copy (`frictionless`, `world-class`), and trailing periods on short step/card captions (`HowItWorks`, `WhyChoose`) remain (`Search` placeholder and Wishlist toast were already cleaned in Phase 2). |
| **F-27** | `CONFIRMED` | Medium | `Hero.tsx` still mounts 6 `<img loading="eager">` tags without `width`/`height` attributes (causing Light Mode to eagerly download hidden `_dark.webp` assets and duplicating `alt` text) alongside multi-blur studio ovals. |
| **F-28** | `CONFIRMED` | Low | `components/home/Categories.tsx` renders `grid-cols-3` on `360px–375px` mobile with `line-clamp-1`, clipping long names (`Cameras & Photography`, `Musical Instruments`), and uses `h-3.5 w-3.5` on `View All` vs `h-4 w-4` in `NewArrivals.tsx`. |
| **F-29** | `CONFIRMED` | Low | `WhyChoose.tsx` renders 10 benefit cards in `md:grid-cols-4` leaving 2 orphaned slots on row 3 (`4+4+2`) and uses decorative `<Sparkles />`. Unused `Sparkles` import also remains in `About.tsx`. |
| **F-30** | `CONFIRMED` | Low | `CustomerReviews.tsx` blocks text selection (`select-none`), uses inaccurate `scrollLeft / clientWidth` math for `88vw` mobile cards, renders non-interactive `<span>` pagination indicators, and `h-9 w-9` (`36px`) arrows with `active:scale-95`. |
| **F-31** | `CONFIRMED` | Low | `Footer.tsx` maps `"Terms of Service"` / `"Terms"` to `/privacy`, `"Cancellation & Refund Rules"` / `"Security"` to `/support`, `"Rental Agreement & Escrow"` to `/about` without distinct anchored sections, and shows a non-interactive `"paYent Web App"` button-like box. (`PrivacyPolicy.tsx` also uses `payent_support@gmail.com` vs `support@payent.com`.) |
| **F-32** | `CONFIRMED` | Medium | `ExploreRentals.tsx` and `NewArrivals.tsx` fetch the entire catalog from `GET /api/products` and slice client-side; `NewArrivals.tsx` shows an empty body beneath its header when `products.length === 0`; `backend/main.py` `/api/products` skips slicing `payernt_items` when `has_filters=False` and omits `X-Total-Count` (CORS `expose_headers`); `Input.tsx` `rounded-[20px]` clashes with `rounded-xl` buttons. |
| **F-33** | `ALREADY RESOLVED` *(Pending Runtime Check)* | Low | Phase 2 already replaced `ProductCard` with `RentalProductCard`, removed `.card-premium`, and wired `/browse` links in `pages/Wishlist.tsx`. Requires live Chromium verification on `/wishlist` & `/payent/wishlist`. |
| **F-34** | `CONFIRMED` | Low | Missing `tabular-nums` on counts/prices (`Orders.tsx`, `ExploreRentals.tsx`, `NewArrivals.tsx`, `CreatorCommunity.tsx`, `About.tsx`), mixed `font-mono` vs `font-sans` on ₹ display prices (`Filters.tsx`, `ProductDetails.tsx`, `Orders.tsx`), and Lucide stroke-width drift (`1.6`, `1.8`, `2`, `2.5`, `2.75`, `3`). |

---

## 3. Finding-by-Finding Remediation Plan (`F-23` – `F-34`)

### F-23 — Brand Spelling Consistency, Tagline Alignment, Dead `PayentLogoMark` & Unused `ProductCard`
- **Original Audit Description**: Four brand spellings (`"Payent"`, `"paYent"`, `"PAYENT"`, `"pay₹ent"`) + 3 taglines (`branding.ts:10`, `Hero.tsx:4`, `Footer.tsx:160`) + dead `PayentLogoMark` returning `null` (`LogoIcon.tsx:12`) + unused legacy `ProductCard.tsx`.
- **Current Implementation Status**: Storefront visible copy (`Hero`, `Navbar`, `Footer`, `HowItWorks`, `WhyChoose`) already uses `"paYent"` and `"Get What You Need, Without Owning It."`, **but** `config/branding.ts`, `utils/seo.ts`, `routes/__root.tsx`, `routes/{browse,categories,filters,wishlist,about,support,faq}.tsx`, `AppPreloader.tsx`, `PrivacyPolicy.tsx`, `About.tsx`, `CreatorCommunity.tsx`, `Support.tsx`, and `TermsAndConditionsModal.tsx` still mix `"Payent"`, `"PAYENT"`, `"Payernt"`. `PayentLogoMark` (`LogoIcon.tsx:12`) still returns `null` and is imported unused in `About.tsx:22`. `components/common/ProductCard.tsx` has zero importers anywhere in `frontend/src` or `frontend/tests`.
- **Reproduction Steps**:
  1. Open `/about`, `/privacy`, `/support`, `/browse` (`document.title` and meta tags) and inspect `Footer` / `Hero` / `Navbar`.
  2. Observe mixed brand strings (`PAYENT`, `Payent`, `paYent`, `pay₹ent`) and conflicting taglines (`"Gear Rental for Creators"` in `branding.ts` vs `"Get What You Need, Without Owning It."` in `Hero`/`Footer`).
- **Root Cause**: Multiple iterative passes updated Home UI strings without updating central `BRAND_CONFIG`, route metadata heads, secondary pages, or removing deprecated `PayentLogoMark` / unused `ProductCard.tsx`.
- **Affected Files**:
  - `src/config/branding.ts`
  - `src/utils/seo.ts`
  - `src/routes/__root.tsx`, `src/routes/browse.tsx`, `src/routes/categories.tsx`, `src/routes/filters.tsx`, `src/routes/wishlist.tsx`, `src/routes/about.tsx`, `src/routes/support.tsx`, `src/routes/faq.tsx`, `src/routes/select.tsx`
  - `src/components/common/LogoIcon.tsx`
  - `src/components/common/AppPreloader.tsx`
  - `src/components/common/TermsAndConditionsModal.tsx`
  - `src/components/home/CreatorCommunity.tsx`
  - `src/pages/About.tsx`, `src/pages/PrivacyPolicy.tsx`, `src/pages/Support.tsx`, `src/pages/ProductDetails.tsx` (`JsonLd` org name)
  - `src/components/common/ProductCard.tsx` (verify unused and clean/retire safely)
- **Proposed Correction**:
  - Standardize `BRAND_CONFIG` in `branding.ts`: `name: "paYent"`, `tagline: "Get What You Need, Without Owning It."`, `description: "Get What You Need, Without Owning It. Rent verified cameras, laptops, audio gear, and more."`
  - Standardize storefront visible copy, FAQ/modal references, SEO metadata (`getSeoMetadata`, `__root.tsx`, storefront routes) to canonical `"paYent"`, while intentionally preserving `"paye₹nt"` (lender) and `"pay₹ent"` (renter) gateway pathway labels inside `ProductSelection.tsx` and `/payant` / `/payent` route titles where dual-experience identity is meaningful, and preserving all localStorage/event identifiers (`payent_*`, `pay₹ent_*`).
  - Remove dead `PayentLogoMark` export from `LogoIcon.tsx` and unused import in `About.tsx`.
  - Clean or remove unused `components/common/ProductCard.tsx` after confirming zero imports across the workspace/tests (removing dead unreferenced code prevents dormant lint/audit/slop drift).
  - Update `AppPreloader.tsx` wordmark display to `"paYent"` (`LETTERS = ["p", "a", "Y", "e", "n", "t"]` so preloader glinting into `Navbar` `LogoIcon` matches `"paYent"` seamlessly!). Wait: check `AppPreloader` visual match with `LogoIcon` — matching `paYent` unifies the entrance animation directly into the Navbar logo!
- **Regression Test**: Assert in `tests/phase3-p2-fixes.test.ts` that `BRAND_CONFIG.name === "paYent"`, `BRAND_CONFIG.tagline === "Get What You Need, Without Owning It."`, `PayentLogoMark` is absent, `components/common/ProductCard.tsx` is removed/unused, and storefront route heads + secondary pages (`About`, `PrivacyPolicy`, `Support`, `CreatorCommunity`) render `"paYent"`. Verify `document.title` and rendered brand copy in Playwright.
- **Risk Level**: Low
- **Dependencies**: None (`p0-fixes` and `phase2` do not assert old `"Payent"`/`"PAYENT"` strings in SEO metadata).
- **Initial Classification**: `CONFIRMED`

---

### F-24 — `[Unslop Motion]` `transition-all`, Hover Scale/Lift, Non-Interactive `.card-premium` & Focus/Fallback Polish
- **Original Audit Description**: `[Unslop Motion] transition-all & Hover Scale/Lift` — `Hero.tsx`, `RentalProductCard.tsx`, `Categories.tsx`, `Navbar.tsx`, `Filters.tsx`, `ProductCard.tsx`, plus accessibility table focus-ring parity and neutral fallback placeholders.
- **Current Implementation Status**: `Hero`, `Navbar`, `RentalProductCard`, and `Filters` cards were already cleaned in Phase 2. Remaining instances:
  - `components/home/Categories.tsx:139, 149, 151, 196`: `transition-all`, `scale-102`, `active:scale-95`
  - `ExploreRentals.tsx:126, 142`: `transition-all`, `active:scale-95`
  - `CustomerReviews.tsx:83, 91, 174`: `active:scale-95`, `transition-all`
  - `CreatorCommunity.tsx:43`: `hover:scale-102 active:scale-98 transition-all`
  - `Orders.tsx`: ~14 `transition-all` buttons/cards (`345, 960, 982, 1007, 1040, 1074, 1262, 1761, 1840, 1857, 1869, 2048, 2055, 2098, 2286, 2298, 2310`)
  - `ProductDetails.tsx:1603`: `group-hover:scale-[1.02]` on hero product photo
  - `About.tsx:185, 221, 408, 611, 633`: `group-hover:scale-105`, `transition-all`
  - `Input.tsx:37`: `transition-all`
  - `ProductSelection.tsx`: `transition-all`, `active:scale-`, `translate-y` on cards/buttons (`50, 398, 501, 636, 670, 734, 742, 782`)
  - Missing image fallbacks in `RentalProductCard.tsx:31, 88`, `Filters.tsx:1242, 1263`, and `SearchOverlay.tsx:425` still reference non-existent `/placeholder-gear.webp` / `/placeholder.png` (`404`) and Unsplash DSLR image fallback.
  - Non-interactive `.card-premium` check: check static usage in security tabs (`Notifications.tsx` etc.) vs clickable items, and ensure unified `focus-visible:ring-2` across secondary buttons/links (`ExploreRentals` pagination/Filters/Reset, `NewArrivals` pagination/Retry, `Footer` links, `Categories` browse link).
- **Reproduction Steps**: Inspect computed styles/classes on Home Categories chips, `ExploreRentals` Filters/Select, `ProductDetails` main gallery image, and `Orders` cards; trigger an image load error or missing image on `RentalProductCard` / `/filters`.
- **Root Cause**: Utility classes copied during rapid feature authoring prior to Unslop motion & placeholder rules.
- **Affected Files**: `components/home/Categories.tsx`, `ExploreRentals.tsx`, `CustomerReviews.tsx`, `CreatorCommunity.tsx`, `components/common/Input.tsx`, `components/common/RentalProductCard.tsx`, `components/home/SearchOverlay.tsx`, `components/selection/ProductSelection.tsx`, `pages/Orders.tsx`, `pages/ProductDetails.tsx`, `pages/Filters.tsx`, `pages/About.tsx`, `pages/Support.tsx`.
- **Proposed Correction**:
  - Replace all `transition-all` with explicit property transitions (`transition-colors`, `transition-[width,background-color]`, `transition-[opacity,transform]`).
  - Remove hover/active scale and translate micro-bounces (`scale-102`, `active:scale-95`, `active:scale-98`, `hover:scale-102`, `group-hover:scale-[1.02]`, `group-hover:scale-105`, `hover:-translate-y-1` in `Support.tsx:770`). Note: keep `Hero` CTA arrow slide (`group-hover:translate-x-1 transition-transform motion-reduce:transform-none`) if unobtrusive directional affordance, and strictly preserve `Navigation4` `isDesktop ? 46 : 48` + `min-w-[46px] min-h-[46px]` asserted by Phase 2 tests.
  - Replace broken `/placeholder-gear.webp`, `/placeholder.png`, and DSLR Unsplash fallback URLs in `RentalProductCard.tsx`, `Filters.tsx`, and `SearchOverlay.tsx` with clean stateful monochrome `<Package />` fallback containers (`zero` 404 requests on missing media).
  - Add consistent `focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white` on buttons, pagination controls, selects, and chips across touched Home & secondary components.
- **Regression Test**: Static/AST checks in `tests/phase3-p2-fixes.test.ts` ensuring zero `transition-all`, zero `scale-102`/`scale-105`/`scale-[1.02]`/`active:scale-` in targeted Home/secondary files, zero `/placeholder-gear.webp`/`/placeholder.png` 404 fallbacks in `RentalProductCard`/`Filters`, and runtime Playwright check confirming zero failed image network requests for missing photos + clean focus-visible outlines on `Tab`.
- **Risk Level**: Low
- **Dependencies**: Careful with `Orders.tsx`, `Filters.tsx`, and `Navigation4.tsx` to preserve every Phase 1/2 DOM ID, aria attribute, and test assertion.
- **Initial Classification**: `CONFIRMED`

---

### F-25 — `[Unslop Type]` Heavy Weights (`700–900`), Uppercase Wide Tracking, Negative Small-Text Tracking & Italics
- **Original Audit Description**: `[Unslop Type]` Heavy weights (`700–900`), uppercase wide tracking (`HowItWorks`, `Footer`, `Categories`, `LogoIcon`, `Profile`), italics (`ProductDetails`, `Orders`), negative tight tracking on `< 16px` (`Hero`, `Filters`, `RentalProductCard`, `Navigation4`, `ProductDetails`), plus contrast failure on `HowItWorks` `STEP 01`.
- **Current Implementation Status**: Phase 2 already fixed `Footer` group headings, `Hero` `sm:tracking-tight`, and `ProductDetails:2405` italics. Still present:
  - Heavy `font-black` / `font-extrabold`: `LogoIcon.tsx:24, 34` (`font-black`), `AppPreloader.tsx:213, 291, 356` (`font-black`), `HowItWorks.tsx:51, 77` (`font-bold` on 10px), `CreatorCommunity.tsx:29, 66, 76, 86, 96` (`font-extrabold`), `PrivacyPolicy.tsx:12, 16` (`font-black`, `uppercase tracking-wider`), `About.tsx` (`font-black` headings/stats + `uppercase tracking-widest`), `Orders.tsx:2404, 2492` (`font-extrabold`), `Profile.tsx:491, 564, 652, 664, 685, 706, 1131, 1211, 1354, 1384, 1403` (`font-extrabold`/`font-black`), `ProductDetails.tsx:1420, 1452, 1522, 2012, 2165, 2295, 2340` (`font-extrabold`/`font-black`), `Support.tsx` (`font-black` `750, 857, 1411, 1616`), `ProductSelection.tsx` (`font-extrabold`).
  - Uppercase + wide tracking: `LogoIcon.tsx:38` (`text-[7.5px] tracking-[0.2em] uppercase`), `HowItWorks.tsx:8, 14, 20, 51, 52, 78` (`DISCOVER`, `BOOK`, `ENJOY & RETURN`, `STEP 01` + `tracking-widest`), `components/home/Categories.tsx:177` (`text-xs uppercase tracking-wider font-bold` on `"Explore in ..."`), `Orders.tsx:337, 1434, 1571, 2164, 2479` (`uppercase tracking-wider`), `Profile.tsx:1024, 1169, 1261, 1328, 1345`, `PrivacyPolicy.tsx:12`, `About.tsx` section eyebrows (`uppercase tracking-widest`), `CreatorCommunity.tsx:95`, `ProductDetails.tsx:2716` (`VIDEO`).
  - Negative `tracking-tight` on small text (`< 16px`): `Hero.tsx:113` on `sm:`/`md:` (`sm:text-sm` `14px` still gets `sm:tracking-tight`! Move `tracking-tight` or drop `sm:tracking-tight` below `lg:` where text reaches `>= 17px`), `Hero.tsx:129` (`text-xs md:text-sm tracking-tight` on CTA button!), `RentalProductCard.tsx:131` (`text-sm tracking-tight`), `Navigation4.tsx:112` (`text-[10px] tracking-tight`), `ProductDetails.tsx:1740, 2153, 2716`, `Orders.tsx:1500, 1733, 1777`, `Profile.tsx:798, 875, 979, 1071`, `Input.tsx:48`, `Support.tsx:1150, 1393`.
  - Italics: `Orders.tsx:1474, 1688, 1712, 2173` (`italic`).
  - Contrast & micro-text `< 11px`: `HowItWorks.tsx:51, 77` (`text-[10px] text-neutral-400 dark:text-neutral-500` -> fails WCAG AA contrast in both Light and Dark!), `components/home/Categories.tsx:164` (`text-[10px] text-neutral-500` -> `text-xs text-neutral-600 dark:text-neutral-400`), `ProductDetails.tsx:2716` (`text-[10px]` -> `text-xs`), `Footer.tsx:72` (`text-[10px]` -> `text-xs`).
- **Reproduction Steps**: Inspect computed font weights, `text-transform`, `letter-spacing`, `font-style: italic`, and foreground/background contrast ratios on `HowItWorks`, `Categories`, `Orders`, `Profile`, `ProductDetails`, `About`, `PrivacyPolicy`, `Hero`.
- **Root Cause**: Display weights (`800–900`) and all-caps tracking were over-applied outside the Hero focal headline, along with negative `tracking-tight` on `12px–14px` UI copy and `italic` helper notes.
- **Affected Files**: `Hero.tsx`, `HowItWorks.tsx`, `Categories.tsx`, `CreatorCommunity.tsx`, `LogoIcon.tsx`, `AppPreloader.tsx`, `RentalProductCard.tsx`, `Navigation4.tsx`, `Input.tsx`, `Orders.tsx`, `Profile.tsx`, `ProductDetails.tsx`, `About.tsx`, `PrivacyPolicy.tsx`, `Support.tsx`, `ProductSelection.tsx`.
- **Proposed Correction**:
  - Preserve **Hero** headline weights (`"Rent Anything"` `font-medium`, `"You Need"` `font-bold`) per approved brand rule; replace `font-black`/`font-extrabold` elsewhere (`<= 600` `font-semibold` for section/page titles, `font-medium` for body/metrics, `font-semibold` for CTAs/prices — keeping `font-bold` only on key Hero emphasis per spec).
  - Convert uppercase wide-tracked UI labels/headings to clean sentence/title case (`HowItWorks`: `Discover`, `Book`, `Enjoy and return`, `Step 01`; `Categories`: `"Explore in {activeCategory.name}"`; `Orders`: `"Handover & Delivery"`, `"Cancellation note"`, etc.; `About` eyebrows & `PrivacyPolicy` badge).
  - Remove `tracking-tight` on `< 16px` text (`text-[10px]`, `text-xs`, `text-sm`, and `Hero.tsx` `tracking-tight` only at `lg:`/`17px+` or removed on CTA/caption <16px); remove `italic` on `Orders.tsx:1474, 1688, 1712, 2173`; upgrade `HowItWorks.tsx:51, 77` contrast from `text-neutral-400 dark:text-neutral-500` to `text-xs text-neutral-600 dark:text-neutral-400`.
- **Regression Test**: Assert in `tests/phase3-p2-fixes.test.ts` that `HowItWorks`, `Categories`, `LogoIcon`, `PrivacyPolicy`, `About`, `Orders`, `Profile`, and `ProductDetails` avoid `font-black`, `font-extrabold`, uppercase step titles (`DISCOVER`, `STEP 01` uppercase class), `italic`, and sub-11px low-contrast captions; verify computed typography & WCAG contrast ratios (`>= 4.5:1`) in Playwright.
- **Risk Level**: Low
- **Dependencies**: Preserve exact Hero text strings (`"Rent Anything"`, `"You Need"`, `"Get What You Need, Without Owning It."`) and Phase 2 test regexes (`Orders.tsx`, `Profile.tsx`, `ProductDetails.tsx`, `Navigation4.tsx`, `Hero.tsx`).
- **Initial Classification**: `CONFIRMED`

---

### F-26 — `[Unslop Copy]` Exclamation Marks, Wordy Placeholders, Hype Words & Trailing Periods
- **Original Audit Description**: `[Unslop Copy] Exclamation Marks, Wordy Placeholders, Hype Words & Trailing Periods` — `ProductDetails:2838`, `ProductCard:230`, `Navbar:104`, `SearchOverlay:202`, `Categories:565`, `HowItWorks:34`, `WhyChoose:64`.
- **Current Implementation Status**: Search placeholders (`"Search rentals"`) and Wishlist toast (`"Added to Wishlist"`) were cleaned in Phase 2. Still active:
  - Exclamation marks: `ProductDetails.tsx:2760` (`"Terms & conditions accepted!"`), `Orders.tsx:599` (`"Booking location updated successfully!"`), `Orders.tsx:1191` (`"Explore the marketplace to find gear!"`), `Orders.tsx:1296` (`` `Order #${o.id} copied to clipboard!` ``), `Profile.tsx:423` (`"Profile photo updated successfully!"`).
  - Hype copy: `HowItWorks.tsx:34` (`"A frictionless three-step process..."`), `WhyChoose.tsx:64` (`"Produce world-class work..."`), `About.tsx:333` (`"world-class storytelling technology"`).
  - Trailing periods on short step/card captions: `HowItWorks.tsx:9, 15, 21` and `WhyChoose.tsx:19, 24, 29, 34, 39, 44, 49, 54, 59, 64`.
  - *(Preserve canonical Hero caption `"Get What You Need, Without Owning It."` and Footer tagline `"Get What You Need, Without Owning It."` WITH its intentional period per Brand Rule.)*
- **Reproduction Steps**: Inspect visible UI copy in `HowItWorks`, `WhyChoose`, `About`, `Orders` empty state, and toast feedback on accepting T&C / copying order ID / updating photo or location.
- **Root Cause**: Uncleaned legacy marketing copy and conversational exclamation marks in toast/helper strings.
- **Affected Files**: `HowItWorks.tsx`, `WhyChoose.tsx`, `About.tsx`, `ProductDetails.tsx`, `Orders.tsx`, `Profile.tsx`.
- **Proposed Correction**:
  - `HowItWorks.tsx`: Replace `"A frictionless three-step process built on escrow security and doorstep delivery"` -> `"Three verified steps with escrow protection and doorstep delivery"`, and strip trailing periods from all 3 short step captions.
  - `WhyChoose.tsx`: Remove `"world-class"` and strip trailing periods from all 8 curated benefit card captions.
  - `About.tsx`: Replace `"world-class storytelling technology"` -> `"professional storytelling technology"`.
  - Remove exclamation marks in `ProductDetails.tsx:2760` (`"Terms and conditions accepted"`), `Orders.tsx:599` (`"Booking location updated"`), `Orders.tsx:1191` (`"Explore the marketplace to find gear"`), `Orders.tsx:1296` (`` `Order #${o.id} copied to clipboard` ``), `Profile.tsx:423` (`"Profile photo updated"`).
- **Regression Test**: Assert clean strings in `tests/phase3-p2-fixes.test.ts` (no `frictionless`, no `world-class`, no `!` in targeted UI/toast strings, Hero caption period preserved) + verify rendered text in Playwright.
- **Risk Level**: Low
- **Dependencies**: None
- **Initial Classification**: `CONFIRMED`

---

### F-27 — Hero Dual `<img>` Eager Loading, Missing Intrinsics, Duplicate `alt` & Layered Blur Blobs
- **Original Audit Description**: `Hero.tsx:60-83, 144-216` renders both Light and Dark `loading="eager"` `<img>` tags without `width`/`height` (and duplicate `alt` attributes per accessibility audit line 426), plus multi-layer blur shadow blobs (`68-82, 147-202`).
- **Current Implementation Status**: `Hero.tsx:151-215` currently mounts 6 `<img loading="eager">` elements (`3` visible, `3` `hidden`), zero `width`/`height` attributes, duplicate `alt` text on light/dark pairs, and 5 stacked `blur-*` shadow ovals behind/below items. Because both sets are `loading="eager"`, Light mode eagerly downloads `_dark.webp` assets off-screen.
- **Reproduction Steps**: Load `/payent` in Light Mode with Network panel open -> 6 `/hero_*.webp` images are requested on initial load; inspect `document.querySelectorAll('section[aria-label="paYent Rentals Hero"] img')` -> 6 nodes lacking `width`/`height` attributes.
- **Root Cause**: CSS `dark:hidden` / `hidden dark:block` paired with duplicate `loading="eager"` tags without intrinsics, originally added because `useTheme` toggles the `.dark` class on `<html>` imperatively without shared React context.
- **Affected Files**: `frontend/src/components/home/Hero.tsx` (pixel assets in `public/hero_*.webp` already sized `944×680`, `746×819`, `781×782` cleanly).
- **Proposed Correction**:
  - Render **one single `<img>` per product showcase item** (`3` `<img>` nodes total, zero duplicate hidden `<img>` nodes or duplicate `alt` attributes!).
  - Maintain SSR/CSR hydration parity (`Obs B`): initialize `const [isDarkTheme, setIsDarkTheme] = useState(false)` so initial SSR and first client render both emit the Light studio asset (`/hero_laptop.webp`, `/hero_headphones.webp`, `/hero_camera.webp`) with exact natural `width` & `height` (`944×680`, `746×819`, `781×782`), `loading="eager"`, `fetchPriority="high"`, and `decoding="async"`.
  - In `useEffect`, sync `setIsDarkTheme(document.documentElement.classList.contains("dark"))` immediately on mount AND attach a `MutationObserver` watching `document.documentElement`'s `class` attribute so clicking any theme toggle (`Navbar`, `Filters`, system change) updates the Hero showcase image source between Light and Dark seamlessly.
  - Simplify redundant multi-layer `blur-md`/`blur-lg`/`blur-xl` shadow blobs (`147-202` and background gradients `60-83`) into subtle, single-layer grounded studio contact shadows + clean `drop-shadow` on each `<img>` while preserving the crisp light/dark studio look.
- **Regression Test**: Assert in `tests/phase3-p2-fixes.test.ts` that Hero static markup emits exactly 3 `<img>` elements with `width` and `height` (`944`/`680`, `746`/`819`, `781`/`782`), preserves all Phase 2 Hero assertions, and verify in Playwright Chromium (Light & Dark + toggle + cold SSR reload) that: (a) Light Mode fetches only the 3 Light `.webp` URLs (`0` `_dark.webp` requests on initial Light load), (b) toggling Dark swaps to `/hero_*_dark.webp` with `complete === true && naturalWidth > 0`, (c) zero hydration warnings and zero text/product overlap across Desktop (`1280×800`) and Mobile (`375×812`).
- **Risk Level**: Medium (must avoid hydration mismatch and ensure Dark toggle updates Hero reliably)
- **Dependencies**: Preserves `useTheme.ts` `.dark` class contract and all Phase 2 `Hero.tsx` assertions.
- **Initial Classification**: `CONFIRMED`

---

### F-28 — Home Categories Mobile Truncation & Inconsistent Icon Sizing
- **Original Audit Description**: `Categories.tsx:122, 127, 155, 186` vs `NewArrivals:67`; `grid-cols-3` at `360px` clips long names (`"Cameras & Photography"`, `"Musical Instruments"`).
- **Current Implementation Status**: `components/home/Categories.tsx:127` still uses `grid-cols-3 sm:grid-cols-6 gap-2.5` + `line-clamp-1` (`159`), truncating `"Cameras & Photography"` and `"Musical Instruments"` at `360px–375px` mobile. Header `"View All"` arrow (`122`) is `h-3.5 w-3.5 stroke-[2]` vs `NewArrivals.tsx:67` `h-4 w-4 stroke-[2]`; category icons use `h-4.5 w-4.5 stroke-[1.8]` (`155`), and subcategory `"Browse"` link uses `ChevronRight h-3.5 w-3.5` (`186`).
- **Reproduction Steps**: Load `/payent` at `375×812` mobile and check `scrollWidth > clientWidth` on category labels (`"Cameras & Photography"`, `"Tools & Equipment"`, `"Musical Instruments"`).
- **Root Cause**: 3 narrow columns on `< 640px` combined with `line-clamp-1` clip multi-word category labels; `Categories.tsx` and `NewArrivals.tsx` drifted on icon size/stroke specs.
- **Affected Files**: `frontend/src/components/home/Categories.tsx`, `frontend/src/components/home/NewArrivals.tsx`.
- **Proposed Correction**:
  - Change the mobile Categories grid from `grid-cols-3 sm:grid-cols-6` to `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4` and remove `line-clamp-1` on the category label (`text-xs sm:text-sm font-semibold ... leading-snug`), giving every category label full readable room on `360px–375px` mobile without truncation (`min-h-[44px]` preserved).
  - Match `"View All"` icon sizing & stroke across `Categories.tsx` and `NewArrivals.tsx` (`ArrowRight className="h-4 w-4 stroke-[1.75]"`), standardize category frame icons (`h-5 w-5 stroke-[1.75]`), and align subcategory `"Browse"` icon cleanly.
- **Regression Test**: Assert in `tests/phase3-p2-fixes.test.ts` that `Categories.tsx` uses `grid-cols-2`, does not truncate names with `line-clamp-1`, and aligns `"View All"` arrow size (`h-4 w-4`) with `NewArrivals.tsx`; verify at `375×812` in Playwright that none of the 6 category labels clip (`scrollWidth <= clientWidth` / full text visible).
- **Risk Level**: Low
- **Dependencies**: Preserve `?cat=` / `normalizeCategoryParam` (`F-02`).
- **Initial Classification**: `CONFIRMED`

---

### F-29 — `WhyChoose` 10-Card Orphaned 4-Col Grid & Decorative `Sparkles` Icon
- **Original Audit Description**: `WhyChoose.tsx:45, 82` renders 10 uniform cards in `md:grid-cols-4` leaving **2 orphaned slots on row 3 (`4+4+2`)** and uses decorative `<Sparkles />`. (`About.tsx:17` also imports unused `Sparkles`.)
- **Current Implementation Status**: `WhyChoose.tsx` still renders 10 benefits in `grid-cols-2 md:grid-cols-4` with `<Sparkles />` at line `45`, `"world-class work"` at line `64`, and trailing periods on all 10 descriptions.
- **Reproduction Steps**: View `"Why Choose paYent"` at `1024px`–`1440px` desktop -> row 1 has 4 cards, row 2 has 4 cards, row 3 has 2 cards with 2 empty grid columns.
- **Root Cause**: Uncurated 10-item benefit array inside a 4-column grid.
- **Affected Files**: `frontend/src/components/home/WhyChoose.tsx`, `frontend/src/pages/About.tsx`.
- **Proposed Correction**:
  - Curate and consolidate `WhyChoose` benefits cleanly to **8 unique, high-value benefits** (`4×2` symmetric rows on `md+` desktop/tablet, `2×4` symmetric rows on mobile, zero orphaned slots!).
  - Replace `<Sparkles />` with `<CalendarCheck />` (`stroke-[1.75]`), remove `"world-class"`, and remove trailing periods from short single-sentence card descriptions.
  - Remove unused `Sparkles` import from `About.tsx:17` (and verify no `Sparkles` remains in active storefront Home/Secondary UI).
- **Regression Test**: Assert in `tests/phase3-p2-fixes.test.ts` that `WhyChoose` renders 8 benefit cards (`benefits.length === 8`), `md:grid-cols-4` has no remainder, and `Sparkles` is absent from `WhyChoose.tsx` & `About.tsx`; verify row alignment in Playwright at `1280×800` and `375×812`.
- **Risk Level**: Low
- **Dependencies**: None
- **Initial Classification**: `CONFIRMED`

---

### F-30 — `CustomerReviews`: `select-none`, Non-Clickable Dots, `88vw` Index Drift & Arrow Targets
- **Original Audit Description**: `CustomerReviews.tsx:83, 128, 169-181`: `select-none` blocks text selection, `Math.round(scrollLeft / clientWidth)` drifts with `88vw` cards, mobile dots are non-interactive `<span>`s, desktop arrows are `h-9 w-9` (`< 44px`).
- **Current Implementation Status**: Verified 100% still unfixed at `CustomerReviews.tsx:45-57, 83-94, 105, 128, 169-181`.
- **Reproduction Steps**: Load `/payent` on `375×812` with reviews populated: try selecting quote text (blocked by `select-none`), tap any mobile dot indicator (`<span>`, no click action), swipe across cards and compare active dot index vs centered card.
- **Root Cause**: Quick carousel implementation used `clientWidth` instead of actual card+gap step width, omitted interactive `<button>` dots, and reused `select-none` on quote cards.
- **Affected Files**: `frontend/src/components/home/CustomerReviews.tsx`.
- **Proposed Correction**:
  - Remove `select-none` from review card containers (`128`) so users can select quote text cleanly.
  - Compute card step width dynamically from the container's first child (`firstChild.offsetWidth + gapPx`), clamping `activeIndex` accurately across mobile (`88vw`) and desktop (`3-up`) snaps, and scrolling by exact step offsets in `handleScroll`.
  - Render mobile pagination dots as genuine interactive `<button type="button">` elements (sized with comfortable `44px` invisible/outer tap hitboxes via `h-11 min-w-[28px] px-1.5 flex items-center justify-center` or `min-w-[44px]` wrapping compact visible `h-1.5` pill bars) with `aria-label={\`Go to review ${i + 1}\`}` and `aria-current={i === activeIndex ? "true" : undefined}`, plus explicit `onClick` scroll-to-index handler.
  - Enlarge desktop prev/next arrows to `h-11 w-11` (`44×44px`), remove `active:scale-95`, replace `transition-all` (`174`) with `transition-[width,background-color]`, align star/arrow stroke widths (`1.75`), and add compact accessible prev/next controls usable cleanly.
- **Regression Test**: Assert in `tests/phase3-p2-fixes.test.ts` that `CustomerReviews` has no `select-none` on review cards, renders `<button` dot controls with `aria-label`, uses `h-11 w-11` carousel arrows, and zero `transition-all` / `active:scale-95`; verify dot click & swipe index parity + text selectability in Playwright.
- **Risk Level**: Low
- **Dependencies**: None
- **Initial Classification**: `CONFIRMED`

---

### F-31 — Footer Legal Links, Dead App Box & Contact Email Consistency
- **Original Audit Description**: `Footer.tsx:57-74, 114, 259-261` — `"Terms of Service"` & `"Terms"` point to `/privacy`, `"Cancellation & Refund Rules"` & `"Security"` point to `/support`, `"Rental Agreement & Escrow"` points to `/about`; `"paYent Web App"` looks like an interactive button but is a dead `<div>`; social buttons `32px`.
- **Current Implementation Status**: Phase 2 enlarged social icons to `h-11 w-11 sm:h-9 sm:w-9` (`114-144`) and fixed Footer tagline/headings/accordion chevron order (`F-04`). Remaining unresolved items:
  - Legal links (`Footer.tsx:56-60, 260-262`) still share duplicate routes (`/privacy` for both Privacy Policy and Terms; `/support` for both Cancellation/Refund Rules and Security; `/about` for Rental Agreement & Escrow) with no anchored sections distinguishing them.
  - Dead `"paYent Web App"` button-styled tile (`Footer.tsx:68-74`) remains an interactive-looking bordered card with zero click/install behavior.
  - `PrivacyPolicy.tsx:122` uses `payent_support@gmail.com` instead of `support@payent.com` (`Footer.tsx:85`).
- **Reproduction Steps**: Click `"Terms of Service"`, `"Cancellation & Refund Rules"`, `"Rental Agreement & Escrow"`, `"Terms"`, and `"Security"` in `Footer.tsx`, and inspect the `"paYent Web App"` box under `"Download Our App"`.
- **Root Cause**: Dedicated Terms/Escrow/Cancellation anchors were never created when footer links were wired, and an informational PWA note was styled as a button card.
- **Affected Files**: `frontend/src/components/layout/Footer.tsx`, `frontend/src/pages/PrivacyPolicy.tsx`, `frontend/src/pages/Support.tsx`, `frontend/src/pages/About.tsx`.
- **Proposed Correction**:
  - Add distinct semantic anchored sections cleanly on the target pages so every legal footer link lands on exact matching legal/security copy:
    - `PrivacyPolicy.tsx`: Add explicit `#privacy-policy` section anchor and a genuine `#terms-of-service` section (`Terms of Service` covering eligibility, booking obligations, acceptable use, liability, and governing rules), convert blue `text-primary`/`bg-primary/10` + `font-black` accents to crisp paYent monochrome, and unify contact email to `support@payent.com`.
    - `Support.tsx`: Add explicit `#cancellation-refunds` and `#security-protocol` anchors (showing concise Cancellation & Refund Rules + Escrow & Handover Security summary / deep-linked FAQ anchor smoothly scrolled into view via `hash` effect on `/support`).
    - `About.tsx`: Add `#rental-agreement-escrow` anchor on the Trust & Escrow section (`Platform Security & Rental Agreement`).
  - Wire `Footer.tsx` legal links with distinct `to` + `hash` (`"/privacy#terms-of-service"`, `"/support#cancellation-refunds"`, `"/support#security-protocol"`, `"/about#rental-agreement-escrow"`) so every link has a unique destination URL and scrolls directly to its section.
  - Replace the fake button-like `"paYent Web App"` bordered `<div>` in `Footer.tsx:68-74` with a real interactive PWA install/instructions experience: listen for browser `beforeinstallprompt` cleanly so if installable it exposes a genuine `<button>` `"Install paYent Web App"`, and otherwise renders plain typography + browser install guidance (`Chrome` / `Safari` Add to Home Screen) without looking like a dead clickable tile!
- **Regression Test**: Assert in `tests/phase3-p2-fixes.test.ts` that `Footer.tsx` legal links use distinct `to` + `hash` targets (no identical `{to: "/privacy"}` duplicate without hash), no fake static bordered `"paYent Web App"` div box remains, and verify in Playwright that clicking Footer legal links navigates to valid routes/hash sections cleanly.
- **Risk Level**: Low
- **Dependencies**: Preserve TanStack Router static type-safety (`to` + `hash` in `<Link>`).
- **Initial Classification**: `CONFIRMED`

---

### F-32 — Home Grid Server Pagination, Control-Radius Consistency & `NewArrivals` Empty State
- **Original Audit Description**: `ExploreRentals.tsx:52-90, 126` & `NewArrivals.tsx:20-28, 97-134` fetch the entire catalog and slice client-side; `ExploreRentals` / `NewArrivals` / `Input.tsx` mix control radii; `NewArrivals` renders no empty state when `products.length === 0`.
- **Current Implementation Status**: Verified unfixed:
  - `ExploreRentals.tsx:52-90`: calls `api.getFilteredProducts({ sort })` without `page`/`limit`, stores full array, slices `.slice(startIndex, startIndex + 8)`.
  - `NewArrivals.tsx:20-45, 97-134`: calls `api.getFilteredProducts({ sort: "newest" })` without `page`/`limit`, slices client-side, and renders blank body when `!isLoading && !error && visibleProducts.length === 0`.
  - `backend/main.py:5768-5772, 5963-5975`: `/api/products` accepts `limit` & `page`, but: (a) does NOT slice `payernt_items` when `has_filters` is `False`, (b) does not return total count (`X-Total-Count` header + CORS `expose_headers`), and (c) applies `limit` BEFORE filtering `caller_email` (`5971`).
  - `Input.tsx:37` uses `rounded-[20px]` pill-ish input shape alongside `rounded-xl` filter/reset/pagination controls (`UNSLOP_AUDIT_REPORT.md` F-32 + tokens 10-12px control alignment).
- **Reproduction Steps**: Inspect Network request from Home `/` / `/payent` (`GET /api/products` sends no `page`/`limit` query params); intercept `/api/products?sort=newest*` returning `[]` and observe `NewArrivals` section has a heading and empty whitespace; inspect `Input.tsx` radius (`rounded-[20px]`).
- **Root Cause**: Home grids were added before server pagination headers/`total` count support was completed on `/api/products`, and `NewArrivals` omitted an empty branch while `Input.tsx` retained an ad-hoc `20px` radius.
- **Affected Files**:
  - `backend/main.py` (`CORSMiddleware` `expose_headers`, `fetch_public_listings` paginated path & `X-Total-Count` header)
  - `backend/tests/test_search_stats_phase2.py` or `backend/tests/test_products_pagination.py` (new backend pytest for `/api/products` pagination + `X-Total-Count`)
  - `frontend/src/utils/api.ts` (`getFilteredProducts` optional `limit`/`page`, new `getFilteredProductsPage` returning `{ items, total, page, limit }`)
  - `frontend/src/components/home/ExploreRentals.tsx`
  - `frontend/src/components/home/NewArrivals.tsx`
  - `frontend/src/components/common/Input.tsx`
- **Proposed Correction**:
  - **Backend (`backend/main.py`)**:
    - Expose `"X-Total-Count"` in `CORSMiddleware` `expose_headers=["X-Request-ID", "X-Total-Count"]`.
    - In `/api/products` (`fetch_public_listings`), load approved listings (merging `payernt_items` consistently even when `limit` is provided), apply search/category/price/location/condition/date filters and sort cleanly BEFORE slicing `[offset : offset + limit]`, exclude caller's own items, compute exact `total_count` BEFORE pagination slice, set `response.headers["X-Total-Count"] = str(total_count)`, and slice `[offset : offset + limit]` when `limit is not None and limit > 0`! Preserves 100% JSON array body schema for every existing caller.
  - **Frontend (`utils/api.ts`, `ExploreRentals.tsx`, `NewArrivals.tsx`)**:
    - Add `limit?: number` & `page?: number` support to `api.getFilteredProducts` and add `api.getFilteredProductsPage` returning `{ items: Product[]; total: number; page: number; limit: number }` using `X-Total-Count` (with safe graceful fallback if an upstream proxy/mock omits `X-Total-Count`).
    - Update `ExploreRentals.tsx` and `NewArrivals.tsx` to request bounded pages (`{ page: currentPage, limit: ITEMS_PER_PAGE, sort }`), clamp `currentPage` cleanly if `totalPages` shrinks on sort/reload, and render an explicit calm monochrome empty state in `NewArrivals.tsx` (`"No new arrivals right now"` + `"Browse Catalog"` link to `/browse`) when `totalCount === 0` after load.
  - **Radii (`Input.tsx`)**: Align `Input.tsx:37` container radius from `rounded-[20px]` to `rounded-xl` (`12px`) to match `ExploreRentals`, `NewArrivals`, and `Filters` form/button controls consistently.
- **Regression Test**: Add backend pytest validating `GET /api/products?limit=2&page=1` vs `page=2`, sorting, `has_filters=False` merging, and `X-Total-Count` header; add frontend test validating `ExploreRentals` / `NewArrivals` paginated queries + `NewArrivals` empty state rendering; verify live paginated network requests (`?page=1&limit=8`, `?page=2&limit=8`) and reload state persistence in Playwright.
- **Risk Level**: Medium (touches backend `/api/products` — must keep full backward compatibility when `limit` is omitted and avoid breaking SSR/filters/search callers)
- **Dependencies**: Test thoroughly with `pytest` and existing `Categories`/`Filters`/`SearchOverlay` flows.
- **Initial Classification**: `CONFIRMED`

---

### F-33 — Wishlist `.card-premium`, Route Alignment & Public Catalog Resolution
- **Original Audit Description**: `Wishlist.tsx:36, 46, 50` wraps non-interactive empty state in `.card-premium`, uses `ProductCard` instead of `RentalProductCard`, and links Back/CTA to `/categories`.
- **Current Implementation Status**: Code inspection (`Wishlist.tsx:1-96`, `routes/payent/wishlist.tsx`) confirms Phase 2 ALREADY replaced `ProductCard` with `<RentalProductCard />`, removed `.card-premium` (`className="mt-10 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#141414] p-10 sm:p-16 text-center"`), and changed `BackButton fallback="/browse"` + `Browse marketplace` CTA `navigate({ to: "/browse" })`.
- **Reproduction Steps**: Verify at runtime in Playwright on `/wishlist` and `/payent/wishlist` in both empty and populated states (including hover behavior, card links to `/product/$id`, empty state no hover lift, BackButton fallback, and CTA navigation).
- **Root Cause**: Previously resolved in Phase 2 (`F-15` / `F-01`), requires runtime confirmation in Phase 3C before final classification lock.
- **Affected Files**: `frontend/src/pages/Wishlist.tsx` (verify clean, no edits expected unless runtime reveals any cached lookup gap or `.card-premium` elsewhere — note `LenderPortal.tsx`, `Notifications.tsx`, `Settings.tsx`, etc. use `.card-premium` outside storefront Wishlist; check `MyDevicesTab`/`Notifications`/`Settings` static vs interactive containers!). Wait: let's inspect `.card-premium` in static cards cleanly during quality review of `F-24`/`F-33` if any non-clickable card in touched scope has it.
- **Proposed Correction**: No rewrite needed on `Wishlist.tsx` if empirical browser verification confirms zero `.card-premium` lift, `/browse` navigation, and `<RentalProductCard />` parity on both `/wishlist` and `/payent/wishlist`.
- **Regression Test**: Add assertion in `tests/phase3-p2-fixes.test.ts` + live Playwright runtime check across `/wishlist` and `/payent/wishlist`.
- **Risk Level**: Low
- **Dependencies**: `F-01`, `F-15`
- **Initial Classification**: `ALREADY RESOLVED` *(Pending Live Runtime Verification)*

---

### F-34 — Missing `tabular-nums`, Price Font Consistency & Lucide Icon Stroke Standardization
- **Original Audit Description**: `RentalProductCard`, `ProductCard`, `Filters`, `Orders`, `Hero`, `Categories`, `Navbar` — missing `tabular-nums` on numbers/counters, inconsistent `font-mono` vs `font-sans` on ₹ display prices, and Lucide stroke widths drifting across `1.5`, `1.6`, `1.8`, `2`, `2.5`, `2.75`, `3`.
- **Current Implementation Status**:
  - `RentalProductCard.tsx:131` uses sans `tabular-nums`, whereas `Filters.tsx:1285`, `ProductDetails.tsx:2012, 2165`, `Orders.tsx:1405, 1583, 2492`, and `About.tsx:273, 574` use `font-mono` for ₹ prices and display counts; `Orders.tsx:972, 997, 1022, 1052, 1405, 1583, 2492`, `ExploreRentals.tsx:230-231`, `NewArrivals.tsx:118-119`, `CreatorCommunity.tsx:66, 76, 86`, and `About.tsx:273, 574` lack `tabular-nums`.
  - Lucide icon stroke widths drift across touched files: `stroke-[1.6]` (`RentalProductCard:124`, `Filters:790-902`, `Navigation4:226-255`, `ProductSelection:53`), `stroke-[1.8]` (`RentalProductCard:107`, `Categories:155`, `ExploreRentals:128, 168`, `NewArrivals:83`, `CustomerReviews:139`, `HowItWorks:48, 74`, `WhyChoose:91`, `Navbar:114`, `Footer:69`, `Filters:1047`), `stroke-[2]` (`Hero:132`, `Categories:122`, `NewArrivals:67`, `Navbar:82, 101, 145`, `SearchOverlay:255`, `Filters:1024`), `stroke-[2.5]` (`ProductDetails:1926`), `stroke-[2.75]` (`ProductDetails:2045, 2236`), `stroke-[3]` (`Filters:637, 973`).
- **Reproduction Steps**: Compare price typography across Home (`RentalProductCard`), `/filters` (`Filters`), `/product/$id` (`ProductDetails`), and `/orders` (`Orders`), and inspect stroke-width SVG attributes across Hero/Navbar/Categories/ExploreRentals/NewArrivals/WhyChoose/HowItWorks/Filters/ProductDetails.
- **Root Cause**: Components were styled independently over multiple milestones without a unified display-numeric token (`tabular-nums` sans for prices/KPIs, `font-mono` reserved strictly for booking/transaction IDs and PINs) or shared Lucide stroke scale.
- **Affected Files**: `RentalProductCard.tsx`, `Hero.tsx`, `Categories.tsx`, `ExploreRentals.tsx`, `NewArrivals.tsx`, `CustomerReviews.tsx`, `HowItWorks.tsx`, `WhyChoose.tsx`, `CreatorCommunity.tsx`, `Navbar.tsx`, `Footer.tsx`, `SearchOverlay.tsx`, `Navigation4.tsx`, `Filters.tsx`, `ProductDetails.tsx`, `Orders.tsx`, `Profile.tsx`, `About.tsx`.
- **Proposed Correction**:
  - Apply `tabular-nums` on every numeric KPI counter, page counter (`Page 1 of 2`), price display, and metric across all touched components (`Orders`, `ExploreRentals`, `NewArrivals`, `CreatorCommunity`, `About`, `Filters`, `ProductDetails`, `RentalProductCard`).
  - Unify consumer-facing ₹ prices and metric counters to clean UI sans (`font-sans font-semibold tabular-nums`), reserving `font-mono` strictly for technical identifiers (`#ord_...`, `Receipt No`, `Transaction ID`, `⌘K`, masked KYC).
  - Standardize Lucide icon stroke widths in touched components to a restrained monochrome system (`stroke-[1.75]` for UI/nav/card icons, clean `stroke-[2]` / `stroke-[2.25]` only for tiny `10px–14px` checkmark glyphs inside checkboxes rather than mismatched `2.75`/`3`).
- **Regression Test**: Assert in `tests/phase3-p2-fixes.test.ts` that `Orders`, `ExploreRentals`, `NewArrivals`, `CreatorCommunity`, and `About` apply `tabular-nums` on numeric counters/prices, drop mismatched `font-mono` on ₹ consumer price blocks (`Filters`, `ProductDetails`, `Orders`), and eliminate erratic `stroke-[2.75]` / `stroke-[3]` / `stroke-[1.6]` drift across standardized components.
- **Risk Level**: Low
- **Dependencies**: Preserve `#desktop-filter-*` IDs & checkboxes in `Filters.tsx`, and Receipt/Orders layout assertions in `Orders.tsx`.
- **Initial Classification**: `CONFIRMED`

---

## 4. Verification & Test Strategy

1. **Automated Unit + SSR Parity Tests**:
   - Keep `tests/p0-fixes.test.ts` and `tests/phase2-p1-fixes.test.ts` passing (`34/34` baseline).
   - Add `frontend/tests/phase3-p2-fixes.test.ts` testing `F-23` through `F-34` behavior, copy/type/motion/stroke compliance, `Hero` single-img intrinsics, `WhyChoose` 8-card grid, `CustomerReviews` selectable cards & button dots, `Footer` distinct anchored links, `NewArrivals` empty state, `ExploreRentals` bounded pagination, `Wishlist` SSR parity, and `F-24`/`F-34` checks.
   - Add backend pytest covering `/api/products` bounded pagination (`page`/`limit`), filter+merge correctness when `has_filters=False`, and `X-Total-Count` response + CORS `expose_headers`.
2. **Typecheck & Build**:
   - `tsc --noEmit` (`0` errors)
   - `npm run build` (`vite` client + SSR worker `Exit 0`)
3. **Live Runtime Verification (Playwright Chromium + Live FastAPI + TiDB Cloud)**:
   - Viewports: Desktop (`1280×800`) and Mobile (`375×812`), Light & Dark modes.
   - Verify zero `pageerror`, zero `hydrationErrors`, zero unexpected HTTP 5xx/404 requests.
   - Exercise Hero image fetch count (`3` in Light, Dark swap), Categories mobile zero truncation, WhyChoose 8-card grid, CustomerReviews dot sync & text selection, Footer legal hash links & PWA app info, ExploreRentals page 1 -> 2 -> reload persistence, NewArrivals simulated empty state, Orders/Profile/ProductDetails/Wishlist/Filters keyboard & P0/P1 regression checks.
