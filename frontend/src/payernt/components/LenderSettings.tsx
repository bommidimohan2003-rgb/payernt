import React, { useState, useEffect } from "react";
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
  ShieldCheck,
  QrCode,
  Laptop,
  History,
  ArrowRightLeft,
  Activity,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage, LanguageSelector } from "@/i18n";
import { SecurityQRCard } from "@/components/security/SecurityQRCard";
import { MyDevicesTab } from "@/components/security/MyDevicesTab";
import { SecurityHistoryTab } from "@/components/security/SecurityHistoryTab";
import { OwnershipTransferTab } from "@/components/security/OwnershipTransferTab";
import { RegisterDeviceModal } from "@/components/security/RegisterDeviceModal";
import { RegisteredDevice, deviceService } from "@/services/deviceService";

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

  // Security & Device Identity State
  const [securityTab, setSecurityTab] = useState<"qr" | "devices" | "status" | "history" | "transfers">("qr");
  const [devices, setDevices] = useState<RegisteredDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const fetchDevices = async () => {
    setLoadingDevices(true);
    try {
      const res = await deviceService.getDevices();
      setDevices(res.devices || []);
    } catch (err) {
      console.error("Failed to load registered devices", err);
    } finally {
      setLoadingDevices(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleSelectDeviceForQR = (deviceId: string) => {
    setSecurityTab("qr");
  };

  const handleDeviceRegistered = (newDev: RegisteredDevice) => {
    setDevices((prev) => [newDev, ...prev]);
    setSecurityTab("qr");
  };

  const activeCount = devices.filter((d) => d.deviceStatus === "ACTIVE").length;
  const lostCount = devices.filter((d) => d.deviceStatus === "REPORTED_LOST").length;
  const stolenCount = devices.filter((d) => d.deviceStatus === "REPORTED_STOLEN").length;

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

      {/* ========================================================================= */}
      {/* SECTION 1: SECURITY & DEVICE IDENTITY (MY SECURITY QR) */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-neutral-900 dark:text-white font-display tracking-tight">
                Security & Device Identity
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Cryptographic QR verification, device registration & anti-theft protection
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-neutral-400 self-start sm:self-auto">
            {devices.length} Registered {devices.length === 1 ? "Laptop" : "Laptops"}
          </span>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-neutral-100 dark:bg-[#0D151D] border border-neutral-200 dark:border-white/10 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setSecurityTab("qr")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              securityTab === "qr"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <QrCode className="h-3.5 w-3.5 text-sky-500" />
            My Security QR
          </button>

          <button
            type="button"
            onClick={() => setSecurityTab("devices")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              securityTab === "devices"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <Laptop className="h-3.5 w-3.5" />
            My Devices
            {devices.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200">
                {devices.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSecurityTab("status")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              securityTab === "status"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <Activity className="h-3.5 w-3.5 text-emerald-500" />
            Device Status
          </button>

          <button
            type="button"
            onClick={() => setSecurityTab("history")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              securityTab === "history"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <History className="h-3.5 w-3.5" />
            Security History
          </button>

          <button
            type="button"
            onClick={() => setSecurityTab("transfers")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              securityTab === "transfers"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Ownership Transfer
          </button>
        </div>

        {/* Sub-Tab 1: My Security QR */}
        {securityTab === "qr" && (
          <SecurityQRCard
            devices={devices}
            onRefreshDevices={fetchDevices}
            onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
          />
        )}

        {/* Sub-Tab 2: My Devices */}
        {securityTab === "devices" && (
          <MyDevicesTab
            devices={devices}
            onSelectDeviceForQR={handleSelectDeviceForQR}
            onRefreshDevices={fetchDevices}
            onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
          />
        )}

        {/* Sub-Tab 3: Device Status Overview */}
        {securityTab === "status" && (
          <div className="p-5 sm:p-6 bg-white dark:bg-[#10141d] border border-neutral-200/90 dark:border-white/[0.08] rounded-2xl shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white font-display">
                Hardware Registry & Security Status
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Real-time status breakdown of registered laptop hardware units.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Active & Verified
                </div>
                <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 font-mono">
                  {activeCount}
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Cryptographic QR authenticated & scannable.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Reported Lost
                </div>
                <div className="text-2xl font-extrabold text-amber-700 dark:text-amber-300 font-mono">
                  {lostCount}
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Flagged with public security alert.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Reported Stolen
                </div>
                <div className="text-2xl font-extrabold text-rose-700 dark:text-rose-300 font-mono">
                  {stolenCount}
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Flagged with prohibited transfer warning.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sub-Tab 4: Security History */}
        {securityTab === "history" && <SecurityHistoryTab />}

        {/* Sub-Tab 5: Ownership Transfer */}
        {securityTab === "transfers" && <OwnershipTransferTab onRefreshDevices={fetchDevices} />}
      </div>

      {/* 2. Appearance & Theme */}
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

      {/* 3. Languages Selection Card */}
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

      {/* 4. Notification Preferences */}
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

      {/* 5. Rental & Handover Preferences */}
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

      {/* 6. Danger Zone */}
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

      {/* Device Registration Modal */}
      {isRegisterModalOpen && (
        <RegisterDeviceModal
          isOpen={isRegisterModalOpen}
          onClose={() => setIsRegisterModalOpen(false)}
          onDeviceRegistered={handleDeviceRegistered}
        />
      )}
    </div>
  );
}

export default LenderSettingsView;
