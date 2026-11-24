import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { MainLayout } from "@/layouts/MainLayout";
import { BackButton } from "@/components/common/BackButton";
import {
  FileText,
  Shield,
  Layers,
  UserCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Scale,
  Key,
  Truck,
  CreditCard,
  Ban,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { BUSINESS_INFO } from "@/config/businessInfo";

export function TermsOfService() {
  useEffect(() => {
    if (typeof window === "undefined" || !window.location.hash) return;
    const id = window.location.hash.replace("#", "");
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const sections = [
    { id: "platform-identity", label: "1. Platform Identity & Intermediary Model" },
    { id: "payrent-payernt", label: "2. Payrent vs. Payernt Roles" },
    { id: "eligibility", label: "3. Eligibility & Account Registration" },
    { id: "kyc-verification", label: "4. KYC & Identity Verification" },
    { id: "lender-duties", label: "5. Lender (Payernt) Responsibilities" },
    { id: "renter-duties", label: "6. Renter (Payrent) Responsibilities" },
    { id: "listing-accuracy", label: "7. Listing Accuracy & Lawful Ownership" },
    { id: "booking-availability", label: "8. Booking Requests & Availability" },
    { id: "pricing-deposits", label: "9. Rental Fees, Deposits & Payments" },
    { id: "pickup-handover", label: "10. Pickup, Delivery & Inspection Protocol" },
    { id: "pin-security", label: "11. Secret Handover PIN & OTP Security" },
    { id: "damage-loss", label: "12. Condition, Damage & Loss Reporting" },
    { id: "cancellations-refunds", label: "13. Cancellations & Disputes" },
    { id: "grievance-handling", label: "14. Support Tickets & Grievance Redressal" },
    { id: "prohibited-activities", label: "15. Prohibited Activities & Misuse" },
    { id: "user-content", label: "16. User Content & Intellectual Property" },
    { id: "suspension-termination", label: "17. Account Suspension & Termination" },
    { id: "liability-disclaimers", label: "18. Limitation of Liability & Disclaimers" },
    { id: "terms-modifications", label: "19. Modifications to Terms" },
    { id: "governing-law", label: "20. Governing Law & Dispute Jurisdiction" },
  ];

  return (
    <MainLayout>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16 text-neutral-900 dark:text-white">
        <div className="flex items-center justify-start mb-6">
          <BackButton fallback="/payent" />
        </div>

        {/* Header */}
        <div className="text-center space-y-3 sm:space-y-4 mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold">
            <Scale className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
            <span>Intermediary Terms of Service &bull; Information Technology Act 2000</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight font-display break-words">
            Terms of Service
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto font-normal">
            Version {BUSINESS_INFO.policyVersion} &bull; Effective Date: {BUSINESS_INFO.policyEffectiveDate} &bull; Last Revised: {BUSINESS_INFO.policyLastUpdated}
          </p>
        </div>

        {/* Table of Contents */}
        <div className="mb-8 sm:mb-10 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-neutral-50 dark:bg-[#1E1E1E] border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">
            Table of Contents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="py-1 text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white hover:underline break-words"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>

        {/* Terms Container */}
        <div
          id="terms-of-service"
          className="scroll-mt-24 bg-white dark:bg-[#1E1E1E] border border-neutral-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-10 shadow-sm space-y-8 sm:space-y-10 text-xs md:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed font-normal"
        >
          {/* Section 1 */}
          <section id="platform-identity" className="scroll-mt-24 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2">
              <span className="text-neutral-400 dark:text-neutral-500">1.</span> Platform Identity &amp; Intermediary Model
            </h2>
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding electronic agreement between you (&ldquo;User&rdquo;, &ldquo;you&rdquo;) and{" "}
              <strong>{BUSINESS_INFO.legalEntityName}</strong> (operating under the brand &ldquo;{BUSINESS_INFO.brandName}&rdquo;).
            </p>
            <p>
              {BUSINESS_INFO.intermediaryStatusNotice} Under Section 79 of the Information Technology Act, 2000, paYent is an intermediary providing digital communication and matching infrastructure. Contracts for rental gear are executed directly between the Lender and the Renter.
            </p>
          </section>

          {/* Section 2 */}
          <section id="payrent-payernt" className="scroll-mt-24 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2">
              <span className="text-neutral-400 dark:text-neutral-500">2.</span> Payrent vs. Payernt Roles
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Payrent (Renter / Customer):</strong> An individual or creator seeking to rent equipment for personal, professional, or commercial shoot use.
              </li>
              <li>
                <strong>Payernt (Lender / Gear Owner):</strong> An equipment owner, production house, or rental studio listing tech gear for temporary custody and rental yield.
              </li>
              <li>
                A single authenticated user may maintain both Payrent and Payernt profiles, subject to the rights and obligations associated with each respective transaction.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section id="eligibility" className="scroll-mt-24 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2">
              <span className="text-neutral-400 dark:text-neutral-500">3.</span> Eligibility &amp; Account Registration
            </h2>
            <p>
              You must be at least 18 years of age and legally competent to contract under the Indian Contract Act, 1872. You agree to provide true, accurate, current, and complete registration information, including your legal name, mobile number, and email. You are solely responsible for maintaining the confidentiality of your account credentials.
            </p>
          </section>

          {/* Section 4 */}
          <section id="kyc-verification" className="scroll-mt-24 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2">
              <span className="text-neutral-400 dark:text-neutral-500">4.</span> KYC &amp; Identity Verification
            </h2>
            <p>
              To protect the community against equipment theft, fraud, and impersonation, mandatory Know-Your-Customer (KYC) identity verification is required before confirmed equipment handover. Renters must upload government identity documents (Aadhaar or PAN) for mask verification. paYent reserves the right to decline or suspend accounts that fail identity verification or submit manipulated documents.
            </p>
          </section>

          {/* Section 5 */}
          <section id="lender-duties" className="scroll-mt-24 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2">
              <span className="text-neutral-400 dark:text-neutral-500">5.</span> Lender (Payernt) Responsibilities
            </h2>
            <p>As a Lender listing equipment, you represent, warrant, and agree that:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You are the lawful owner or authorized custodian of all listed equipment with full right to rent it out.</li>
              <li>The equipment is fully functional, safe to operate, and free of undisclosed structural or sensor defects.</li>
              <li>You will supply all batteries, chargers, cables, and accessories listed in the gear description.</li>
              <li>You will arrive on time for scheduled handover or dispatch through the confirmed courier service.</li>
              <li>You will conduct a prompt return inspection upon receiving gear back.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section id="renter-duties" className="scroll-mt-24 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2">
              <span className="text-neutral-400 dark:text-neutral-500">6.</span> Renter (Payrent) Responsibilities
            </h2>
            <p>As a Renter booking equipment, you represent, warrant, and agree that:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You will handle the equipment with reasonable skill and care, using appropriate protective cases and lens caps.</li>
              <li>You will operate the gear only within legal parameters (e.g. DGCA regulations for drones).</li>
              <li>You will not sub-lease, pawn, pledge, dismantle, repair, or tamper with the equipment.</li>
              <li>You will return the equipment on or before the agreed end time in the same condition as received.</li>
              <li>You are personally liable for damage, loss, theft, or unreasonable wear-and-tear occurring during your custody.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section id="listing-accuracy" className="scroll-mt-24 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2">
              <span className="text-neutral-400 dark:text-neutral-500">7.</span> Listing Accuracy &amp; Lawful Ownership
            </h2>
            <p>
              Lenders must maintain authentic, accurate photos and descriptions. Using misleading stock photography to disguise physical damage or camera sensor scratches is strictly prohibited and constitutes grounds for immediate listing removal and financial compensation to affected renters.
            </p>
          </section>

          {/* Section 8 */}
          <section id="booking-availability" className="scroll-mt-24 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2">
              <span className="text-neutral-400 dark:text-neutral-500">8.</span> Booking Requests &amp; Availability
            </h2>
            <p>
              Booking requests are subject to equipment calendar availability and Lender confirmation. paYent enforces strict concurrency checks and turnaround buffer intervals (default 60 minutes) to prevent double-booking. A booking is confirmed only when the Lender accepts the request and payment authorization is verified.
            </p>
          </section>

          {/* Section 9 */}
          <section id="pricing-deposits" className="scroll-mt-24 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2">
              <span className="text-neutral-400 dark:text-neutral-500">9.</span> Rental Fees, Deposits &amp; Payments
            </h2>
            <p>
              Total payable amounts are presented transparently before booking and consist of:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Rental Fee:</strong> Calculated on daily or half-day rates for the reserved duration.</li>
              <li><strong>Refundable Security Deposit:</strong> Held securely during the rental period to protect against loss or damage.</li>
              <li><strong>Delivery Fee:</strong> Applicable if doorstep courier delivery is selected.</li>
              <li><strong>Applicable Taxes &amp; Platform Fee:</strong> Disclosed prior to slide-to-confirm checkout.</li>
            </ul>
            <p>
              All online payments are processed through Razorpay's PCI-DSS compliant payment gateway. Security deposits are not platform income and are returned to the Renter upon verified equipment return.
            </p>
          </section>

          {/* Section 10 */}
          <section id="pickup-handover" className="scroll-mt-24 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2">
              <span className="text-neutral-400 dark:text-neutral-500">10.</span> Pickup, Delivery &amp; Inspection Protocol
            </h2>
            <p>
              Both parties must inspect the equipment at the time of handover. Renters are granted a <strong>2-hour inspection window</strong> following physical handover to report pre-existing damage, missing accessories, or functional defects with photographic proof. In the absence of an inspection report within 2 hours, the equipment is deemed received in good, working order.
            </p>
          </section>

          {/* Section 11 */}
          <section id="pin-security" className="scroll-mt-24 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2">
              <span className="text-neutral-400 dark:text-neutral-500">11.</span> Secret Handover PIN &amp; OTP Security
            </h2>
            <p>
              paYent utilizes an authoritative 4-digit Secret Handover PIN to verify custody transfer:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The Renter must disclose the Secret Handover PIN to the Lender or courier <strong>only after</strong> physical possession of the equipment is established.</li>
              <li>Entering the Secret PIN confirms rental commencement and releases pre-handover cancellation rights.</li>
              <li>Users must never share account OTPs or handover PINs over phone calls or unverified chat channels.</li>
            </ul>
          </section>

          {/* Section 12 */}
          <section id="damage-loss" className="scroll-mt-24 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2">
              <span className="text-neutral-400 dark:text-neutral-500">12.</span> Condition, Damage &amp; Loss Reporting
            </h2>
            <p>
              In the event of accidental damage during the rental period:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The Renter must immediately notify the Lender and file an incident ticket with paYent support.</li>
              <li>Repair costs will be assessed by an authorized OEM service center (e.g. Sony, Canon, DJI service centers in India).</li>
              <li>Repair costs are deducted first from the refundable security deposit. If the cost of repair or replacement exceeds the deposit, the Renter remains personally liable for the remaining balance.</li>
            </ul>
          </section>

          {/* Section 13 */}
          <section id="cancellations-refunds" className="scroll-mt-24 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2">
              <span className="text-neutral-400 dark:text-neutral-500">13.</span> Cancellations &amp; Disputes
            </h2>
            <p>
              Cancellations and refunds are governed strictly by our dedicated{" "}
              <Link to="/refund-policy" className="font-semibold underline text-neutral-950 dark:text-white">
                Refund &amp; Cancellation Policy
              </Link>
              . Renters may cancel free of penalty before Lender acceptance. Post-acceptance cancellations are subject to turnaround policy rules. Disputes between counterparties are mediated by paYent support using pre-rental handover documentation.
            </p>
          </section>

          {/* Section 14 */}
          <section id="grievance-handling" className="scroll-mt-24 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2">
              <span className="text-neutral-400 dark:text-neutral-500">14.</span> Support Tickets &amp; Grievance Redressal
            </h2>
            <p>
              paYent maintains an integrated support ticketing system accessible via{" "}
              <Link to="/support" className="font-semibold underline text-neutral-950 dark:text-white">
                Contact &amp; Support
              </Link>
              . Formal grievances regarding service deficiency, listing infringement, or user conduct are handled by our designated Grievance Officer in compliance with the Consumer Protection (E-Commerce) Rules, 2020:
            </p>
            <p className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 text-xs">
              <strong>Grievance Officer:</strong> {BUSINESS_INFO.grievanceOfficer.name} &bull; <strong>Email:</strong> {BUSINESS_INFO.grievanceOfficer.email} &bull; <strong>Phone:</strong> {BUSINESS_INFO.supportPhoneFormatted} &bull; <strong>Acknowledgement:</strong> Within 48 hours &bull; <strong>Resolution:</strong> Within 30 days.
            </p>
          </section>

          {/* Section 15 */}
          <section id="prohibited-activities" className="scroll-mt-24 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2">
              <span className="text-neutral-400 dark:text-neutral-500">15.</span> Prohibited Activities &amp; Misuse
            </h2>
            <p>Users shall not:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide false, forged, or altered identity documents during registration or KYC verification.</li>
              <li>Circumvent platform billing or solicit off-platform transactions to evade deposit protection.</li>
              <li>Use rented drones or imaging gear for illegal surveillance, trespass, or prohibited zone operations.</li>
              <li>Upload malicious code, deploy automated scraping scripts, or reverse engineer platform services.</li>
            </ul>
          </section>

          {/* Section 16 */}
          <section id="user-content" className="scroll-mt-24 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2">
              <span className="text-neutral-400 dark:text-neutral-500">16.</span> User Content &amp; Intellectual Property
            </h2>
            <p>
              Users retain ownership of photos and listing text they upload. By uploading content, you grant paYent a worldwide, royalty-free, non-exclusive license to host, display, and format that content strictly for marketplace operation and promotion. You warrant that you hold all copyright permissions for uploaded photographs.
            </p>
          </section>

          {/* Section 17 */}
          <section id="suspension-termination" className="scroll-mt-24 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2">
              <span className="text-neutral-400 dark:text-neutral-500">17.</span> Account Suspension &amp; Termination
            </h2>
            <p>
              paYent reserves the right to suspend or terminate user accounts immediately upon evidence of fraud, repeated late returns, abusive conduct towards platform counterparties, non-payment of verified damage claims, or violation of these Terms.
            </p>
          </section>

          {/* Section 18 */}
          <section id="liability-disclaimers" className="scroll-mt-24 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2">
              <span className="text-neutral-400 dark:text-neutral-500">18.</span> Limitation of Liability &amp; Disclaimers
            </h2>
            <p>
              To the maximum extent permitted by Indian law, paYent operates as an electronic intermediary on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. paYent disclaims all warranties of merchantability, fitness for a particular shoot purpose, or uninterrupted availability. In no event shall paYent&rsquo;s aggregate liability exceed the total platform fees earned by paYent on the transaction giving rise to the claim.
            </p>
          </section>

          {/* Section 19 */}
          <section id="terms-modifications" className="scroll-mt-24 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2">
              <span className="text-neutral-400 dark:text-neutral-500">19.</span> Modifications to Terms
            </h2>
            <p>
              We may update these Terms periodically. Substantive changes will be communicated with at least 15 days notice prior to enforcement. Continued use of paYent after revisions take effect constitutes acceptance of the modified Terms.
            </p>
          </section>

          {/* Section 20 */}
          <section id="governing-law" className="scroll-mt-24 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2">
              <span className="text-neutral-400 dark:text-neutral-500">20.</span> Governing Law &amp; Dispute Jurisdiction
            </h2>
            <p>
              These Terms are governed by and construed in accordance with the <strong>laws of the Republic of India</strong>. Subject to applicable statutory consumer filing provisions under the Consumer Protection Act, 2019, any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the competent courts in India.
            </p>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}

export default TermsOfService;
