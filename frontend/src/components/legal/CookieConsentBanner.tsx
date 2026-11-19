import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, Cookie, X, SlidersHorizontal, Lock, BarChart3, Sparkles } from "lucide-react";
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
          <div className="max-w-3xl mx-auto rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-[#1E1E1E]/95 backdrop-blur-xl border border-neutral-300/80 dark:border-neutral-700/80 p-4 sm:p-5 shadow-2xl pointer-events-auto text-neutral-900 dark:text-white space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white shrink-0 border border-neutral-200 dark:border-neutral-700">
                  <Cookie className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
                </div>
                <h3 className="text-sm sm:text-base font-bold tracking-tight text-neutral-950 dark:text-white font-display">
                  Your Privacy &amp; Cookie Choices
                </h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed font-normal">
              We use essential cookies for secure sign-in and orders. Optional cookies help improve search and recommendations. You can adjust your choices anytime. Learn more in our{" "}
              <Link to="/cookies" className="font-semibold underline text-neutral-950 dark:text-white hover:opacity-80">
                Cookie Policy
              </Link>{" "}
              &amp;{" "}
              <Link to="/privacy" className="font-semibold underline text-neutral-950 dark:text-white hover:opacity-80">
                Privacy Policy
              </Link>
              .
            </p>

            {/* Clear, Balanced Choices */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="order-3 sm:order-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-full border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Customize Preferences</span>
              </button>

              <div className="order-1 sm:order-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRejectOptional}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center px-4 py-2 min-h-[40px] rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1E1E1E] text-xs font-semibold text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
                >
                  <span>Reject Optional</span>
                </button>

                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center px-4 py-2 min-h-[40px] rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
                >
                  <span>Accept All</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Redesigned Customize Preferences Modal */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-settings-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-[#1E1E1E] border border-neutral-200 dark:border-neutral-800 shadow-2xl text-neutral-900 dark:text-white overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700">
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
                <div>
                  <h2 id="cookie-settings-title" className="text-sm sm:text-base font-bold text-neutral-950 dark:text-white font-display">
                    Customize Preferences
                  </h2>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Control which cookies we use during your visit.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Close cookie settings dialog"
                className="h-8 w-8 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Category Controls List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 text-xs">
              {/* Category 1: Strictly Necessary */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200/80 dark:border-neutral-800 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 font-bold text-neutral-950 dark:text-white text-xs sm:text-sm">
                    <div className="h-7 w-7 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/70 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
                      <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                    </div>
                    <span>Essential &amp; Security</span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                    <ShieldCheck className="h-3 w-3" />
                    Always Active
                  </span>
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal text-[11px] sm:text-xs pl-9.5">
                  Required for secure sign-in, order verification, and payment protection. Cannot be switched off.
                </p>
              </div>

              {/* Category 2: Functional / Preferences */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200/80 dark:border-neutral-800 space-y-1.5 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 font-bold text-neutral-950 dark:text-white text-xs sm:text-sm">
                    <div className="h-7 w-7 rounded-lg bg-neutral-200/80 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
                      <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                    </div>
                    <span>Functional Preferences</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="toggle-functional-cookies"
                      checked={functional}
                      onChange={(e) => setFunctional(e.target.checked)}
                      aria-label="Toggle Functional Preferences"
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-neutral-950 dark:peer-focus:ring-white rounded-full peer peer-checked:bg-neutral-950 dark:peer-checked:bg-white transition-colors duration-200 relative">
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform duration-200 ${
                        functional
                          ? "translate-x-5 bg-white dark:bg-neutral-950"
                          : "translate-x-0 bg-white dark:bg-neutral-400"
                      }`} />
                    </div>
                  </label>
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal text-[11px] sm:text-xs pl-9.5">
                  Remembers your theme (dark/light), saved location, and layout preferences.
                </p>
              </div>

              {/* Category 3: Analytics */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200/80 dark:border-neutral-800 space-y-1.5 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 font-bold text-neutral-950 dark:text-white text-xs sm:text-sm">
                    <div className="h-7 w-7 rounded-lg bg-neutral-200/80 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
                      <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
                    </div>
                    <span>Analytics &amp; Performance</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="toggle-analytics-cookies"
                      checked={analytics}
                      onChange={(e) => setAnalytics(e.target.checked)}
                      aria-label="Toggle Analytics and Performance cookies"
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-neutral-950 dark:peer-focus:ring-white rounded-full peer peer-checked:bg-neutral-950 dark:peer-checked:bg-white transition-colors duration-200 relative">
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform duration-200 ${
                        analytics
                          ? "translate-x-5 bg-white dark:bg-neutral-950"
                          : "translate-x-0 bg-white dark:bg-neutral-400"
                      }`} />
                    </div>
                  </label>
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal text-[11px] sm:text-xs pl-9.5">
                  Helps us improve search discovery and recommendations anonymously without cross-site tracking.
                </p>
              </div>

              {/* Category 4: Marketing / Advertising */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200/80 dark:border-neutral-800 space-y-1.5 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 font-bold text-neutral-950 dark:text-white text-xs sm:text-sm">
                    <div className="h-7 w-7 rounded-lg bg-neutral-200/80 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    </div>
                    <span>Marketing &amp; Ads</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="toggle-marketing-cookies"
                      checked={marketing}
                      onChange={(e) => setMarketing(e.target.checked)}
                      aria-label="Toggle Marketing and Advertising cookies"
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-neutral-950 dark:peer-focus:ring-white rounded-full peer peer-checked:bg-neutral-950 dark:peer-checked:bg-white transition-colors duration-200 relative">
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform duration-200 ${
                        marketing
                          ? "translate-x-5 bg-white dark:bg-neutral-950"
                          : "translate-x-0 bg-white dark:bg-neutral-400"
                      }`} />
                    </div>
                  </label>
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal text-[11px] sm:text-xs pl-9.5">
                  paYent does not use third-party ad networks or tracking pixels. Kept off by default.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 sm:p-5 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-neutral-50/50 dark:bg-neutral-900/30">
              <button
                type="button"
                onClick={handleRejectOptional}
                className="order-2 sm:order-1 px-4 py-2 min-h-[40px] rounded-full border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer text-center"
              >
                <span>Reject Optional</span>
              </button>

              <div className="order-1 sm:order-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="flex-1 sm:flex-initial px-4 py-2 min-h-[40px] rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1E1E1E] text-xs font-semibold text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer text-center"
                >
                  <span>Accept All</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustom}
                  disabled={isSaving}
                  className="flex-1 sm:flex-initial px-5 py-2 min-h-[40px] rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer shadow-sm disabled:opacity-60 text-center"
                >
                  {isSaving ? "Saving..." : "Save Preferences"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
