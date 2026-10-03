import React, { useState } from "react";
import {
  Settings,
  Bell,
  Shield,
  Moon,
  Sun,
  Lock,
  ArrowLeft,
  RotateCcw,
  LogOut,
  Sliders,
  CheckCircle2,
  KeyRound,
  CreditCard,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/hooks/useTheme";

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

  // Notification states
  const [notifyBookings, setNotifyBookings] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyPayouts, setNotifyPayouts] = useState(true);

  // Rental preferences
  const [instantBooking, setInstantBooking] = useState(false);
  const [weekendAvailability, setWeekendAvailability] = useState(true);
  const [strictDeposit, setStrictDeposit] = useState(true);

  const handleSave = () => {
    toast.success("Settings saved successfully!");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 text-left pb-16 px-1 sm:px-0">
      {/* Back to Dashboard Button */}
      {onBack && (
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#10141d] hover:bg-neutral-50 dark:hover:bg-white/[0.04] text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-all cursor-pointer shadow-xs group"
          >
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Dashboard</span>
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
              Settings
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Manage your preferences, notifications, and security options.
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
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Appearance</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Customize display theme and currency</p>
          </div>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
          {/* Theme Selector */}
          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-neutral-900 dark:text-white">Theme Mode</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Currently using {theme} mode</p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.05] hover:bg-neutral-100 dark:hover:bg-white/10 text-xs font-semibold text-neutral-900 dark:text-white transition-all cursor-pointer"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-neutral-300" />
                  <span>Switch to Light</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-neutral-700" />
                  <span>Switch to Dark</span>
                </>
              )}
            </button>
          </div>

          {/* Currency */}
          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-neutral-900 dark:text-white">Platform Currency</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Fixed to Indian Rupee</p>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-white/[0.06] text-neutral-800 dark:text-neutral-200">
              ₹ INR
            </span>
          </div>
        </div>
      </div>

      {/* 2. Notification Preferences */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#10141d] border border-neutral-200/90 dark:border-white/[0.08] shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-neutral-100 dark:bg-white/[0.06] text-neutral-800 dark:text-neutral-200">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Notification Preferences</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Choose what alerts and updates you receive</p>
          </div>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
          {/* Booking Alerts */}
          <div className="py-3 flex items-center justify-between">
            <div className="pr-4">
              <p className="text-xs font-bold text-neutral-900 dark:text-white">Booking Requests</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Get notified when a customer requests to rent your gear</p>
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
              <p className="text-xs font-bold text-neutral-900 dark:text-white">Direct Messages</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Receive alerts when renters send inquiries or inspection notes</p>
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
              <p className="text-xs font-bold text-neutral-900 dark:text-white">Wallet & Payouts</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Get instant updates when rental earnings are credited or withdrawn</p>
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

      {/* 3. Rental & Handover Preferences */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#10141d] border border-neutral-200/90 dark:border-white/[0.08] shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-neutral-100 dark:bg-white/[0.06] text-neutral-800 dark:text-neutral-200">
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Lending Preferences</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Configure how renters interact with your equipment listings</p>
          </div>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
          {/* Instant Booking */}
          <div className="py-3 flex items-center justify-between">
            <div className="pr-4">
              <p className="text-xs font-bold text-neutral-900 dark:text-white">Instant Booking</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Allow pre-verified renters to book gear without manual approval</p>
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
              <p className="text-xs font-bold text-neutral-900 dark:text-white">Weekend Availability</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Accept equipment pickup and dropoff on Saturdays and Sundays</p>
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
              <p className="text-xs font-bold text-neutral-900 dark:text-white">Mandatory Handover PIN Verification</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Protected by 4-digit Vendor Secret PIN</p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-white/[0.08] text-neutral-800 dark:text-neutral-200">
              <CheckCircle2 className="h-3 w-3" />
              <span>Enforced</span>
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
          Save Preferences
        </button>
      </div>

      {/* 4. Danger Zone */}
      <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50 dark:bg-[#10141d]/60 border border-neutral-200/90 dark:border-white/[0.08] shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Account Actions</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Reset local session or sign out</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {onResetDemo && (
            <button
              type="button"
              onClick={() => {
                onResetDemo();
                toast.success("Demo environment reset to initial defaults.");
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-white/10 bg-white dark:bg-white/[0.04] hover:bg-neutral-100 dark:hover:bg-white/[0.08] text-xs font-bold text-neutral-700 dark:text-neutral-300 transition-all cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Demo State</span>
            </button>
          )}

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-white/10 bg-white dark:bg-white/[0.04] hover:bg-neutral-100 dark:hover:bg-white/[0.08] text-xs font-bold text-neutral-700 dark:text-neutral-300 transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log Out of Payernt</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default LenderSettingsView;
