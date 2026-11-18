# paYent Third-Party Services & Sub-Processor Register
**Statutory Framework**: Digital Personal Data Protection Act, 2023 (DPDP Act 2023) Section 8 & Information Technology Rules, 2021.  
**Version**: 2026.1  
**Last Updated**: 2026-11-18  
**Scope**: All third-party SDKs, APIs, cloud hosts, payment gateways, and content distribution networks utilized by paYent.

---

## 1. Overview & Due Diligence

paYent engages specialized third-party service providers ("Data Processors" / "Sub-Processors") strictly to provide core infrastructure, payment processing, fraud security, and communications. Each provider has been vetted for compliance with international and Indian data privacy standards.

---

## 2. Comprehensive Sub-Processor Registry

| Service Provider | Entity & Country | Core Purpose | Data Transmitted / Shared | Legal Basis | Privacy Policy Link | Consent / Loading Gate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Razorpay Software Private Limited** | India | Payment gateway, UPI collect, net banking, debit/credit card processing, refunds. | Order ID, rental amount, customer email, customer phone number. *(Raw card numbers and UPI PINs are entered directly in Razorpay iframe/modal; paYent never receives or stores card PAN or CVV)*. | Contract Performance (Section 4 DPDP Act) & RBI Guidelines. | [Razorpay Privacy Policy](https://razorpay.com/privacy/) | **Strictly Necessary**: Loaded on-demand when user initiates checkout or deposit authorization. |
| **TiDB Cloud (PingCAP, Inc.)** | USA / Singapore / India (AWS/GCP regions) | Cloud MySQL-compatible distributed relational database hosting (Serverless). | Encrypted user records, catalog, booking transactions, hashed credentials, KYC status metadata, audit logs. | Contract Performance & Operational Legitimate Interest. | [PingCAP Privacy Policy](https://www.pingcap.com/privacy-policy/) | **Strictly Necessary**: Core database persistence layer. |
| **Railway Corporation** | USA | Backend FastAPI container application compute runtime and API services. | Encrypted API payloads, ephemeral application memory during request processing. | Contract Performance. | [Railway Privacy Policy](https://railway.app/legal/privacy) | **Strictly Necessary**: Core backend compute. |
| **Cloudflare, Inc.** | USA / Global Edge Network (including India nodes: Mumbai, Chennai, Delhi, Bangalore) | Edge computing (Cloudflare Workers), CDN caching, DDoS mitigation, SSL termination. | IP address, HTTP headers, request URL, TLS handshake telemetry. | Security & Fraud Prevention (DPDP Section 7(b)). | [Cloudflare Privacy Policy](https://www.cloudflare.com/privacypolicy/) | **Strictly Necessary**: Essential infrastructure & security. |
| **Twilio Inc.** | USA / Global | SMS delivery for multi-factor authentication (MFA) and account verification OTPs. | Destination mobile number (+91), 6-digit one-time passcode text. | User Consent & Security Verification. | [Twilio Privacy Policy](https://www.twilio.com/legal/privacy) | **Strictly Necessary (Functional)**: Triggered solely when user requests phone verification or login OTP. |
| **CARTO & OpenStreetMap Contributors** | Spain / USA / Global | Basemap tile raster delivery for visual courier delivery tracking (`DeliveryMap.tsx`). | Anonymous map tile coordinate requests (`z/x/y`), browser user-agent. No user identifiers or addresses are sent to tile servers. | Legitimate Interest & User Consent. | [CARTO Privacy Policy](https://carto.com/privacy/) / [OSM Privacy Policy](https://wiki.osmfoundation.org/wiki/Privacy_Policy) | **Click-to-Load Gated**: Map tiles do NOT load automatically. User must explicitly click "Load Live Map" to initialize external tile requests. |

---

## 3. Disclosed Inactive / Dummy Stubs

To ensure complete transparency and prevent regulatory misunderstandings:

| Component | Code Location | Status | Network Traffic Assessment |
| :--- | :--- | :--- | :--- |
| **Firebase Stub** | `frontend/src/lib/firebase.ts` | **Dummy Stub (Zero Network Activity)** | Exports `{ app: null, auth: null }`. Contains no active API keys, initiates zero HTTP connections, and transmits zero user data. |
| **Google Maps Embeds** | N/A | **Replaced with Leaflet / OpenStreetMap** | No Google Maps JavaScript API keys or Google tracking scripts are embedded in the application bundle. "Open in Google Maps" links are outbound hyperlink redirections opening in new browser tabs, transmitting no background data. |
| **Analytics / Tag Managers** | N/A | **Internal Event Bus Only** | paYent uses an internal telemetry bus (`tracker.ts`) with no third-party Google Analytics (GA4), Facebook Pixel, or TikTok tracking scripts. |

---

## 4. Click-to-Load Implementation for Optional Embeds

In compliance with Requirement 7 and CCPA dark pattern prohibitions:
- The delivery route tracking component (`frontend/src/components/delivery/DeliveryMap.tsx`) features a strict **Click-to-Load Privacy Gate**.
- When an authenticated user views booking tracking, external tile connections to `basemaps.cartocdn.com` are blocked by default.
- A clear visual card explains that loading the map connects to external CARTO/OpenStreetMap servers subject to their respective privacy policies.
- Only upon explicit affirmative selection ("Load Live Map") are external tile layers mounted. The preference is remembered in `localStorage.setItem("payent:map_embed_consent", "true")`.

---

## 5. Sub-Processor Contractual Standards

All data processors engaged by paYent are bound by contractual agreements requiring:
1. Processing of personal data solely upon documented instructions.
2. Implementation of industry-standard technical and organizational security measures (ISO 27001 / SOC 2 / PCI-DSS).
3. Immediate notification (within 24 hours) in the event of an identified security incident or data breach.
4. Return or secure deletion of personal data upon contract termination.
