const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("Starting DeliveryMap and RefundPolicy Verification Suite...\n");

const rootDir = path.resolve(process.cwd());

// 1. Verify RefundPolicy.tsx
const refundPolicyPath = path.join(rootDir, "frontend/src/pages/RefundPolicy.tsx");
assert(fs.existsSync(refundPolicyPath), "RefundPolicy.tsx must exist");
const refundContent = fs.readFileSync(refundPolicyPath, "utf-8");

// Must be customer-friendly
assert(
  refundContent.includes("Summary of Refund &amp; Cancellation Scenarios") ||
  refundContent.includes("Summary of Refund & Cancellation Scenarios"),
  "RefundPolicy.tsx must contain customer-friendly scenarios heading"
);
assert(
  refundContent.includes("Rental Scenario"),
  "RefundPolicy.tsx must contain customer-friendly table header"
);
assert(
  refundContent.includes("Who Can Cancel"),
  "RefundPolicy.tsx must contain Who Can Cancel column"
);

// Must NOT contain developer-facing endpoint paths or internal database state transitions
assert(
  !refundContent.includes("POST /api/orders/{id}/cancel"),
  "RefundPolicy.tsx must NOT expose POST /api/orders/{id}/cancel to public users"
);
assert(
  !refundContent.includes("POST /api/bookings/{id}/cancel"),
  "RefundPolicy.tsx must NOT expose POST /api/bookings/{id}/cancel to public users"
);
assert(
  !refundContent.includes("POST /api/orders/{id}/reject"),
  "RefundPolicy.tsx must NOT expose POST /api/orders/{id}/reject to public users"
);
assert(
  !refundContent.includes("backendTrigger"),
  "RefundPolicy.tsx must NOT contain backendTrigger technical property"
);
assert(
  !refundContent.includes("statusTransition"),
  "RefundPolicy.tsx must NOT contain statusTransition technical property"
);
console.log("✓ RefundPolicy.tsx is cleanly separated and customer-friendly (no raw endpoints).");

// 2. Verify DeliveryMap.tsx
const deliveryMapPath = path.join(rootDir, "frontend/src/components/delivery/DeliveryMap.tsx");
assert(fs.existsSync(deliveryMapPath), "DeliveryMap.tsx must exist");
const mapContent = fs.readFileSync(deliveryMapPath, "utf-8");

// Must import useState from react
assert(
  mapContent.includes("useState") && /from\s+["']react["']/.test(mapContent),
  "DeliveryMap.tsx MUST import useState from 'react'"
);
assert(
  mapContent.includes("useEffect") && /from\s+["']react["']/.test(mapContent),
  "DeliveryMap.tsx MUST import useEffect from 'react'"
);
assert(
  mapContent.includes("useRef") && /from\s+["']react["']/.test(mapContent),
  "DeliveryMap.tsx MUST import useRef from 'react'"
);

// Must maintain click-to-load privacy gate
assert(
  mapContent.includes("hasMapConsent"),
  "DeliveryMap.tsx must maintain hasMapConsent state"
);
assert(
  mapContent.includes("Load Live Map"),
  "DeliveryMap.tsx must provide 'Load Live Map' action"
);
assert(
  mapContent.includes("payent:map_embed_consent"),
  "DeliveryMap.tsx must use payent:map_embed_consent key"
);
assert(
  mapContent.includes("map.remove()"),
  "DeliveryMap.tsx must clean up map instance on unmount"
);
console.log("✓ DeliveryMap.tsx correctly imports useState and preserves privacy gate & lifecycle.");

// 3. Verify Internal Policy-to-Code Verification Table in PAyENT_LEGAL_IMPLEMENTATION_REPORT.md
const reportPath = path.join(rootDir, "docs/PAyENT_LEGAL_IMPLEMENTATION_REPORT.md");
assert(fs.existsSync(reportPath), "PAyENT_LEGAL_IMPLEMENTATION_REPORT.md must exist");
const reportContent = fs.readFileSync(reportPath, "utf-8");

assert(
  reportContent.includes("Internal Policy-to-Code Verification Table"),
  "Report must contain the Internal Policy-to-Code Verification Table"
);
// All 6 required scenarios:
assert(reportContent.includes("/api/orders/{id}/cancel"), "Report must document /api/orders/{id}/cancel");
assert(reportContent.includes("Pre-dispatch"), "Report must document Pre-dispatch condition");
assert(reportContent.includes("Turnaround violation"), "Report must document Turnaround violation condition");
assert(reportContent.includes("handed_back_at is None"), "Report must document handed_back_at is None condition");
assert(reportContent.includes("/api/orders/{id}/reject"), "Report must document /api/orders/{id}/reject");
assert(reportContent.includes("/api/orders/{id}/dispute"), "Report must document dispute endpoint");
assert(reportContent.includes("/api/payments/refund"), "Report must document payment refund endpoint");
console.log("✓ PAyENT_LEGAL_IMPLEMENTATION_REPORT.md contains complete 6-scenario internal verification table.");

console.log("\nALL VERIFICATION CHECKS PASSED SUCCESSFULLY!");
