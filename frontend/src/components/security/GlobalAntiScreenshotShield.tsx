import React from "react";

/**
 * GlobalAntiScreenshotShield (Deprecated / No-op)
 *
 * NOTE: Anti-screenshot protection is page-specific and strictly scoped to
 * the Aadhaar KYC page (/payernt/kyc) and PAN KYC pages (/kyc, /payent/kyc) via
 * `useKycScreenshotProtection` and `KycScreenShield`.
 *
 * All other platform pages have normal screenshot and printing capabilities without restrictions.
 */
export function GlobalAntiScreenshotShield() {
  return null;
}

export default GlobalAntiScreenshotShield;
