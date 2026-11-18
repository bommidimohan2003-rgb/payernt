import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, Cookie, X, Check, SlidersHorizontal, ArrowRight, Lock } from "lucide-react";
import { BUSINESS_INFO } from "@/config/businessInfo";
import { api } from "@/utils/api";

export interface CookiePreferences {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  version: string;
  timestamp: string;
}

const STORAGE_KEY = "payent:cookie_consent_v1";
const CONSENT_VERSION = "v2026.11";

export function getStoredCookiePreferences(): CookiePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.necessary === "boolean") {
      return parsed as CookiePreferences;
    }
  } catch {
    /* ignore parse errors */
  }
  return null;
}

export function CookieConsentBanner() {
  const [mounted, setMounted] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Preference switches
  const [functional, setFunctional] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
    const existing = getStoredCookiePreferences();
    if (!existing) {
      // Delay display slightly for smooth page load
      const t = setTimeout(() => setShowBanner(true), 1200);
      return () => clearTimeout(t);
    } else {
      setFunctional(existing.functional);
      setAnalytics(existing.analytics);
      setMarketing(existing.marketing);
    }
  }, []);

  // Listen for open requests (e.g. from footer "Cookie Settings" button)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOpenSettings = () => {
      const existing = getStoredCookiePreferences();
      if (existing) {
        setFunctional(existing.functional);
        setAnalytics(existing.analytics);
        setMarketing(existing.marketing);
      }
      setShowModal(true);
      setShowBanner(false);
    };

    window.addEventListener("payent:open_cookie_settings", handleOpenSettings);
    return () => window.removeEventListener("payent:open_cookie_settings", handleOpenSettings);
  }, []);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showModal) {
        setShowModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showModal]);

  const savePreferences = async (prefs: Omit<CookiePreferences, "version" | "timestamp">) => {
    setIsSaving(true);
    const fullPrefs: CookiePreferences = {
      ...prefs,
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fullPrefs));
      window.dispatchEvent(new CustomEvent("payent:consent_changed", { detail: fullPrefs }));

      // Generate or retrieve pseudonymous session identifier
      let sessionId = localStorage.getItem("payent:session_id");
      if (!sessionId) {
        sessionId = `sess_${Math.random().toString(36).substring(2)}${Date.now()}`;
        localStorage.setItem("payent:session_id", sessionId);
      }

      // Sync audit trail to backend
      await api.submitConsent({
        userIdOrSession: sessionId,
        consentType: "COOKIE_PREFERENCES",
        preferences: {
          necessary: fullPrefs.necessary,
          functional: fullPrefs.functional,
          analytics: fullPrefs.analytics,
          marketing: fullPrefs.marketing,
        },
        policyVersion: CONSENT_VERSION,
      }).catch((err) => console.warn("Notice: Consent sync notice:", err));
    } finally {
      setIsSaving(false);
      setShowBanner(false);
      setShowModal(false);
    }
  };

  const handleAcceptAll = () => {
    savePreferences({
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    });
  };

  const handleRejectOptional = () => {
    savePreferences({
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    });
  };

  const handleSaveCustom = () => {
    savePreferences({
      necessary: true,
      functional,
      analytics,
      marketing,
    });
  };

  if (!mounted) return null;

  return (
    <>
      {/* 1. Cookie Preference Notice Banner (Bottom Overlay) */}
      {showBanner && !showModal && (
        <div
          role="region"
          aria-label="Cookie and Privacy Choices"
          className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 md:p-6 pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="max-w-4xl mx-auto rounded-3xl bg-white/95 dark:bg-[#1E1E1E]/95 backdrop-blur-xl border border-neutral-300/80 dark:border-neutral-700/80 p-5 sm:p-6 shadow-2xl pointer-events-auto text-neutral-900 dark:text-white space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white shrink-0 border border-neutral-200 dark:border-neutral-700">
                  <Cookie className="h-4.5 w-4.5 stroke-[1.75]" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold tracking-tight text-neutral-950 dark:text-white font-display">
                    Your Privacy &amp; Cookie Choices
                  </h3>
                  <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400">
                    {BUSINESS_INFO.brandName} respects your privacy rights under India DPDP Act 2023.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed font-normal">
              We use strictly necessary cookies to power core authentication, order security, and payments.
              Optional functional and first-party analytics cookies help us optimize catalog browsing and gear recommendations.
              We never sell your personal data or track you across third-party websites. Read our{" "}
              <Link to="/cookies" className="font-semibold underline text-neutral-950 dark:text-white hover:opacity-80">
                Cookie Policy
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="font-semibold underline text-neutral-950 dark:text-white hover:opacity-80">
                Privacy Policy
              </Link>
              .
            </p>

            {/* Three Equal, Clear Choices (No Deceptive Dark Patterns) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="order-3 sm:order-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-full border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Customize Preferences</span>
              </button>

              <div className="order-1 sm:order-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={handleRejectOptional}
                  className="inline-flex items-center justify-center px-4 py-2.5 min-h-[44px] rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1E1E1E] text-xs font-semibold text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
                >
                  <span>Reject Optional Cookies</span>
                </button>

                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
                >
                  <span>Accept All</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Detailed Preference Modal */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-settings-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-[#1E1E1E] border border-neutral-200 dark:border-neutral-800 shadow-2xl text-neutral-900 dark:text-white overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700">
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
                <div>
                  <h2 id="cookie-settings-title" className="text-base font-bold text-neutral-950 dark:text-white font-display">
                    Cookie &amp; Data Preferences
                  </h2>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Manage how {BUSINESS_INFO.brandName} handles your storage identifiers.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Close cookie settings dialog"
                className="h-9 w-9 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Category Controls List */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
              {/* Category 1: Strictly Necessary */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white text-sm">
                    <Lock className="h-4 w-4 text-neutral-500" aria-hidden="true" />
                    <span>Strictly Necessary</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                    Always Active
                  </span>
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
                  Essential for user session management, authentication tokens, CSRF protection, and Razorpay gateway security. These cookies cannot be turned off.
                </p>
              </div>

              {/* Category 2: Functional / Preferences */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-900 dark:text-white text-sm">
                    Functional &amp; Site Preferences
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="toggle-functional-cookies"
                      checked={functional}
                      onChange={(e) => setFunctional(e.target.checked)}
                      aria-label="Toggle Functional and Site Preferences cookies"
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-neutral-950 dark:peer-focus:ring-white rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-neutral-950 dark:peer-checked:bg-white dark:peer-checked:after:bg-neutral-900" />
                  </label>
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
                  Enables enhanced site features such as preserving your dark/light theme preference, delivery city selection, and language preferences.
                </p>
              </div>

              {/* Category 3: Analytics */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-900 dark:text-white text-sm">
                    First-Party Performance Analytics
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="toggle-analytics-cookies"
                      checked={analytics}
                      onChange={(e) => setAnalytics(e.target.checked)}
                      aria-label="Toggle First-Party Performance Analytics cookies"
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-neutral-950 dark:peer-focus:ring-white rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-neutral-950 dark:peer-checked:bg-white dark:peer-checked:after:bg-neutral-900" />
                  </label>
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
                  Collects anonymous browsing and gear interaction events (e.g. popular categories, similar gear interactions) to improve search discovery. No cross-site tracking.
                </p>
              </div>

              {/* Category 4: Marketing / Advertising */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-900 dark:text-white text-sm">
                    Marketing &amp; Targeted Advertising
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="toggle-marketing-cookies"
                      checked={marketing}
                      onChange={(e) => setMarketing(e.target.checked)}
                      aria-label="Toggle Marketing and Targeted Advertising cookies"
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-neutral-950 dark:peer-focus:ring-white rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-neutral-950 dark:peer-checked:bg-white dark:peer-checked:after:bg-neutral-900" />
                  </label>
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
                  paYent does not currently display third-party advertisements or embed third-party marketing trackers. Kept disabled by default.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 sm:p-5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleRejectOptional}
                className="px-4 py-2 min-h-[44px] rounded-full border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
              >
                <span>Reject All Optional</span>
              </button>

              <button
                type="button"
                onClick={handleSaveCustom}
                disabled={isSaving}
                className="px-5 py-2 min-h-[44px] rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save My Choices"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
