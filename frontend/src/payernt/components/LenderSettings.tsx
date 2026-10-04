import React, { useState } from "react";
import {
  Settings,
  Bell,
  Sun,
  Moon,
  ArrowLeft,
  LogOut,
  Sliders,
  CheckCircle2,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage, LanguageSelector } from "@/i18n";

interface LenderSettingsProps {
  onBack?: () => void;
  onLogout?: () => void;
  onResetDemo?: () => void;
}

export function LenderSettingsView({
  onBack,
  onLogout,
  onResetDemo,
}: LenderSettingsProps) {
  const { theme, toggle: toggleTheme } = useTheme();
  const { tCommon, tPayernt } = useLanguage();

  // Notification states
  const [notifyBookings, setNotifyBookings] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyPayouts, setNotifyPayouts] = useState(true);

  // Rental preferences
  const [instantBooking, setInstantBooking] = useState(false);
  const [weekendAvailability, setWeekendAvailability] = useState(true);

  const handleSave = () => {
    toast.success(tCommon.saveChanges + " successful!");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 text-left pb-16 px-1 sm:px-0">
      {/* Back to Home Button */}
      {onBack && (
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#10141d] hover:bg-neutral-50 dark:hover:bg-white/[0.04] text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-all cursor-pointer shadow-xs group"
          >
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Home</span>
          </button>
        </div>
      )}

      {/* Settings Header */}
      <div className="border-b border-neutral-200 dark:border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200 dark:border-white/10 text-neutral-800 dark:text-neutral-200">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight font-display">
              {tPayernt.lenderSettings}
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {tCommon.settings} &bull; {tPayernt.tagline}
            </p>
          </div>
        </div>
      </div>

      {/* 1. Appearance & Theme */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#10141d] border border-neutral-200/90 dark:border-white/[0.08] shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-neutral-100 dark:bg-white/[0.06] text-neutral-800 dark:text-neutral-200">
            <Sun className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">{tCommon.appearance}</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{tCommon.theme}</p>
          </div>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
          {/* Theme Selector */}
          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-neutral-900 dark:text-white">{tCommon.themeMode}</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {theme === "dark" ? tCommon.darkMode : tCommon.lightMode}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.05] hover:bg-neutral-100 dark:hover:bg-white/10 text-xs font-semibold text-neutral-900 dark:text-white transition-all cursor-pointer"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-neutral-300" />
                  <span>{tCommon.switchToLight}</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-neutral-700" />
                  <span>{tCommon.switchToDark}</span>
                </>
              )}
            </button>
          </div>

          {/* Currency */}
          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-neutral-900 dark:text-white">{tCommon.currency}</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Indian Rupee (INR)</p>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-white/[0.06] text-neutral-800 dark:text-neutral-200">
              {tCommon.inrCurrency}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Languages Selection Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#10141d] border border-neutral-200/90 dark:border-white/[0.08] shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-neutral-100 dark:bg-white/[0.06] text-neutral-800 dark:text-neutral-200">
            <Globe className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">{tCommon.languages}</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{tCommon.selectLanguage} (English, తెలుగు, हिन्दी)</p>
          </div>
        </div>

        <LanguageSelector />
      </div>

      {/* 3. Notification Preferences */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#10141d] border border-neutral-200/90 dark:border-white/[0.08] shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-neutral-100 dark:bg-white/[0.06] text-neutral-800 dark:text-neutral-200">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">{tCommon.notificationPreferences}</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{tCommon.notifications}</p>
          </div>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
          {/* Booking Alerts */}
          <div className="py-3 flex items-center justify-between">
            <div className="pr-4">
              <p className="text-xs font-bold text-neutral-900 dark:text-white">{tCommon.bookingAlerts}</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{tPayernt.rentalRequests}</p>
            </div>
            <input
              type="checkbox"
              checked={notifyBookings}
              onChange={(e) => setNotifyBookings(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 dark:border-white/20 text-neutral-900 dark:text-white cursor-pointer accent-neutral-900 dark:accent-white"
            />
          </div>

          {/* Message Alerts */}
          <div className="py-3 flex items-center justify-between">
            <div className="pr-4">
              <p className="text-xs font-bold text-neutral-900 dark:text-white">{tCommon.messageAlerts}</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{tCommon.messages}</p>
            </div>
            <input
              type="checkbox"
              checked={notifyMessages}
              onChange={(e) => setNotifyMessages(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 dark:border-white/20 text-neutral-900 dark:text-white cursor-pointer accent-neutral-900 dark:accent-white"
            />
          </div>

          {/* Payout Alerts */}
          <div className="py-3 flex items-center justify-between">
            <div className="pr-4">
              <p className="text-xs font-bold text-neutral-900 dark:text-white">{tCommon.payoutAlerts}</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{tPayernt.walletAndPayouts}</p>
            </div>
            <input
              type="checkbox"
              checked={notifyPayouts}
              onChange={(e) => setNotifyPayouts(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 dark:border-white/20 text-neutral-900 dark:text-white cursor-pointer accent-neutral-900 dark:accent-white"
            />
          </div>
        </div>
      </div>

      {/* 4. Rental & Handover Preferences */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#10141d] border border-neutral-200/90 dark:border-white/[0.08] shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-neutral-100 dark:bg-white/[0.06] text-neutral-800 dark:text-neutral-200">
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">{tPayernt.lendingPreferences}</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{tPayernt.tagline}</p>
          </div>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
          {/* Instant Booking */}
          <div className="py-3 flex items-center justify-between">
            <div className="pr-4">
              <p className="text-xs font-bold text-neutral-900 dark:text-white">{tPayernt.instantBooking}</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{tPayernt.instantBookingDesc}</p>
            </div>
            <input
              type="checkbox"
              checked={instantBooking}
              onChange={(e) => setInstantBooking(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 dark:border-white/20 text-neutral-900 dark:text-white cursor-pointer accent-neutral-900 dark:accent-white"
            />
          </div>

          {/* Weekend Availability */}
          <div className="py-3 flex items-center justify-between">
            <div className="pr-4">
              <p className="text-xs font-bold text-neutral-900 dark:text-white">{tPayernt.weekendAvailability}</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{tPayernt.weekendAvailabilityDesc}</p>
            </div>
            <input
              type="checkbox"
              checked={weekendAvailability}
              onChange={(e) => setWeekendAvailability(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 dark:border-white/20 text-neutral-900 dark:text-white cursor-pointer accent-neutral-900 dark:accent-white"
            />
          </div>

          {/* Security PIN Requirement */}
          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-neutral-900 dark:text-white">{tPayernt.handoverPin}</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{tPayernt.handoverPinDesc}</p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-white/[0.08] text-neutral-800 dark:text-neutral-200">
              <CheckCircle2 className="h-3 w-3" />
              <span>{tPayernt.enforced}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Save Changes Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          className="px-5 py-2.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black font-bold text-xs shadow-sm hover:opacity-90 active:scale-98 transition-all cursor-pointer"
        >
          {tCommon.saveChanges}
        </button>
      </div>

      {/* 5. Danger Zone */}
      <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50 dark:bg-[#10141d]/60 border border-neutral-200/90 dark:border-white/[0.08] shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">{tCommon.accountActions}</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{tCommon.dangerZone}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-white/10 bg-white dark:bg-white/[0.04] hover:bg-neutral-100 dark:hover:bg-white/[0.08] text-xs font-bold text-neutral-700 dark:text-neutral-300 transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{tPayernt.logoutPayernt}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default LenderSettingsView;
