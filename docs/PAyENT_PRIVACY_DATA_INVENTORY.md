# paYent Personal Data Inventory & Classification Register
**Statutory Framework**: Digital Personal Data Protection Act, 2023 (DPDP Act 2023) & Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011.  
**Version**: 2026.1  
**Last Updated**: 2026-11-18  
**Scope**: All customer (Payrent), lender (Payernt), administrator, and guest data processed by the paYent platform.

---

## 1. Executive Summary

This Data Inventory documents every category of personal data collected, stored, processed, and transmitted by the paYent marketplace. In accordance with Section 4 and Section 6 of the DPDP Act 2023, data is collected solely for specified lawful purposes with affirmative consent or statutory mandate.

---

## 2. Personal Data Classification Matrix

| Data Category | Specific Data Elements | Purpose of Collection | Lawful Basis (DPDP Act 2023) | Retention Period | Storage Location & Encryption |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Account & Profile** | Full Name, Email Address, Mobile Phone (+91), Hashed Password (bcrypt), Profile Avatar URL, Account Role (`customer`, `lender`, `admin`). | User authentication, account recovery, marketplace role distinction (Payrent vs. Payernt), transaction notifications. | Section 6(1) Consent & Section 4(1) Contractual Necessity. | Active account lifetime + 180 days post account deletion request. | TiDB Serverless (MySQL), encrypted at rest (AES-256); TLS 1.3 in transit. |
| **Identity & KYC Proofs** | Government Identity Card (Aadhaar, Passport, Driving Licence, Voter ID), Masked PAN (`XXXXX1234A`), Selfie verification image, Admin verification status (`PENDING`, `APPROVED`, `REJECTED`), reviewer remarks. | High-value equipment theft prevention, mutual trust between lenders and renters, fraud prevention. | Section 6(1) Explicit Affirmative Consent & Section 7(a) Specified Purpose. | Duration of active platform membership + 5 years post-termination for fraud audit. | Encrypted object storage / TiDB Serverless; PAN masked on all user-facing interfaces. |
| **Fulfillment & Addresses** | Full delivery address (House/Flat, Street, Area, Landmark, City, State, PIN code), Custom handover coordinates, Delivery notes, Recipient contact number. | Equipment delivery dispatch, local courier routing, return pickup scheduling. | Section 4(1) Contractual Performance. | Retained in user address book until deleted by user; attached to historical invoices for 7 years. | TiDB Serverless database. |
| **Rental & Booking Records** | Product ID, Rental Start & End dates, Daily rate, Equipment insurance selection, Booking status (`pending`, `confirmed`, `active`, `completed`, `cancelled`), Handover PIN/OTP. | Booking execution, schedule locking, dispute investigation, equipment damage claims. | Section 4(1) Performance of Contract & Section 7(e) Legal Obligation. | Mandatory 7 years from transaction completion under Income Tax Act 1961 & CGST Act 2017. | TiDB Serverless; immutable booking audit logs. |
| **Payment & Financial** | Razorpay Order ID, Razorpay Payment ID, Payment Signature HMAC, Currency, Total Amount, Security Deposit holding status, Lender payout UPI/Bank details. | Rental payment collection, security deposit holding & refund, lender earnings settlement, statutory tax invoicing. | Section 4(1) Contract Performance & Reserve Bank of India (RBI) Regulations. | Mandatory 7 years under Section 44AA of Income Tax Act 1961 and Section 36 of CGST Act 2017. | Razorpay PCI-DSS Level 1 compliant gateway; platform stores only tokenised payment references. No raw card numbers stored. |
| **Hardware & Laptop Identity** | Laptop make, model, serial number hash, MAC address hash, registered owner ID, security status (`ACTIVE`, `LOST`, `STOLEN`), QR code verification tokens. | Anti-theft hardware tracking, secondary equipment ownership provenance, law enforcement reporting. | Section 6(1) User Consent & Section 7(g) Asset Protection. | Lifetime of device registration on paYent registry; erased upon verified ownership transfer. | TiDB Serverless with cryptographic SHA-256 hashes for hardware identifiers. |
| **Consent & Audit Logs** | User/Session Identifier, Consent Type (`COOKIE_CONSENT`, `PRIVACY_POLICY`, `CHECKOUT_TERMS`, `CONTACT_FORM`), Preference JSON, Policy Version (`2026.1`), IP Address, User Agent, Timestamp. | Statutory proof of affirmative consent under DPDP Section 6(1) & CCPA Dark Pattern Guidelines. | Section 6(1) Statutory Proof of Consent & Rule compliance. | Minimum 3 years from consent recording date. | `consent_records` table in TiDB Serverless. |
| **Support & Inquiries** | Ticket ID, Requester Name, Requester Email, Subject, Inquiry Category, Conversation Messages, Admin Replies, Resolution Timestamps. | Customer grievance redressal, equipment troubleshooting, dispute arbitration. | Section 6(1) Consent & IT Rules 2021 Grievance Handling. | Active conversation + 3 years from ticket closure. | `support_tickets` and `ticket_messages` tables in TiDB Serverless. |
| **Data Subject Requests** | Request ID, User Email, Request Type (`ACCESS`, `CORRECTION`, `ERASURE`, `GRIEVANCE`), Request Details, Status, Resolution Notes, Admin ID. | Processing data subject rights under DPDP Act 2023 Section 11 & Section 12. | Section 11 & Section 12 DPDP Act 2023 Statutory Obligation. | 5 years for statutory compliance inspection by Data Protection Board of India. | `privacy_requests` table in TiDB Serverless. |
| **Technical & Device Telemetry** | IP address, browser user-agent, operating system, referrer, network status. | DDoS protection, rate limiting, session authentication, cross-site request forgery prevention. | Section 7(b) Security & Legitimate Operational Interest. | 90 days rolling log retention. | Ephemeral server logs; Cloudflare edge analytics. |

