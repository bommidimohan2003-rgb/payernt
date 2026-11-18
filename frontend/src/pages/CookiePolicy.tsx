import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { MainLayout } from "@/layouts/MainLayout";
import { BackButton } from "@/components/common/BackButton";
import {
  Cookie,
  ShieldCheck,
  Lock,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Database,
  Layers,
} from "lucide-react";
import { BUSINESS_INFO } from "@/config/businessInfo";

export function CookiePolicy() {
  const openCookiePreferences = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("payent:open_cookie_settings"));
    }
  };

  const storageItems = [
    {
      key: "payent:token & payent:refreshToken",
      provider: "paYent (First-Party)",
      purpose: "Stores cryptographically signed JWT auth tokens for session authentication.",
      category: "Strictly Necessary",
      retention: "Session / 30 Days",
      consentNeeded: "No (Core Functionality)",
    },
    {
      key: "payent:currentUser",
      provider: "paYent (First-Party)",
      purpose: "Caches authenticated account profile details (name, email, role) to prevent redundant API roundtrips.",
      category: "Strictly Necessary",
      retention: "Until Logout",
      consentNeeded: "No (Core Functionality)",
    },
    {
      key: "payent:cookie_consent_v1",
      provider: "paYent (First-Party)",
      purpose: "Records your explicit cookie choices, consent version, and timestamp under DPDP Act 2023.",
      category: "Strictly Necessary",
      retention: "1 Year or Until Cleared",
      consentNeeded: "No (Regulatory Compliance)",
    },
    {
      key: "payent:cart & payent:wishlist",
      provider: "paYent (First-Party)",
      purpose: "Persists selected rental gear packages and shoot wishlists across page reloads.",
      category: "Strictly Necessary",
      retention: "Persistent until checkout",
      consentNeeded: "No (Core Marketplace)",
    },
    {
      key: "payent:theme",
      provider: "paYent (First-Party)",
      purpose: "Remembers your monochrome theme selection (dark vs. light mode).",
      category: "Functional",
      retention: "Persistent",
      consentNeeded: "Yes (Optional Preference)",
    },
    {
      key: "payent:user_location & auto_detected",
      provider: "paYent (First-Party)",
      purpose: "Stores preferred equipment delivery city or geocoded hub for local gear availability.",
      category: "Functional",
      retention: "Persistent until changed",
      consentNeeded: "Yes (Optional Preference)",
    },
    {
      key: "payent_setting_booking_alerts",
      provider: "paYent (First-Party)",
      purpose: "Remembers notification sound and alert toggles for real-time booking updates.",
      category: "Functional",
      retention: "Persistent",
      consentNeeded: "Yes (Optional Preference)",
    },
    {
      key: "First-Party Event Logging (user_events)",
      provider: "paYent (First-Party Database)",
      purpose: "Analyzes equipment views and search terms to display compatible gear recommendations.",
      category: "Analytics",
      retention: "Aggregated / Anonymized",
      consentNeeded: "Yes (Optional Analytics)",
    },
    {
      key: "Razorpay Checkout Cookies",
      provider: "Razorpay Software Pvt Ltd",
      purpose: "Loaded only when opening checkout modal for fraud prevention and PCI-DSS payment tokenization.",
      category: "Strictly Necessary (Payment)",
      retention: "Payment Session",
      consentNeeded: "No (Contractual Payment)",
    },
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
            <Cookie className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
            <span>Digital Personal Data Protection Act 2023 &bull; Cookie Transparency</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight font-display">
            Cookie Policy
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto font-normal">
            Version {BUSINESS_INFO.policyVersion} &bull; Effective Date: {BUSINESS_INFO.policyEffectiveDate}
          </p>
        </div>

        {/* Preference Action Banner */}
        <div className="mb-10 p-5 sm:p-6 rounded-3xl bg-neutral-50 dark:bg-[#1E1E1E] border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm sm:text-base font-bold text-neutral-950 dark:text-white">
              Want to adjust your active cookie choices?
            </h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              You can accept all, reject optional categories, or customize preferences anytime.
            </p>
          </div>
          <button
            type="button"
            onClick={openCookiePreferences}
            className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-xs font-bold hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Open Cookie Settings</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="bg-white dark:bg-[#1E1E1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 md:p-10 shadow-sm space-y-8 text-xs md:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed font-normal">
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white">
              1. What Are Cookies and Local Storage?
            </h2>
            <p>
              Cookies are small text files placed on your browser or device when you visit websites. In modern web applications like paYent, browser storage APIs (&ldquo;localStorage&rdquo; and &ldquo;sessionStorage&rdquo;) are also used to store necessary session identifiers and user preferences locally on your device to ensure fast, responsive browsing without repeated server roundtrips.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white">
              2. How paYent Uses Cookies &amp; Storage
            </h2>
            <p>
              We classify our browser storage mechanisms into four distinct categories:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Strictly Necessary:</strong> Required for fundamental marketplace operation, user authentication, cart management, and payment verification. These cannot be disabled.
              </li>
              <li>
                <strong>Functional &amp; Preferences:</strong> Remember your choices such as theme mode (dark vs. light), preferred delivery city, and language setting.
              </li>
              <li>
                <strong>First-Party Performance Analytics:</strong> Help us understand which equipment categories are most popular so we can optimize search ranking and gear recommendations. This data is pseudonymous and never shared with advertising brokers.
              </li>
              <li>
                <strong>Marketing &amp; Advertising:</strong> paYent <em>does not</em> deploy third-party advertising cookies, retargeting pixels (e.g. Meta Pixel, TikTok Pixel), or behavioral advertising trackers.
              </li>
            </ul>
          </section>

          {/* Complete Technical Register Table */}
          <section className="space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white">
              3. Complete Register of Storage Identifiers
            </h2>
            <p>
              The following table discloses every active cookie and browser storage key utilized across the paYent platform:
            </p>

            <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white font-bold">
                  <tr>
                    <th className="py-3 px-3">Storage Key / Cookie</th>
                    <th className="py-3 px-3">Provider</th>
                    <th className="py-3 px-3">Purpose</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Retention</th>
                    <th className="py-3 px-3">Consent Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                  {storageItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                      <td className="py-2.5 px-3 font-mono font-semibold text-neutral-950 dark:text-white">
                        {item.key}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600 dark:text-neutral-400">
                        {item.provider}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-700 dark:text-neutral-300">
                        {item.purpose}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-full font-bold text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600 dark:text-neutral-400">
                        {item.retention}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600 dark:text-neutral-400">
                        {item.consentNeeded}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white">
              4. Managing &amp; Disabling Cookies
            </h2>
            <p>
              You can manage your preferences through our on-site cookie manager at any time by clicking the &ldquo;Open Cookie Settings&rdquo; button above or the &ldquo;Cookie Settings&rdquo; link in the footer.
            </p>
            <p>
              Additionally, all modern web browsers allow you to modify cookie and local storage settings in your browser configuration (Settings &rarr; Privacy &amp; Security &rarr; Cookies and Site Data). If you block all storage, certain features such as persistent login, cart management, and online checkout will not function.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white">
              5. Questions Regarding This Policy
            </h2>
            <p>
              If you have any questions regarding our use of cookies or wish to exercise your data principal rights under the Digital Personal Data Protection Act, 2023, please contact our Grievance Officer at{" "}
              <a href={`mailto:${BUSINESS_INFO.grievanceOfficer.email}`} className="font-semibold underline text-neutral-950 dark:text-white">
                {BUSINESS_INFO.grievanceOfficer.email}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}

export default CookiePolicy;
