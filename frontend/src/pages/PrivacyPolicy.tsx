import { MainLayout } from "@/layouts/MainLayout";
import { BackButton } from "@/components/common/BackButton";
import { Shield, Eye, Database, Lock, UserCheck } from "lucide-react";

export function PrivacyPolicy() {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-12 md:py-16">
        <BackButton fallback="/" className="mb-6" />
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <Shield className="h-4 w-4" />
            <span>Privacy & Behavioral Data Policy</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight font-display">
            Privacy Policy
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto font-medium">
            At Payent, we respect your privacy and are committed to protecting
            your personal information while providing personalized gear
            recommendations.
          </p>
        </div>

        {/* Policy Content Card */}
        <div className="bg-card border border-border rounded-3xl p-6 md:p-10 shadow-lg space-y-8 text-foreground">
          {/* Section 1 */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 text-lg font-bold">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Eye className="h-5 w-5" />
              </div>
              <h2>1. Information We Collect</h2>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed pl-11 font-normal">
              To operate our peer-to-peer rental marketplace and personalize
              product recommendations, Payent collects:
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
            <div className="flex items-center gap-3 text-lg font-bold">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Database className="h-5 w-5" />
              </div>
              <h2>2. Behavioral Analytics & Recommendation Engine</h2>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed pl-11 font-normal">
              We collect interaction events solely for providing relevant,
              context-aware gear recommendations (such as "Similar Items",
              "Frequently Booked Together", and "Recommended For You").
            </p>
            <div className="bg-secondary/40 border border-border/60 rounded-2xl p-4 ml-11 text-xs text-muted-foreground space-y-2">
              <div className="font-bold text-foreground">
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
            <div className="flex items-center gap-3 text-lg font-bold">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Lock className="h-5 w-5" />
              </div>
              <h2>3. Data Protection & Security</h2>
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
            <div className="flex items-center gap-3 text-lg font-bold">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <UserCheck className="h-5 w-5" />
              </div>
              <h2>4. Your Rights & Choices</h2>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed pl-11 font-normal">
              You may request a copy of your stored rental history or request
              deletion of your account and associated behavioral event data at
              any time by contacting our support team at{" "}
              <span className="font-semibold text-primary">
                payent_support@gmail.com
              </span>
              .
            </p>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
