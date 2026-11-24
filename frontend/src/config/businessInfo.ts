/**
 * paYent — Centralized Business & Legal Information Configuration
 * 
 * IMPORTANT: This is the single source of truth for business identity, customer support,
 * legal compliance, and grievance officer details across the paYent marketplace frontend.
 * 
 * Values flagged with "[Pending Owner Verification]" must be confirmed by the platform owner
 * and legal counsel before production launch. See `docs/LEGAL_OWNER_INPUT_REQUIRED.md`.
 */

export interface BusinessInfo {
  // Brand & Entity
  brandName: string;
  brandTagline: string;
  legalEntityName: string;
  businessType: string;
  cin: string;
  gstin: string;
  isEntityVerified: boolean;

  // Operating Model
  marketplaceModel: string;
  intermediaryStatusNotice: string;

  // Addresses
  registeredOffice: string;
  principalPlaceOfBusiness: string;

  // Customer Support
  supportEmail: string;
  supportPhonePrimary: string;
  supportPhoneFormatted: string;
  supportPhoneTollFree: string;
  supportHours: string;
  supportDays: string;
  typicalResponseTime: string;

  // Statutory Grievance Redressal (Consumer Protection E-Commerce Rules 2020 / IT Rules 2021)
  grievanceOfficer: {
    name: string;
    designation: string;
    email: string;
    phone: string;
    address: string;
    acknowledgementSLA: string;
    resolutionSLA: string;
    isOfficerAppointed: boolean;
  };

  // Nodal Compliance Contact
  nodalContact: {
    name: string;
    designation: string;
    email: string;
    phone: string;
  };

  // Legal Policies
  policyVersion: string;
  policyEffectiveDate: string;
  policyLastUpdated: string;
  governingLaw: string;
  jurisdictionCourts: string;

  // Social & External Links
  socialLinks: {
    twitter: string;
    instagram: string;
    linkedin: string;
    youtube: string;
  };
}

export const BUSINESS_INFO: BusinessInfo = {
  brandName: "paYent",
  brandTagline: "Get What You Need, Without Owning It.",
  legalEntityName: "[Pending Owner Verification: Legal Entity Name]",
  businessType: "[Pending Owner Verification: Private Limited / LLP / Sole Proprietorship]",
  cin: "[Pending Owner Verification: CIN]",
  gstin: "[Pending Owner Verification: GSTIN]",
  isEntityVerified: false,

  marketplaceModel: "Peer-to-Peer Tech Gear Rental Intermediary Marketplace",
  intermediaryStatusNotice:
    "paYent operates exclusively as an electronic intermediary marketplace connecting independent gear owners (Lenders / Payernt) with verified renters (Payrent). paYent is not a seller, rental merchant, or insurer of third-party gear listed on the platform.",

  registeredOffice: "[Pending Owner Verification: Registered Office Address, India]",
  principalPlaceOfBusiness: "[Pending Owner Verification: Principal Place of Business Address, India]",

  // Centralized Support Contacts (Resolved across prior inconsistent references: support@payent.in, payent_support@gmail.com, support@payent.com)
  supportEmail: "support@payent.com",
  supportPhonePrimary: "+917989002612",
  supportPhoneFormatted: "+91 79890 02612",
  supportPhoneTollFree: "+91 80 4567 8900",
  supportHours: "24 Hours Customer Support Available",
  supportDays: "24x7 / 365 Days",
  typicalResponseTime: "Within 2 to 4 business hours",

  // Statutory Grievance Officer details under Consumer Protection (E-Commerce) Rules 2020 (Rule 4(4))
  // and Information Technology (Intermediary Guidelines) Rules 2021 (Rule 3(2))
  grievanceOfficer: {
    name: "[Pending Owner Appointment: Designated Grievance Officer]",
    designation: "Grievance Redressal Officer & Customer Ombudsman",
    email: "grievance@payent.com",
    phone: "+91 79890 02612",
    address: "[Pending Owner Verification: Grievance Officer Address, India]",
    acknowledgementSLA: "Within 48 hours of receipt",
    resolutionSLA: "Within 30 calendar days (15 calendar days for intermediary complaints under IT Rules 2021)",
    isOfficerAppointed: false,
  },

  nodalContact: {
    name: "[Pending Owner Appointment: Nodal Contact Person]",
    designation: "Nodal Contact Person for 24x7 Law Enforcement Coordination",
    email: "nodal@payent.com",
    phone: "+91 79890 02612",
  },

  policyVersion: "v2026.11",
  policyEffectiveDate: "November 18, 2026",
  policyLastUpdated: "November 18, 2026",
  governingLaw: "Laws of the Republic of India",
  jurisdictionCourts: "[Subject to Legal Counsel Review: Competent Courts in India]",

  socialLinks: {
    twitter: "https://twitter.com/payent",
    instagram: "https://instagram.com/payent",
    linkedin: "https://linkedin.com/company/payent",
    youtube: "https://youtube.com/@payent",
  },
};
