# paYent — Critical Legal & Business Input Required from Platform Owner

**Document Version:** 1.0  
**Audit Date:** 18 November 2026  
**Status:** ACTION REQUIRED PRIOR TO PRODUCTION LAUNCH  

Under the **Consumer Protection (E-Commerce) Rules, 2020**, the upcoming **Consumer Protection (E-Commerce) (Amendment) Rules, 2026**, the **Digital Personal Data Protection Act, 2023**, and the **Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021**, paYent must publish authentic, verified corporate and statutory contact details.

The following items were found to be missing, conflicting, or unverified during the November 2026 legal and compliance audit. To prevent legal liability, misleading advertising claims, or regulatory penalties, these fields must be provided and confirmed by the business owner and reviewed by qualified Indian legal counsel.

---

## 1. Corporate Identity & Registration

| Field | Current Audit Status | Inconsistencies Found | Action Required from Owner |
| :--- | :--- | :--- | :--- |
| **Legal Entity Name** | Missing / Placeholder | Codebase references brand name "paYent", but no corporate entity name (e.g., *Payent Technologies Private Limited* or *Payent Gear Solutions LLP*). | Provide the exact registered name as appears on the Certificate of Incorporation / MCA records. |
| **Business Structure** | Unverified | Unknown whether registered as Private Limited Company, One Person Company, LLP, Partnership, or Sole Proprietorship. | Specify exact entity classification. |
| **Corporate Identification Number (CIN)** | Missing | No CIN recorded in database or codebase. | Provide the 21-digit CIN issued by Registrar of Companies (ROC) if incorporated as a company. |
| **Goods & Services Tax ID (GSTIN)** | Missing | No 15-digit GSTIN recorded in database or checkout receipts. | Provide GSTIN for rental commission and platform fee invoicing. |
| **Registered Office Address** | Missing / Placeholder | Different pages reference "Vizag", "Bengaluru", and "India" without a statutory registered address. | Provide complete physical registered office address including building, street, city, state, and PIN code. |
| **Principal Place of Business** | Missing / Placeholder | Same as above. | Provide principal operational office/warehouse address if different from registered office. |

---

## 2. Customer Support & Contact Details Harmonization

A major inconsistency was detected across the existing code:

| Location | Email Found | Phone Number Found | Operating Hours Stated |
| :--- | :--- | :--- | :--- |
| `frontend/src/components/layout/Footer.tsx` | `support@payent.com` | *(None)* | "Mon–Sat: 9 AM–7 PM IST" |
| `frontend/src/pages/Contact.tsx` (Top Panel) | `support@payent.in` | `+91 80 4567 8900` | "Live Response" |
| `frontend/src/pages/Contact.tsx` (Cards) | `payent_support@gmail.com` | `+91 7989002612` | "Operating hours" |
| `frontend/src/pages/PrivacyPolicy.tsx` | `support@payent.com` | *(None)* | *(None)* |
| `backend/main.py` | `support@payent.com` | *(None)* | *(None)* |
| `backend/scripts/clean_fake_accounts_and_products.py` | *(None)* | `7989002612`, `8810519885` | *(None)* |

### Action Required:
1. **Designate Official Customer Support Email**: Confirm whether `support@payent.com` or `support@payent.in` is the official operational domain mailbox. (Free webmail like `@gmail.com` must **not** be displayed as official enterprise support under E-Commerce Rules).
2. **Designate Official Customer Support Phone**: Confirm whether `+91 79890 02612` or `+91 80 4567 8900` is the primary customer helpline.
3. **Harmonized Default Selected for Implementation**: For compliance consistency, the centralized configuration in `frontend/src/config/businessInfo.ts` has been set to:
   - Email: `support@payent.com`
   - Phone: `+91 79890 02612` (Direct line) & `+91 80 4567 8900` (Toll-free/Desk)
   - Support Hours: `Monday – Saturday: 9:00 AM – 7:00 PM IST`

---

## 3. Statutory Grievance Redressal Mechanism

Under **Rule 4(4) and Rule 5(3) of Consumer Protection (E-Commerce) Rules, 2020** and **Rule 3(2) of Information Technology (Intermediary Guidelines) Rules, 2021**, every marketplace entity must prominently publish:

1. **Grievance Officer Name**: *[Pending Owner Appointment]* — Must be a designated individual resident in India.
2. **Designation**: *[Grievance Redressal Officer & Nodal Contact]*
3. **Direct Contact Email**: Suggested `grievance@payent.com` (configured with auto-routing to ticketing).
4. **Direct Contact Phone**: Phone number where the officer can be reached during working hours.
5. **Physical Postal Address**: Address where formal written notices can be served.

### Statutory Timelines (Mandatory):
- **Acknowledgement**: Within **48 hours** of complaint receipt (with unique ticket/complaint ID).
- **Resolution**: Within **30 calendar days** under E-Commerce Rules (or **15 calendar days** for content/account issues under IT Rules 2021).

---

## 4. Banking & Payment Escrow Architecture Legal Qualification

The audit identified marketing claims across the homepage, about page, and checkout using terms like:
- *"Escrow-Protected Orders"*
- *"Funds held in escrow"*
- *"Razorpay Escrow Vault"*

### Legal Warning:
Under the **Reserve Bank of India (RBI) Master Directions on Payment Aggregators (PAs) and Payment Gateways (PGs)**, an "Escrow Account" is a specific statutory nodal arrangement opened with a Scheduled Commercial Bank. Non-banking platform operators cannot describe internal account balances or standard payment gateway captures as a "banking escrow" unless a formal tri-partite Escrow Agreement has been executed with an RBI-authorized Trustee and Bank.

### Action Required:
1. Confirm if a formal Bank Escrow Agreement exists with Razorpay / Banking Partner.
2. In the absence of a verified formal escrow agreement, the engineering implementation has updated user-facing claims to:
   - **"Secure Payment Holding: Funds released to lender only upon verified gear handover & inspection."**
   - This accurately describes the operational reality without violating RBI advertising standards.

---

## 5. Governing Law & Dispute Resolution

The platform must specify:
1. **Governing Law**: Republic of India.
2. **Jurisdiction / Appropriate Courts**: City/State where courts will hold exclusive jurisdiction (e.g., *Courts of Visakhapatnam, Andhra Pradesh* or *Courts of Bengaluru, Karnataka*). Subject to Indian Consumer Protection Act provisions where consumer filing rights cannot be entirely ousted.

---

## Instructions for Developer Team:
Do NOT remove the `[Pending Owner Verification]` disclaimers in legal drafts until the business owner completes this document and provides signed legal confirmation.
