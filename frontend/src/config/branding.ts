/**
 * paYent — Official Brand Configuration & Asset References
 *
 * Master source of truth for the official paYent brand identity.
 */

export const BRAND_CONFIG = {
  name: "paYent",
  tagline: "Get What You Need, Without Owning It.",
  shortTagline: "Get What You Need",
  description:
    "Get What You Need, Without Owning It. Rent verified cameras, laptops, audio gear, and more.",
  url: "https://payent.com",
} as const;

export const BRAND_ASSETS = {
  // Official Brand Logo (Master Landscape 1024x716)
  logo: "/brand/payent-logo.webp",
  logoPng: "/brand/payent-logo.png",
  logoSvg: "/brand/payent-logo.svg",

  // Official Square Brand Mark / Icon (512x512)
  logoIcon: "/brand/payent-logo-icon.webp",
  logoIconPng: "/brand/payent-logo-icon.png",
  logo512: "/brand/payent-logo-512.png",
  logo192: "/brand/payent-logo-192.png",

  // Social / OpenGraph Card (1200x630)
  ogImage: "/brand/payent-logo-og.png",

  // Favicon & App Icons
  faviconIco: "/favicon.ico",
  faviconPng: "/favicon.png",
  faviconSvg: "/favicon.svg",
  appleTouchIcon: "/apple-touch-icon.png",
} as const;

export const PAYENT_LOGO = BRAND_ASSETS.logoIcon;
export const PAYENT_LOGO_PNG = BRAND_ASSETS.logoIconPng;
export const PAYENT_WORDMARK = BRAND_CONFIG.name;
export const PAYENT_FAVICON = BRAND_ASSETS.faviconIco;
export const PAYENT_APPLE_ICON = BRAND_ASSETS.appleTouchIcon;
export const PAYENT_OG_IMAGE = BRAND_ASSETS.ogImage;
