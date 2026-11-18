import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  CircleHelp,
  ArrowRight,
} from "lucide-react";
import { MainLayout } from "@/layouts/MainLayout";
import { BackButton } from "@/components/common/BackButton";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/utils/api";
import { cn } from "@/lib/utils";
import { BUSINESS_INFO } from "@/config/businessInfo";

const contactCategories = [
  "Rental Question",
  "Lender Support",
  "Account & Verification",
  "Payment & Refund",
  "Technical Issue",
  "General Inquiry",
];

export default function Contact() {
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState(contactCategories[0]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{
    ticketId: string;
    message: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Pre-fill fields if user is authenticated
  useEffect(() => {
    if (user) {
      if (user.fullName) setName((prev) => prev || user.fullName || "");
      if (user.email) setEmail((prev) => prev || user.email || "");
      if (user.phone) setPhone((prev) => prev || user.phone || "");
    }
  }, [user]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) {
      errs.name = "Please enter your name (minimum 2 characters).";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      errs.email = "Please enter a valid email address.";
    }
    if (!subject.trim() || subject.trim().length < 3) {
      errs.subject = "Subject must be at least 3 characters.";
    }
    if (!message.trim() || message.trim().length < 10) {
      errs.message = "Message must be at least 10 characters.";
    }
    if (!privacyConsent) {
      errs.privacyConsent = "Please acknowledge that you have read the Privacy Policy to proceed.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await api.submitContactForm({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        category,
        subject: subject.trim(),
        message: message.trim(),
      });

      // Audit consent in database under DPDP Act 2023
      if (typeof window !== "undefined") {
        let sessionId = localStorage.getItem("payent:session_id");
        if (!sessionId) {
          sessionId = `sess_${Date.now()}`;
          localStorage.setItem("payent:session_id", sessionId);
        }
        api.submitConsent({
          userIdOrSession: sessionId,
          consentType: "CONTACT_FORM_PRIVACY",
          preferences: {
            privacy_notice_acknowledged: true,
            optional_marketing: marketingConsent,
          },
          userEmail: email.trim().toLowerCase(),
        }).catch(() => {});
      }

      setSuccessData({
        ticketId: res.ticketId || "INQ-CONFIRMED",
        message:
          res.message || "Message sent successfully. We received your message.",
      });

      // Clear non-profile inputs on success
      setSubject("");
      setMessage("");
      setPrivacyConsent(false);
      setMarketingConsent(false);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setSubmitError(
        errorObj.message || "Unable to send your message. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSuccessData(null);
    setSubmitError(null);
    setErrors({});
    if (!user) {
      setName("");
      setEmail("");
      setPhone("");
    }
    setSubject("");
    setMessage("");
  };

  return (
    <MainLayout>
      {/* 1. CONTACT HERO (Section 39) */}
      <section className="relative overflow-hidden bg-neutral-50/70 dark:bg-[#1E1E1E] pt-16 pb-16 sm:pt-20 sm:pb-24 transition-colors duration-300">
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-b from-neutral-200/30 dark:from-[#0B1522] to-transparent rounded-full blur-[140px] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-start mb-4 sm:mb-6">
            <BackButton fallback="/payent" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left: Headline & Introduction */}
            <div className="lg:col-span-7">
              {/* Eyebrow */}
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-[#AAB3BC]">
                  Let's Talk
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-neutral-950 dark:text-white leading-[1.1]">
                Have a question? <br />
                <span className="underline decoration-neutral-400 dark:decoration-neutral-600 underline-offset-8">
                  Let's figure it out.
                </span>
              </h1>

              {/* Supporting Copy */}
              <p className="mt-4 text-sm sm:text-base text-neutral-600 dark:text-[#AAB3BC] leading-relaxed max-w-xl">
                Whether you need help selecting cinema lenses, verifying your lender profile, or resolving booking details, our team is directly reachable.
              </p>

              {/* Verified SLA & Support Hub Link */}
              <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Support Hours: 9:00 AM – 9:00 PM IST</span>
                </div>
                <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Verified Platform Operations</span>
                </div>
              </div>

              {/* Direct Link to FAQ & Support Hub */}
              <div className="mt-5 p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-between gap-3 max-w-xl">
                <div className="flex items-center gap-2.5">
                  <CircleHelp className="w-4 h-4 text-neutral-900 dark:text-white shrink-0" />
                  <span className="text-xs text-neutral-700 dark:text-neutral-300">
                    Need instant equipment troubleshooting or want to track an existing ticket?
                  </span>
                </div>
                <Link
                  to="/support"
                  className="px-3 py-1.5 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold shrink-0 hover:opacity-90 transition-opacity"
                >
                  FAQ &amp; Support Hub
                </Link>
              </div>
            </div>

            {/* Right: Structured Support Categories & Direct Channels Panel */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#1E1E1E]/90 backdrop-blur-xl p-5 sm:p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-sm font-bold text-neutral-950 dark:text-white">
                      Creator Support Hub
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                    LIVE RESPONSE
                  </span>
                </div>

                {/* Support Disciplines */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
                    <div className="text-[11px] font-bold text-neutral-900 dark:text-white">Rental Help</div>
                    <div className="text-[9px] text-neutral-400 mt-0.5">Gear booking & handoff</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
                    <div className="text-[11px] font-bold text-neutral-900 dark:text-white">Listing Help</div>
                    <div className="text-[9px] text-neutral-400 mt-0.5">Lender gear catalog</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
                    <div className="text-[11px] font-bold text-neutral-900 dark:text-white">Account & KYC</div>
                    <div className="text-[9px] text-neutral-400 mt-0.5">Escrow & verification</div>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs pt-1">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-2.5">
                      <Mail className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <div className="font-semibold text-neutral-900 dark:text-white">Direct Email</div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400">{BUSINESS_INFO.supportEmail}</div>
                      </div>
                    </div>
                    <a
                      href={`mailto:${BUSINESS_INFO.supportEmail}`}
                      className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Email Us
                    </a>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <div className="font-semibold text-neutral-900 dark:text-white">Phone Support</div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400">{BUSINESS_INFO.supportPhoneFormatted}</div>
                      </div>
                    </div>
                    <a
                      href={`tel:${BUSINESS_INFO.supportPhonePrimary}`}
                      className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Call
                    </a>
                  </div>
                </div>

                {/* Ticket & Rental Portal Links */}
                <div className="pt-2 border-t border-black/5 dark:border-white/5 flex flex-col gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400 text-[11px]">Submitted support tickets?</span>
                    <Link
                      to="/support"
                      search={{ tab: "requests" }}
                      className="font-bold text-neutral-900 dark:text-white hover:underline flex items-center gap-1"
                    >
                      <span>My Support Tickets</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400 text-[11px]">Direct rental conversations?</span>
                    <Link
                      to="/messages"
                      className="font-bold text-neutral-900 dark:text-white hover:underline flex items-center gap-1"
                    >
                      <span>Track In Messages</span>
                      <Send className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. TWO-COLUMN LAYOUT: CONTACT INFO + FORM (Sections 40-42) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* LEFT: GENUINE CONTACT INFORMATION (Section 41) */}
          <div className="lg:col-span-5 space-y-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                Direct Channels
              </span>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-neutral-950 dark:text-white">
                Get in touch with support
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-neutral-600 dark:text-[#AAB3BC]">
                Our marketplace team is available to assist with bookings,
                equipment inquiries, and lender onboarding.
              </p>
            </div>

            {/* Genuine Channel Cards */}
            <div className="space-y-4">
              {/* Email */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-black/10 dark:border-white/10 shadow-sm flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-primary shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-[#8D98A3]">
                    Official Support Email
                  </div>
                  <a
                    href={`mailto:${BUSINESS_INFO.supportEmail}`}
                    className="mt-1 block text-sm font-bold text-neutral-950 dark:text-white hover:text-primary transition-colors"
                  >
                    {BUSINESS_INFO.supportEmail}
                  </a>
                  <p className="text-[11px] text-neutral-500 dark:text-[#697680] mt-0.5">
                    For general questions, billing, and listing inquiries. Typical response: {BUSINESS_INFO.typicalResponseTime}.
                  </p>
                </div>
              </div>

              {/* Phone */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-black/10 dark:border-white/10 shadow-sm flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-primary shrink-0">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-[#8D98A3]">
                    Support Helpline / WhatsApp
                  </div>
                  <a
                    href={`tel:${BUSINESS_INFO.supportPhonePrimary}`}
                    className="mt-1 block text-sm font-bold text-neutral-950 dark:text-white hover:text-primary transition-colors font-mono"
                  >
                    {BUSINESS_INFO.supportPhoneFormatted}
                  </a>
                  <p className="text-[11px] text-neutral-500 dark:text-[#697680] mt-0.5">
                    Direct coordinator assistance during operating hours ({BUSINESS_INFO.supportHours}).
                  </p>
                </div>
              </div>

              {/* Statutory Grievance Redressal Card */}
              <div className="p-5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 shadow-sm flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Statutory Grievance Redressal
                  </div>
                  <div className="mt-1 text-xs text-neutral-700 dark:text-neutral-300">
                    Under DPDP Act 2023 &amp; IT Rules 2021:
                  </div>
                  <a
                    href={`mailto:${BUSINESS_INFO.grievanceEmail}`}
                    className="mt-0.5 block text-xs font-bold text-neutral-950 dark:text-white hover:underline"
                  >
                    {BUSINESS_INFO.grievanceEmail}
                  </a>
                  <p className="text-[10px] text-neutral-500 dark:text-[#8D98A3] mt-1">
                    Designated Grievance Officer acknowledged within 48h, resolved within 15–30 days.
                  </p>
                </div>
              </div>

              {/* Office / Hub */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-black/10 dark:border-white/10 shadow-sm flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-primary shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-[#8D98A3]">
                    Headquarters
                  </div>
                  <div className="mt-1 text-sm font-bold text-neutral-950 dark:text-white">
                    Visakhapatnam, Andhra Pradesh
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-[#697680] mt-0.5">
                    India — Serving creators and rental hubs nationwide.
                  </p>
                </div>
              </div>

              {/* Operating Hours */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-black/10 dark:border-white/10 shadow-sm flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-primary shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-[#8D98A3]">
                    Support Availability
                  </div>
                  <div className="mt-1 text-sm font-bold text-neutral-950 dark:text-white">
                    Monday – Saturday
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-[#697680] mt-0.5">
                    9:00 AM – 7:00 PM IST
                  </p>
                </div>
              </div>
            </div>

            {/* Helpful Links */}
            <div className="p-5 rounded-2xl bg-neutral-100/60 dark:bg-[#1E1E1E] border border-black/5 dark:border-white/5 space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-[#697680]">
                Looking for something else?
              </span>
              <div className="flex flex-col gap-2 pt-1 text-xs">
                <Link
                  to="/browse"
                  className="font-semibold text-neutral-900 dark:text-white hover:text-primary transition-colors flex items-center justify-between"
                >
                  <span>Explore available gear catalog</span>
                  <span>→</span>
                </Link>
                <Link
                  to="/reviews"
                  className="font-semibold text-neutral-900 dark:text-white hover:text-primary transition-colors flex items-center justify-between"
                >
                  <span>Read community reviews & ratings</span>
                  <span>→</span>
                </Link>
                <Link
                  to="/browse"
                  className="font-semibold text-neutral-900 dark:text-white hover:text-primary transition-colors flex items-center justify-between"
                >
                  <span>Browse marketplace catalog</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          </div>

          {/* RIGHT: INTERACTIVE CONTACT FORM (Sections 42-47) */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-black/10 dark:border-white/10 shadow-xl">
              {/* SUCCESS CONFIRMATION STATE (Section 46) */}
              {successData ? (
                <div className="py-12 px-4 text-center space-y-4">
                  <div className="h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-black text-neutral-950 dark:text-white">
                    Message sent successfully.
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-[#AAB3BC] max-w-md mx-auto">
                    We received your message. Our support team will review your
                    inquiry and get back to you promptly.
                  </p>
                  <div className="inline-block px-3.5 py-1 rounded-full bg-black/5 dark:bg-white/10 text-xs font-mono font-semibold text-neutral-700 dark:text-[#C5CCD3]">
                    Ticket ID: {successData.ticketId}
                  </div>
                  <div className="pt-6 flex flex-wrap items-center justify-center gap-3">
                    <Link
                      to="/support"
                      search={{ tab: "requests", id: successData.ticketId }}
                      className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[#161616] text-white dark:bg-[#F2F0EA] dark:text-[#0A0A0A] text-xs font-bold transition-colors shadow-md cursor-pointer"
                    >
                      <span>Track In My Support Tickets</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="px-6 py-2.5 rounded-full border border-black/15 dark:border-white/15 text-neutral-800 dark:text-neutral-200 text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      Send Another Message
                    </button>
                  </div>
                </div>
              ) : (
                /* CONTACT FORM (Section 42) */
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <h3 className="text-lg font-black text-neutral-950 dark:text-white">
                      Send us an inquiry
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-[#8D98A3] mt-1">
                      Fill out the form below and we'll route your ticket to the
                      right department.
                    </p>
                  </div>

                  {/* Submission Error Banner (Section 47) */}
                  {submitError && (
                    <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">
                          Unable to send your message.
                        </span>
                        <p className="mt-0.5">{submitError}</p>
                      </div>
                    </div>
                  )}

                  {/* Name and Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact-name" className="block text-xs font-bold text-neutral-800 dark:text-[#C5CCD3] mb-1.5">
                        Your Full Name <span className="text-primary">*</span>
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (errors.name)
                            setErrors((prev) => ({ ...prev, name: "" }));
                        }}
                        placeholder="Your full name"
                        aria-required="true"
                        aria-invalid={errors.name ? "true" : "false"}
                        className={cn(
                          "w-full px-3.5 py-2.5 rounded-xl border bg-transparent text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-[#697680] focus:outline-none focus:ring-1 focus:ring-primary",
                          errors.name
                            ? "border-red-500"
                            : "border-black/15 dark:border-white/15 focus:border-primary",
                        )}
                      />
                      {errors.name && (
                        <p className="text-[11px] text-red-500 mt-1">
                          {errors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="contact-email" className="block text-xs font-bold text-neutral-800 dark:text-[#C5CCD3] mb-1.5">
                        Email Address <span className="text-primary">*</span>
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errors.email)
                            setErrors((prev) => ({ ...prev, email: "" }));
                        }}
                        placeholder="you@example.com"
                        aria-required="true"
                        aria-invalid={errors.email ? "true" : "false"}
                        className={cn(
                          "w-full px-3.5 py-2.5 rounded-xl border bg-transparent text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-[#697680] focus:outline-none focus:ring-1 focus:ring-primary",
                          errors.email
                            ? "border-red-500"
                            : "border-black/15 dark:border-white/15 focus:border-primary",
                        )}
                      />
                      {errors.email && (
                        <p className="text-[11px] text-red-500 mt-1">
                          {errors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Phone (Optional) & Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact-phone" className="block text-xs font-bold text-neutral-800 dark:text-[#C5CCD3] mb-1.5">
                        Phone Number{" "}
                        <span className="text-neutral-400 font-normal">
                          (Optional)
                        </span>
                      </label>
                      <input
                        id="contact-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 dark:border-white/15 bg-transparent text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-[#697680] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono"
                      />
                    </div>

                    <div>
                      <label htmlFor="contact-category" className="block text-xs font-bold text-neutral-800 dark:text-[#C5CCD3] mb-1.5">
                        Inquiry Category
                      </label>
                      <select
                        id="contact-category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 dark:border-white/15 bg-white dark:bg-[#1E1E1E] text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer"
                      >
                        {contactCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Subject Line */}
                  <div>
                    <label htmlFor="contact-subject" className="block text-xs font-bold text-neutral-800 dark:text-[#C5CCD3] mb-1.5">
                      Subject <span className="text-primary">*</span>
                    </label>
                    <input
                      id="contact-subject"
                      type="text"
                      value={subject}
                      onChange={(e) => {
                        setSubject(e.target.value);
                        if (errors.subject)
                          setErrors((prev) => ({ ...prev, subject: "" }));
                      }}
                      placeholder="e.g. Question regarding camera gear package in Vizag"
                      aria-required="true"
                      aria-invalid={errors.subject ? "true" : "false"}
                      className={cn(
                        "w-full px-3.5 py-2.5 rounded-xl border bg-transparent text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-[#697680] focus:outline-none focus:ring-1 focus:ring-primary",
                        errors.subject
                          ? "border-red-500"
                          : "border-black/15 dark:border-white/15 focus:border-primary",
                      )}
                    />
                    {errors.subject && (
                      <p className="text-[11px] text-red-500 mt-1">
                        {errors.subject}
                      </p>
                    )}
                  </div>

                  {/* Message Body */}
                  <div>
                    <label htmlFor="contact-message" className="block text-xs font-bold text-neutral-800 dark:text-[#C5CCD3] mb-1.5">
                      Message <span className="text-primary">*</span>
                    </label>
                    <textarea
                      id="contact-message"
                      rows={5}
                      value={message}
                      onChange={(e) => {
                        setMessage(e.target.value);
                        if (errors.message)
                          setErrors((prev) => ({ ...prev, message: "" }));
                      }}
                      placeholder="Please describe your inquiry, rental dates, specific camera mount, or question in detail..."
                      aria-required="true"
                      aria-invalid={errors.message ? "true" : "false"}
                      className={cn(
                        "w-full px-3.5 py-2.5 rounded-xl border bg-transparent text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-[#697680] focus:outline-none focus:ring-1 focus:ring-primary resize-none leading-relaxed",
                        errors.message
                          ? "border-red-500"
                          : "border-black/15 dark:border-white/15 focus:border-primary",
                      )}
                    />
                    {errors.message && (
                      <p className="text-[11px] text-red-500 mt-1">
                        {errors.message}
                      </p>
                    )}
                  </div>

                  {/* Privacy Notice & Consent Checkboxes (Requirement 5B & DPDP Act 2023) */}
                  <div className="space-y-3 pt-2 pb-1 border-t border-black/5 dark:border-white/5">
                    <div className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      We collect your name, email, phone (optional), and inquiry details solely to route and respond to your support request, retained according to our{" "}
                      <Link to="/privacy" className="font-semibold text-primary underline">
                        Privacy Policy
                      </Link>
                      . We never sell your personal data.
                    </div>

                    {/* Mandatory Affirmative Consent Checkbox (Unchecked by default) */}
                    <div>
                      <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none">
                        <input
                          id="contact-privacy-consent"
                          type="checkbox"
                          checked={privacyConsent}
                          onChange={(e) => {
                            setPrivacyConsent(e.target.checked);
                            if (errors.privacyConsent) {
                              setErrors((prev) => ({ ...prev, privacyConsent: "" }));
                            }
                          }}
                          className="mt-0.5 h-4 w-4 rounded border-black/20 dark:border-white/20 text-neutral-900 focus:ring-primary cursor-pointer accent-neutral-950 dark:accent-white"
                        />
                        <span className="text-neutral-700 dark:text-neutral-300">
                          I agree that paYent may process my inquiry information in accordance with the{" "}
                          <Link to="/privacy" className="font-semibold text-primary underline">
                            Privacy Policy
                          </Link>{" "}
                          and{" "}
                          <Link to="/terms" className="font-semibold text-primary underline">
                            Terms of Service
                          </Link>
                          . <span className="text-primary">*</span>
                        </span>
                      </label>
                      {errors.privacyConsent && (
                        <p className="text-[11px] text-red-500 mt-1 ml-6.5">
                          {errors.privacyConsent}
                        </p>
                      )}
                    </div>

                    {/* Optional Marketing Updates (Unchecked by default - no dark pattern) */}
                    <div>
                      <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none">
                        <input
                          id="contact-marketing-consent"
                          type="checkbox"
                          checked={marketingConsent}
                          onChange={(e) => setMarketingConsent(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-black/20 dark:border-white/20 text-neutral-900 focus:ring-primary cursor-pointer accent-neutral-950 dark:accent-white"
                        />
                        <span className="text-neutral-600 dark:text-neutral-400">
                          (Optional) Keep me updated with periodic gear rental guides and community announcements. You may unsubscribe anytime.
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Submit Button (Neutral Button System) */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full sm:w-auto h-12 px-8 rounded-full bg-[#161616] text-[#FFFFFF] hover:bg-[#292929] active:bg-[#0B0B0B] dark:bg-[#F2F0EA] dark:text-[#0A0A0A] dark:hover:bg-[#FFFFFF] dark:active:bg-[#DCD9D1] text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Sending Message...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Message</span>
                          <Send className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
