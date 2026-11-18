import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { MainLayout } from "@/layouts/MainLayout";
import { BackButton } from "@/components/common/BackButton";
import {
  Shield,
  Eye,
  Database,
  Lock,
  UserCheck,
  FileText,
  Clock,
  AlertCircle,
  HelpCircle,
  Download,
  Trash2,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { BUSINESS_INFO } from "@/config/businessInfo";

export function PrivacyPolicy() {
  useEffect(() => {
    if (typeof window === "undefined" || !window.location.hash) return;
    const id = window.location.hash.replace("#", "");
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const sections = [
    { id: "entity-model", label: "1. Who Operates paYent & Marketplace Model" },
    { id: "data-collected", label: "2. Categories of Personal Data Collected" },
    { id: "purpose-use", label: "3. Purposes of Data Processing" },
    { id: "behavioral-analytics", label: "4. Behavioral Analytics & Recommendations" },
    { id: "security-safeguards", label: "5. Storage, Protection & Cryptography" },
    { id: "service-providers", label: "6. Service Providers & Third Parties" },
    { id: "cross-border", label: "7. Cross-Border Data Transfers" },
    { id: "retention-rules", label: "8. Data Retention Schedule" },
    { id: "user-rights", label: "9. Your Rights Under DPDP Act 2023" },
    { id: "consent-withdrawal", label: "10. Consent Withdrawal Process" },
    { id: "privacy-complaints", label: "11. Filing a Privacy Grievance" },
    { id: "grievance-contact", label: "12. Designated Grievance Officer" },
    { id: "policy-updates", label: "13. Updates to this Policy" },
    { id: "minors-policy", label: "14. Protection of Minors (Under 18)" },
  ];

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 md:py-16 text-neutral-900 dark:text-white">
        <div className="flex items-center justify-start mb-6">
          <BackButton fallback="/payent" />
        </div>

        {/* Header */}
        <div className="text-center space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold">
            <Shield className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
            <span>DPDP Act 2023 &amp; IT Rules 2021 Compliant Notice</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight font-display">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto font-normal">
            Version {BUSINESS_INFO.policyVersion} &bull; Effective Date: {BUSINESS_INFO.policyEffectiveDate} &bull; Last Revised: {BUSINESS_INFO.policyLastUpdated}
          </p>
        </div>

        {/* Quick Table of Contents Grid */}
        <div className="mb-10 p-5 rounded-3xl bg-neutral-50 dark:bg-[#1E1E1E] border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">
            Table of Contents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="py-1 text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white hover:underline truncate"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>

        {/* Main Content Card */}
        <div
          id="privacy-policy"
          className="scroll-mt-24 bg-white dark:bg-[#1E1E1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 md:p-10 shadow-sm space-y-10"
        >
          {/* Section 1 */}
          <section id="entity-model" className="scroll-mt-24 space-y-3">
            <div className="flex items-center gap-3 text-lg font-bold">
              <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2>1. Who Operates paYent &amp; Marketplace Model</h2>
            </div>
            <div className="pl-11 text-xs md:text-sm text-neutral-600 dark:text-neutral-300 space-y-2 leading-relaxed">
              <p>
                <strong>{BUSINESS_INFO.brandName}</strong> is operated by{" "}
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {BUSINESS_INFO.legalEntityName}
                </span>{" "}
                (operating under brand name &ldquo;paYent&rdquo;), an electronic marketplace intermediary resident in India.
              </p>
              <p>
                paYent functions exclusively as a peer-to-peer technology intermediary platform connecting independent equipment owners (&ldquo;Lenders&rdquo; or &ldquo;Payernt&rdquo;) with verified individuals seeking to rent equipment (&ldquo;Renters&rdquo; or &ldquo;Payrent&rdquo;). paYent is an intermediary under Section 2(1)(w) of the Information Technology Act, 2000, and does not own, stock, inspect, warrant, or directly deliver third-party gear listed on the platform.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section id="data-collected" className="scroll-mt-24 space-y-3">
            <div className="flex items-center gap-3 text-lg font-bold">
              <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <Eye className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2>2. Categories of Personal Data Collected</h2>
            </div>
            <div className="pl-11 text-xs md:text-sm text-neutral-600 dark:text-neutral-300 space-y-3 leading-relaxed">
              <p>
                We collect personal data directly from you when you register, undergo identity verification, list gear, submit booking requests, or communicate via our platform:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>Account Identification:</strong> Full legal name, verified email address, mobile phone number, city, and secure password hash.
                </li>
                <li>
                  <strong>Identity Verification &amp; KYC:</strong> Aadhaar number (last 4 digits masked with SHA-256 hash for duplicate detection), PAN number, government identity document photographs, submitted exclusively for anti-fraud and equipment safety verification.
                </li>
                <li>
                  <strong>Lender Gear Listings:</strong> Equipment brand, model, specifications, replacement value, custom category, serial numbers, and uploaded gear photographs.
                </li>
                <li>
                  <strong>Rental Transactions:</strong> Rental dates, selected time slots (morning, afternoon, full-day), booking status, secret handover PINs, and courier delivery notes.
                </li>
                <li>
                  <strong>Payment References:</strong> Razorpay order ID, payment transaction ID, payment status, and refund references. (Note: Full debit/credit card numbers and CVV are never received or stored on paYent servers; they are entered directly into Razorpay's PCI-DSS Level 1 certified gateway).
                </li>
                <li>
                  <strong>Device Identity:</strong> Laptop/hardware serial numbers, brand, model, and registered cryptographic QR tokens created by users in the Secure Device Identity registry.
                </li>
                <li>
                  <strong>Customer Support &amp; Conversations:</strong> Support tickets, inquiry descriptions, admin responses, and real-time chat messages between confirmed rental counterparties.
                </li>
                <li>
                  <strong>Reviews &amp; Ratings:</strong> Product ratings, text comments, and rental transaction verification badges.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section id="purpose-use" className="scroll-mt-24 space-y-3">
            <div className="flex items-center gap-3 text-lg font-bold">
              <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <Database className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2>3. Purposes of Data Processing</h2>
            </div>
            <div className="pl-11 text-xs md:text-sm text-neutral-600 dark:text-neutral-300 space-y-2 leading-relaxed">
              <p>Under the Digital Personal Data Protection Act, 2023, personal data is processed solely for lawful purposes for which you have provided consent or for legitimate uses recognized by law:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Creating and authenticating your Payrent (renter) or Payernt (lender) marketplace account.</li>
                <li>Verifying identity prior to high-value equipment custody transfer.</li>
                <li>Processing rental bookings, security deposit authorizations, and gateway payout releases.</li>
                <li>Preventing equipment loss, fraudulent bookings, identity theft, and duplicate accounts.</li>
                <li>Delivering SMS/Email order alerts, handover OTPs, and support ticket notifications.</li>
                <li>Complying with statutory accounting, GST invoicing, and tax audit obligations under Indian law.</li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section id="behavioral-analytics" className="scroll-mt-24 space-y-3">
            <div className="flex items-center gap-3 text-lg font-bold">
              <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <Lock className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2>4. Behavioral Analytics &amp; Recommendation Engine</h2>
            </div>
            <div className="pl-11 text-xs md:text-sm text-neutral-600 dark:text-neutral-300 space-y-2 leading-relaxed">
              <p>
                To help creators discover compatible equipment (such as &ldquo;Frequently Booked Together&rdquo; camera lenses or sound rigs), paYent records first-party interaction signals (product views, search queries, category filters).
              </p>
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-1.5 text-xs">
                <div className="font-bold text-neutral-950 dark:text-white">Our Recommendation Safeguards:</div>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>Zero Keystroke Logging:</strong> We never log unsubmitted form text, draft messages, or keystrokes.</li>
                  <li><strong>Zero Cross-Site Tracking:</strong> We do not track your activity on third-party websites or purchase external demographic dossiers.</li>
                  <li><strong>Session Pseudonymization:</strong> For logged-out visitors, browsing signals are tied strictly to an anonymous browser session identifier.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section id="security-safeguards" className="scroll-mt-24 space-y-3">
            <div className="flex items-center gap-3 text-lg font-bold">
              <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <Shield className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2>5. Storage, Protection &amp; Cryptography</h2>
            </div>
            <div className="pl-11 text-xs md:text-sm text-neutral-600 dark:text-neutral-300 space-y-2 leading-relaxed">
              <p>
                We implement technical and organizational security measures to protect your personal data against unauthorized access, loss, or alteration:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Transport Layer Security:</strong> All web and API traffic is encrypted in transit using TLS 1.3 / HTTPS.</li>
                <li><strong>Password Hashing:</strong> Passwords are encrypted using bcrypt with adaptive salt cost. Raw passwords are never accessible in plain text.</li>
                <li><strong>KYC Isolation:</strong> KYC files are stored in access-restricted storage paths accessible only by authorized verification staff. Document numbers are masked in all standard database queries.</li>
                <li><strong>Role-Based Access Control:</strong> Strict database credentials and admin audit logging ensure staff only view records necessary for support resolution.</li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section id="service-providers" className="scroll-mt-24 space-y-3">
            <div className="flex items-center gap-3 text-lg font-bold">
              <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <ExternalLink className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2>6. Service Providers &amp; Third Parties</h2>
            </div>
            <div className="pl-11 text-xs md:text-sm text-neutral-600 dark:text-neutral-300 space-y-2 leading-relaxed">
              <p>
                paYent shares personal data strictly with trusted service providers under confidentiality agreements and data processing terms:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Payment Gateway:</strong> Razorpay Software Private Limited (PCI-DSS compliant payment processing and refunds).</li>
                <li><strong>Map &amp; Geocoding Tiles:</strong> Carto and OpenStreetMap (used exclusively for rendering courier delivery transit paths).</li>
                <li><strong>Cloud Infrastructure:</strong> Cloudflare Workers (edge hosting) and Railway / TiDB Cloud (managed database).</li>
                <li><strong>Rental Counterparty:</strong> Limited contact information (first name, phone, pickup city) is shared with the opposing confirmed party (renter or lender) strictly to facilitate equipment handover.</li>
              </ul>
              <p className="text-xs text-neutral-500 italic">
                *Note: paYent does not sell, rent, or trade your personal data to advertising brokers or marketing aggregators.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section id="cross-border" className="scroll-mt-24 space-y-3">
            <div className="flex items-center gap-3 text-lg font-bold">
              <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <Clock className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2>7. Cross-Border Data Transfers</h2>
            </div>
            <div className="pl-11 text-xs md:text-sm text-neutral-600 dark:text-neutral-300 space-y-2 leading-relaxed">
              <p>
                paYent stores user databases and customer records primarily within server regions located in India or compliant cloud availability zones. In the event of cross-border data transfer for global cloud redundancy, transfers are conducted in compliance with Section 16 of the Digital Personal Data Protection Act, 2023 and applicable Central Government notifications.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section id="retention-rules" className="scroll-mt-24 space-y-3">
            <div className="flex items-center gap-3 text-lg font-bold">
              <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <Clock className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2>8. Data Retention Schedule</h2>
            </div>
            <div className="pl-11 text-xs md:text-sm text-neutral-600 dark:text-neutral-300 space-y-2 leading-relaxed">
              <p>
                We do not retain personal data longer than necessary for the purposes for which it was collected, subject to statutory retention obligations under Indian law:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs mt-2">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white font-bold">
                      <th className="py-2 pr-4">Data Category</th>
                      <th className="py-2 pr-4">Retention Period</th>
                      <th className="py-2">Statutory Basis / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                    <tr>
                      <td className="py-2.5 pr-4 font-medium">Financial &amp; Invoicing Records</td>
                      <td className="py-2.5 pr-4">8 Financial Years</td>
                      <td className="py-2.5 text-neutral-500">Section 128, Companies Act, 2013 &amp; Income Tax Act, 1961</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 font-medium">KYC Verification Data</td>
                      <td className="py-2.5 pr-4">5 Years post account closure</td>
                      <td className="py-2.5 text-neutral-500">Equipment recovery, anti-money laundering &amp; fraud prevention</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 font-medium">Server &amp; Access Logs</td>
                      <td className="py-2.5 pr-4">180 Days</td>
                      <td className="py-2.5 text-neutral-500">Rule 3(1)(h), Information Technology Rules, 2021</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 font-medium">Active Account Profile</td>
                      <td className="py-2.5 pr-4">Duration of active account</td>
                      <td className="py-2.5 text-neutral-500">Service delivery until user-initiated deletion</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Section 9 */}
          <section id="user-rights" className="scroll-mt-24 space-y-3">
            <div className="flex items-center gap-3 text-lg font-bold">
              <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <UserCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2>9. Your Rights Under DPDP Act 2023</h2>
            </div>
            <div className="pl-11 text-xs md:text-sm text-neutral-600 dark:text-neutral-300 space-y-2 leading-relaxed">
              <p>As a data principal, you have enforceable statutory rights under the Digital Personal Data Protection Act, 2023:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>Right to Access &amp; Summary (Section 11):</strong> You may view a summary of personal data held about you and download a machine-readable JSON data archive directly from{" "}
                  <Link to="/settings" className="font-semibold underline text-neutral-900 dark:text-white">
                    Settings &rarr; Your Data &amp; Privacy
                  </Link>.
                </li>
                <li>
                  <strong>Right to Correction &amp; Updating (Section 12):</strong> You may update profile data or request correction of inaccurate documents via your profile dashboard or by filing a correction request.
                </li>
                <li>
                  <strong>Right to Erasure / Deletion (Section 12):</strong> You may request account and personal data deletion. Deletion will be executed except where retention is legally mandated for ongoing dispute resolution, pending bookings, or statutory financial retention.
                </li>
                <li>
                  <strong>Right of Grievance Redressal (Section 13):</strong> You may register a complaint with our Grievance Officer regarding any data handling concern.
                </li>
                <li>
                  <strong>Right to Nominate (Section 14):</strong> You may nominate an individual to exercise your data principal rights in the event of death or incapacity.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 10 */}
          <section id="consent-withdrawal" className="scroll-mt-24 space-y-3">
            <div className="flex items-center gap-3 text-lg font-bold">
              <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2>10. Consent Withdrawal Process</h2>
            </div>
            <div className="pl-11 text-xs md:text-sm text-neutral-600 dark:text-neutral-300 space-y-2 leading-relaxed">
              <p>
                Where processing is based on your explicit consent, you have the right to withdraw consent at any time:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Cookie Preferences:</strong> Click &ldquo;Cookie Settings&rdquo; in the website footer or visit{" "}
                  <Link to="/cookies" className="font-semibold underline text-neutral-900 dark:text-white">
                    Cookie Policy
                  </Link>{" "}
                  to modify or withdraw non-essential cookie choices immediately.
                </li>
                <li>
                  <strong>Marketing Communications:</strong> Toggle off promotional notifications in Settings &rarr; Notification Preferences.
                </li>
                <li>
                  <strong>Full Service Consent Withdrawal:</strong> Submit a consent withdrawal request via Settings &rarr; Your Data &amp; Privacy. Please note that withdrawing consent for core service processing may require account closure where we cannot fulfill active rental obligations without that data.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 11 */}
          <section id="privacy-complaints" className="scroll-mt-24 space-y-3">
            <div className="flex items-center gap-3 text-lg font-bold">
              <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <AlertCircle className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2>11. Filing a Privacy Grievance</h2>
            </div>
            <div className="pl-11 text-xs md:text-sm text-neutral-600 dark:text-neutral-300 space-y-2 leading-relaxed">
              <p>
                If you believe your personal data has been mishandled or your statutory privacy rights have been infringed, you may file a formal complaint:
              </p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Submit a privacy grievance through the &ldquo;Your Data &amp; Privacy&rdquo; hub in Settings or email the Grievance Officer.</li>
                <li>We will acknowledge receipt of your complaint within <strong>48 hours</strong> and issue a unique ticket reference number.</li>
                <li>Our Grievance Redressal Officer will investigate and provide a written resolution within <strong>30 calendar days</strong>.</li>
                <li>If you are unsatisfied with the resolution, you may escalate your grievance to the <strong>Data Protection Board of India</strong> in accordance with DPDP Act regulations.</li>
              </ol>
            </div>
          </section>

          {/* Section 12 */}
          <section id="grievance-contact" className="scroll-mt-24 space-y-3">
            <div className="flex items-center gap-3 text-lg font-bold">
              <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <Phone className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2>12. Designated Grievance Officer</h2>
            </div>
            <div className="pl-11 text-xs md:text-sm text-neutral-600 dark:text-neutral-300 space-y-3 leading-relaxed">
              <p>
                In accordance with the Consumer Protection (E-Commerce) Rules, 2020 and Information Technology Rules, 2021, the designated statutory contact details are:
              </p>
              <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-2 text-xs">
                <div>
                  <span className="font-bold text-neutral-900 dark:text-white">Officer Name:</span>{" "}
                  <span>{BUSINESS_INFO.grievanceOfficer.name}</span>
                </div>
                <div>
                  <span className="font-bold text-neutral-900 dark:text-white">Designation:</span>{" "}
                  <span>{BUSINESS_INFO.grievanceOfficer.designation}</span>
                </div>
                <div>
                  <span className="font-bold text-neutral-900 dark:text-white">Email:</span>{" "}
                  <a href={`mailto:${BUSINESS_INFO.grievanceOfficer.email}`} className="font-semibold underline hover:opacity-80">
                    {BUSINESS_INFO.grievanceOfficer.email}
                  </a>
                </div>
                <div>
                  <span className="font-bold text-neutral-900 dark:text-white">Helpline Phone:</span>{" "}
                  <a href={`tel:${BUSINESS_INFO.grievanceOfficer.phone}`} className="font-semibold underline hover:opacity-80">
                    {BUSINESS_INFO.supportPhoneFormatted}
                  </a>
                </div>
                <div>
                  <span className="font-bold text-neutral-900 dark:text-white">Postal Address:</span>{" "}
                  <span>{BUSINESS_INFO.grievanceOfficer.address}</span>
                </div>
                <div className="pt-1 text-[11px] text-neutral-500">
                  Acknowledgement SLA: {BUSINESS_INFO.grievanceOfficer.acknowledgementSLA} &bull; Redressal SLA: {BUSINESS_INFO.grievanceOfficer.resolutionSLA}
                </div>
              </div>
            </div>
          </section>

          {/* Section 13 */}
          <section id="policy-updates" className="scroll-mt-24 space-y-3">
            <div className="flex items-center gap-3 text-lg font-bold">
              <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <Clock className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2>13. Updates to this Policy</h2>
            </div>
            <div className="pl-11 text-xs md:text-sm text-neutral-600 dark:text-neutral-300 space-y-2 leading-relaxed">
              <p>
                We may revise this Privacy Policy periodically to reflect enhancements in marketplace features or updates in Indian data protection laws. Material changes will be communicated via in-app notifications or email notices at least 15 days before taking effect. Continued use of paYent after the effective date constitutes acceptance of the updated policy.
              </p>
            </div>
          </section>

          {/* Section 14 */}
          <section id="minors-policy" className="scroll-mt-24 space-y-3">
            <div className="flex items-center gap-3 text-lg font-bold">
              <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <AlertCircle className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2>14. Protection of Minors (Under 18)</h2>
            </div>
            <div className="pl-11 text-xs md:text-sm text-neutral-600 dark:text-neutral-300 space-y-2 leading-relaxed">
              <p>
                paYent is an equipment rental marketplace restricted strictly to individuals who are 18 years of age or older and legally capable of entering into binding contracts under the Indian Contract Act, 1872. We do not knowingly collect personal data from minors. If we discover that a user under 18 has registered an account, we will immediately suspend the account and securely purge the associated personal records.
              </p>
            </div>
          </section>
        </div>

        {/* Legacy Anchor for Terms of Service (Redirect / Deep-link preservation) */}
        <section
          id="terms-of-service"
          className="scroll-mt-24 mt-8 bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm space-y-4 text-foreground"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-base md:text-lg font-bold">
              <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-border">
                <FileText className="h-5 w-5 stroke-[1.75]" aria-hidden="true" />
              </div>
              <h2>Terms of Service Notice</h2>
            </div>
            <Link
              to="/terms"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-xs font-bold hover:opacity-90 transition-opacity"
            >
              <span>View Full Terms of Service</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pl-11">
            paYent's complete Terms of Service have been established as an independent dedicated policy governing platform eligibility, Payrent vs Payernt roles, rental bookings, refundable deposits, equipment handover, damage reporting, and dispute resolution. Please visit the dedicated{" "}
            <Link to="/terms" className="font-semibold underline text-foreground">
              Terms of Service page
            </Link>{" "}
            for full details.
          </p>
        </section>
      </div>
    </MainLayout>
  );
}

export default PrivacyPolicy;
