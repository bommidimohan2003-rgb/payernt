import { useEffect } from "react";
import { MainLayout } from "@/layouts/MainLayout";
import { BackButton } from "@/components/common/BackButton";
import { Shield, Eye, Database, Lock, UserCheck, FileText } from "lucide-react";

export function PrivacyPolicy() {
  useEffect(() => {
    if (typeof window === "undefined" || !window.location.hash) return;
    const id = window.location.hash.replace("#", "");
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-12 md:py-16">
        <BackButton fallback="/" className="mb-6" />
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 text-xs font-medium">
            <Shield className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
            <span>Privacy, Behavioral Data &amp; Service Terms</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight font-display">
            Privacy Policy &amp; Terms of Service
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto font-medium">
            At paYent, we respect your privacy, protect your personal
            information, and maintain clear marketplace terms for renters and lenders.
          </p>
        </div>

        {/* Privacy Policy Card */}
        <div
          id="privacy-policy"
          className="scroll-mt-24 bg-card border border-border rounded-3xl p-6 md:p-10 shadow-sm space-y-8 text-foreground"
        >
          {/* Section 1 */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-border">
                <Eye className="h-5 w-5 stroke-[1.75]" aria-hidden="true" />
              </div>
              <h2>1. Information We Collect</h2>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed pl-11 font-normal">
              To operate our peer-to-peer rental marketplace and personalize
              product recommendations, paYent collects:
            </p>
            <ul className="list-disc pl-16 text-xs md:text-sm text-muted-foreground space-y-1 font-normal">
              <li>
                Account details (name, email address, phone number, address)
                provided during registration.
              </li>
              <li>
                Transaction data (rental history, order timestamps, payment
                verification tokens).
              </li>
              <li>
                First-party behavioral analytics data (product detail views,
                category browsing, search terms, cart additions, and
                recommendation interactions).
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-3 pt-4">
            <div className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-border">
                <Database className="h-5 w-5 stroke-[1.75]" aria-hidden="true" />
              </div>
              <h2>2. Behavioral Analytics &amp; Recommendation Engine</h2>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed pl-11 font-normal">
              We collect interaction events solely for providing relevant,
              context-aware gear recommendations (such as "Similar Items",
              "Frequently Booked Together", and "Recommended For You").
            </p>
            <div className="bg-secondary/40 border border-border/60 rounded-2xl p-4 ml-11 text-xs text-muted-foreground space-y-2">
              <div className="font-semibold text-foreground">
                Our Recommendation Privacy Guarantee:
              </div>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>No Keystroke Tracking:</strong> We do not log
                  individual keystrokes or unsubmitted form text.
                </li>
                <li>
                  <strong>No Cross-Site Tracking:</strong> We do not track your
                  activity on third-party websites or sell behavioral profiles.
                </li>
                <li>
                  <strong>Anonymous Session Identifiers:</strong> For logged-out
                  users, interaction signals are tied only to a pseudonymous
                  browser session ID.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3 pt-4">
            <div className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-border">
                <Lock className="h-5 w-5 stroke-[1.75]" aria-hidden="true" />
              </div>
              <h2>3. Data Protection &amp; Security</h2>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed pl-11 font-normal">
              All personal and behavioral event data is transmitted via TLS
              encryption and stored securely in indexed databases with
              role-based access control. Rental coverage verification and
              payments are processed via verified PCI-DSS compliant providers
              (e.g. Razorpay).
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3 pt-4">
            <div className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-border">
                <UserCheck className="h-5 w-5 stroke-[1.75]" aria-hidden="true" />
              </div>
              <h2>4. Your Rights &amp; Choices</h2>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed pl-11 font-normal">
              You may request a copy of your stored rental history or request
              deletion of your account and associated behavioral event data at
              any time by contacting our support team at{" "}
              <a
                href="mailto:support@payent.com"
                className="font-semibold text-neutral-950 dark:text-white underline hover:opacity-80"
              >
                support@payent.com
              </a>
              .
            </p>
          </section>
        </div>

        {/* Dedicated Terms of Service Section */}
        <section
          id="terms-of-service"
          className="scroll-mt-24 mt-8 bg-card border border-border rounded-3xl p-6 md:p-10 shadow-sm space-y-6 text-foreground"
        >
          <div className="flex items-center gap-3 text-xl font-semibold border-b border-border pb-4">
            <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-border">
              <FileText className="h-5 w-5 stroke-[1.75]" aria-hidden="true" />
            </div>
            <h2>Terms of Service</h2>
          </div>

          <div className="space-y-5 text-xs md:text-sm text-muted-foreground leading-relaxed">
            <div>
              <h3 className="text-sm md:text-base font-semibold text-foreground mb-1">
                1. Eligibility &amp; Verified Accounts
              </h3>
              <p>
                Both renters and gear owners must maintain verified paYent accounts
                and complete identity verification prior to confirmed handover.
                Account credentials and Secret Handover PINs are personal and must
                never be shared with unauthorized parties.
              </p>
            </div>
            <div>
              <h3 className="text-sm md:text-base font-semibold text-foreground mb-1">
                2. Booking Obligations &amp; Escrow Protection
              </h3>
              <p>
                Rental fees and refundable security deposits are held securely in
                paYent Escrow until scheduled handover and safe return confirmation.
                Equipment must be returned on time and in the condition documented at
                pickup or delivery.
              </p>
            </div>
            <div>
              <h3 className="text-sm md:text-base font-semibold text-foreground mb-1">
                3. Liability &amp; Platform Rules
              </h3>
              <p>
                Renters are responsible for careful operation within legal boundaries.
                Any pre-existing defects should be recorded within 2 hours of handover.
                Disputes are adjudicated using pre-rental and return verification logs.
              </p>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