---

## 3. Special Categories & Minor Data Policy

1. **Minors (Under 18 Years)**:
   - Pursuant to Section 9 of the DPDP Act 2023, the paYent platform is strictly restricted to individuals aged 18 years and older capable of entering into legally binding contracts under the Indian Contract Act, 1872.
   - We do not knowingly collect personal data from or target advertisements to minors. If an account is discovered to belong to a minor, all associated personal data is promptly deleted and access revoked.
2. **Sensitive Personal Data (SPI)**:
   - Financial passwords, biometric scans, and unmasked credit/debit card details are NEVER collected or stored on paYent servers. All card and UPI processing is handled directly by Razorpay (PCI-DSS Level 1 certified).

---

## 4. Cross-Border Data Transfers

- Primary database storage is hosted on **TiDB Cloud Serverless** with primary operational instances located in AWS/GCP data centers.
- Application backend services run on **Railway** container infrastructure.
- Edge delivery and DNS security are routed via **Cloudflare Workers**.
- Under Section 16 of the DPDP Act 2023, personal data transfers outside India comply with Central Government notifications and are restricted from transfer to any blacklisted foreign territories.

---

## 5. Security Safeguards

1. **At Rest**: AES-256 encryption applied to all database tables and persistent backups.
2. **In Transit**: Mandatory TLS 1.3 encryption across all public REST endpoints and WebSockets.
3. **Password Security**: Passwords salted and hashed with bcrypt (cost factor >= 12).
4. **Access Control**: Role-based access control (RBAC) restricting KYC documents and identity proofs strictly to authenticated compliance administrators.
5. **Masking**: Permanent masking of national identity proofs (e.g., PAN rendered as `XXXXX1234A`).

---

## 6. Data Subject Rights Execution (DPDP Section 11 & 12)

Users may exercise statutory rights at any time via the **Your Data & Privacy** hub inside [Settings](/settings) or by emailing `grievance@payent.com`:
- **Right to Summary & Access**: Real-time overview of personal data categories and download of machine-readable `.json` archive.
- **Right to Correction**: Submission of data rectification requests with audit resolution tracking.
- **Right to Erasure**: Deletion of non-statutory data within 30 days.
- **Right to Grievance Redressal**: Direct communication channel with the Statutory Grievance Redressal Officer.
