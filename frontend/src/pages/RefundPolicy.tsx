import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { MainLayout } from "@/layouts/MainLayout";
import { BackButton } from "@/components/common/BackButton";
import {
  RotateCcw,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CreditCard,
  FileCheck,
  Scale,
  Ban,
  HelpCircle,
} from "lucide-react";
import { BUSINESS_INFO } from "@/config/businessInfo";

export function RefundPolicy() {
  useEffect(() => {
    if (typeof window === "undefined" || !window.location.hash) return;
    const id = window.location.hash.replace("#", "");
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const customerScenarios = [
    {
      scenario: "Renter cancels while booking is pending",
      whoCanCancel: "Renter",
      eligibility: "100% Full Refund",
      deductions: "None (₹0)",
      timeline: "Immediate authorization void / 5–7 banking days via UPI or card",
    },
    {
      scenario: "Renter cancels > 24 hours before scheduled handover",
      whoCanCancel: "Renter",
      eligibility: "100% Full Refund (Deposit + Rental Fee)",
      deductions: "Payment gateway processing fee only if non-refundable by bank",
      timeline: "Initiated within 24 hours; 5–7 banking days to credit account",
    },
    {
      scenario: "Renter late cancellation (< 12 hours before handover)",
      whoCanCancel: "Renter",
      eligibility: "Deposit 100% refunded; partial rental compensation",
      deductions: "Up to 50% of 1st-day rental rate retained to compensate reserved gear lock",
      timeline: "Deposit released immediately; remaining rental balance in 5–7 banking days",
    },
    {
      scenario: "Cancellation after physical handover / PIN verification",
      whoCanCancel: "Renter / Lender",
      eligibility: "Pro-rata rental refund upon safe gear return",
      deductions: "Elapsed rental time + damage assessment if any",
      timeline: "Processed immediately following lender return inspection",
    },
    {
      scenario: "Lender rejects booking request or cancels accepted booking",
      whoCanCancel: "Lender / Admin",
      eligibility: "100% Full Refund to Renter",
      deductions: "None (₹0) — platform penalty assessed to lender",
      timeline: "Initiated immediately via Razorpay; 5–7 banking days",
    },
    {
      scenario: "Lender no-show / gear unavailable at handover",
      whoCanCancel: "Renter / Support",
      eligibility: "100% Full Refund + emergency re-booking assistance",
      deductions: "None (₹0)",
      timeline: "Initiated upon customer support verification",
    },
    {
      scenario: "Defective equipment or unlisted damage reported within 2 hours",
      whoCanCancel: "Renter",
      eligibility: "100% Full Refund or replacement equipment dispatch",
      deductions: "None (₹0)",
      timeline: "Billing paused immediately; refunded upon gear return",
    },
    {
      scenario: "Rental completed safely & gear returned intact",
      whoCanCancel: "Automatic",
      eligibility: "100% Security Deposit Release",
      deductions: "None (provided zero damage and on-time return)",
      timeline: "Released upon return check-in; 5–7 banking days to reflect in account",
    },
    {
      scenario: "Duplicate payment debit or banking gateway error",
      whoCanCancel: "Automatic / Support",
      eligibility: "100% Full Refund of duplicate debit",
      deductions: "None (₹0)",
      timeline: "Reconciled with banking network; credited within 5–7 banking days",
    },
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
            <RotateCcw className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
            <span>Consumer Protection (E-Commerce) Rules 2020 Compliant</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight font-display break-words">
            Refund &amp; Cancellation Policy
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto font-normal">
            Version {BUSINESS_INFO.policyVersion} &bull; Effective Date: {BUSINESS_INFO.policyEffectiveDate} &bull; Consumer Protection (E-Commerce) Rules 2020 Compliant
          </p>
        </div>

        {/* Core Principles Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 mb-8 sm:mb-10">
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-neutral-50 dark:bg-[#1E1E1E] border border-neutral-200 dark:border-neutral-800 space-y-2">
            <div className="h-8 w-8 rounded-xl bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <h3 className="font-bold text-sm text-neutral-950 dark:text-white">Separate Deposit &amp; Fees</h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Refundable security deposits are held separately from rental earnings and are released in full upon safe gear return.
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-neutral-50 dark:bg-[#1E1E1E] border border-neutral-200 dark:border-neutral-800 space-y-2">
            <div className="h-8 w-8 rounded-xl bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white">
              <Clock className="h-4 w-4" />
            </div>
            <h3 className="font-bold text-sm text-neutral-950 dark:text-white">Authentic Banking Timelines</h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Refunds are initiated via Razorpay within 24 hours. Banking networks (UPI/IMPS/NEFT/Card) credit original payment accounts within 5–7 banking days.
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-neutral-50 dark:bg-[#1E1E1E] border border-neutral-200 dark:border-neutral-800 space-y-2">
            <div className="h-8 w-8 rounded-xl bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white">
              <FileCheck className="h-4 w-4" />
            </div>
            <h3 className="font-bold text-sm text-neutral-950 dark:text-white">2-Hour Defect Protection</h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Equipment received with functional flaws or missing parts qualifies for 100% refund when reported with photos within 2 hours of handover.
            </p>
          </div>
        </div>

        {/* Policy Body */}
        <div className="bg-white dark:bg-[#1E1E1E] border border-neutral-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-10 shadow-sm space-y-8 sm:space-y-10 text-xs md:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed font-normal">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white">
              1. Detailed Cancellation Rules
            </h2>
            <div className="space-y-2">
              <p>
                <strong>A. Cancellation by Renter Before Acceptance:</strong> If you cancel a rental request while it is still in &ldquo;pending&rdquo; status awaiting Lender confirmation, authorization is voided immediately and no charges are debited.
              </p>
              <p>
                <strong>B. Cancellation by Renter After Acceptance (&gt; 24h before start):</strong> If cancelled more than 24 hours prior to scheduled rental commencement, you receive a full refund of your rental fee and refundable deposit, less any non-refundable payment gateway processing fees actually incurred.
              </p>
              <p>
                <strong>C. Late Cancellation (&lt; 12h before start):</strong> Cancelling less than 12 hours before scheduled handover locks the lender&rsquo;s gear calendar. A cancellation fee of up to 50% of the first day rental rate may be deducted to compensate the lender for lost bookings. The security deposit is refunded 100%.
              </p>
              <p>
                <strong>D. Post-Handover Cancellation:</strong> Once the Secret Handover PIN has been entered and equipment is in your custody, cancellation requires physical gear return to the lender first. A pro-rata refund will be computed after authorized return inspection.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white">
              2. Lender Non-Performance &amp; Equipment Issues
            </h2>
            <div className="space-y-2">
              <p>
                <strong>A. Cancellation by Lender:</strong> If a Lender cancels a confirmed booking, the Renter receives an immediate 100% refund of all fees and deposits. Platform penalties may be applied to the Lender.
              </p>
              <p>
                <strong>B. Lender No-Show / Gear Unavailable:</strong> If the Lender fails to appear for scheduled handover, notify support immediately. A 100% refund is issued upon verification.
              </p>
              <p>
                <strong>C. Defective Equipment or Missing Parts:</strong> If delivered gear has unlisted defects, scratches on camera sensors, or missing accessories, submit photographic evidence within <strong>2 hours</strong> of handover via Contact &amp; Support. paYent will pause the billing clock and arrange replacement gear or issue a 100% refund.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white">
              3. Refundable Security Deposit Release
            </h2>
            <p>
              Refundable security deposits are collected to protect equipment against damage, loss, or unauthorized holding:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Upon completion of the rental, the Lender or courier verifies physical return and checks equipment condition.</li>
              <li>Once return inspection is completed in the system, deposit release is initiated automatically via Razorpay API.</li>
              <li>Refund credits reflect in your original payment source (UPI account, bank account, or credit card) within <strong>5 to 7 banking days</strong> in accordance with Reserve Bank of India banking clearing cycles.</li>
              <li>In the event of accidental damage, deductions are made strictly on the basis of authorized service center repair estimates.</li>
            </ul>
          </section>

          {/* Section 4: Customer-Friendly Scenario Overview */}
          <section className="space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white">
              4. Summary of Refund &amp; Cancellation Scenarios
            </h2>
            <p>
              The following overview outlines your cancellation eligibility and refund entitlement across typical marketplace rental situations:
            </p>

            <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 -mx-1 sm:mx-0">
              <table className="w-full min-w-[650px] text-left border-collapse text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white font-bold">
                  <tr>
                    <th className="py-3 px-3">Rental Scenario</th>
                    <th className="py-3 px-3">Who Can Cancel</th>
                    <th className="py-3 px-3">Refund Eligibility</th>
                    <th className="py-3 px-3">Deductions (if any)</th>
                    <th className="py-3 px-3">Typical Bank Crediting Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                  {customerScenarios.map((row, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                      <td className="py-2.5 px-3 font-semibold text-neutral-950 dark:text-white">
                        {row.scenario}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-700 dark:text-neutral-300">
                        {row.whoCanCancel}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-800 dark:text-neutral-200">
                        {row.eligibility}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600 dark:text-neutral-400">
                        {row.deductions}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600 dark:text-neutral-400">
                        {row.timeline}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white">
              5. How to File a Refund or Dispute Request
            </h2>
            <p>
              To initiate a refund request or dispute an unauthorized deduction:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>
                Open{" "}
                <Link to="/orders" className="font-semibold underline text-neutral-950 dark:text-white">
                  Rental Orders
                </Link>{" "}
                and select the specific booking.
              </li>
              <li>Click &ldquo;Report an Issue&rdquo; or cancel the booking if eligible.</li>
              <li>Provide clear photographs, serial numbers, and incident descriptions.</li>
              <li>Our billing team will review the ticket and initiate payment adjustments within 24 business hours.</li>
            </ol>
            <p className="pt-2 text-xs text-neutral-500">
              For escalated billing inquiries, email our billing support desk directly at{" "}
              <a href={`mailto:${BUSINESS_INFO.supportEmail}`} className="font-semibold underline text-neutral-950 dark:text-white">
                {BUSINESS_INFO.supportEmail}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}

export default RefundPolicy;
