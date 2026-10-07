import React, { useState, useEffect } from "react";
import {
  Bell,
  Globe,
  Lock,
  Trash2,
  Sun,
  Moon,
  ShieldCheck,
  QrCode,
  Laptop,
  History,
  ArrowRightLeft,
  Activity,
  Plus,
} from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Button } from "@/components/common/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "@tanstack/react-router";
import { useLanguage, LanguageSelector } from "@/i18n";
import { SecurityQRCard } from "@/components/security/SecurityQRCard";
import { MyDevicesTab } from "@/components/security/MyDevicesTab";
import { SecurityHistoryTab } from "@/components/security/SecurityHistoryTab";
import { OwnershipTransferTab } from "@/components/security/OwnershipTransferTab";
import { RegisterDeviceModal } from "@/components/security/RegisterDeviceModal";
import { RegisteredDevice, deviceService } from "@/services/deviceService";

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${
        on ? "bg-neutral-900 dark:bg-white" : "bg-neutral-200 dark:bg-neutral-700"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white dark:bg-black shadow transition-all ${
          on ? "left-5" : "left-0.5"
        }`}
      />
    </button>
  );
}

export default function Settings() {
  const { theme, toggle } = useTheme();
  const { logout } = useAuth();
  const { tCommon } = useLanguage();
  const navigate = useNavigate();

  const [emails, setEmails] = useState(true);
  const [push, setPush] = useState(false);

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

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl pb-16">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white font-display tracking-tight">
            {tCommon.settings}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {tCommon.settings} &bull; paYent Security & Account Preferences
          </p>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1: SECURITY & DEVICE IDENTITY (FEATURE SPOTLIGHT) */}
        {/* ========================================================================= */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-neutral-900 dark:text-white font-display tracking-tight">
                Security & Device Identity
              </h2>
            </div>
            <span className="text-[11px] font-mono text-neutral-400">
              {devices.length} Registered {devices.length === 1 ? "Laptop" : "Laptops"}
            </span>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-neutral-100 dark:bg-[#0D151D] border border-neutral-200 dark:border-white/10 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setSecurityTab("qr")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
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
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
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
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
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
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
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
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
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
            <div className="card-premium p-6 sm:p-7 bg-white dark:bg-[#0D151D] border border-neutral-200 dark:border-white/10 rounded-3xl shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white font-display">
                  Hardware Registry & Security Status
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Real-time status breakdown of registered laptop hardware units.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Active & Verified
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">
                    {activeCount}
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Cryptographic QR authenticated & scannable.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Reported Lost
                  </div>
                  <div className="text-2xl font-extrabold text-amber-700 dark:text-amber-300">
                    {lostCount}
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Flagged with public security alert.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    Reported Stolen
                  </div>
                  <div className="text-2xl font-extrabold text-rose-700 dark:text-rose-300">
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

        {/* ========================================================================= */}
        {/* SECTION 2: APPEARANCE */}
        {/* ========================================================================= */}
        <div className="card-premium p-5 sm:p-6 bg-white dark:bg-[#0D151D] border border-black/10 dark:border-white/10 rounded-3xl shadow-sm">
          <h3 className="font-bold text-base text-neutral-900 dark:text-white flex items-center gap-2.5">
            {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            {tCommon.appearance}
          </h3>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <div className="font-semibold text-xs sm:text-sm text-neutral-900 dark:text-white">
                {tCommon.themeMode}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                {theme === "dark" ? tCommon.darkMode : tCommon.lightMode}
              </div>
            </div>
            <Toggle on={theme === "dark"} onChange={toggle} />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 3: LANGUAGES */}
        {/* ========================================================================= */}
        <div className="card-premium p-5 sm:p-6 bg-white dark:bg-[#0D151D] border border-black/10 dark:border-white/10 rounded-3xl shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-base text-neutral-900 dark:text-white flex items-center gap-2.5">
              <Globe className="h-5 w-5" />
              {tCommon.languages}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {tCommon.selectLanguage} (English, తెలుగు, हिन्दी)
            </p>
          </div>
          <LanguageSelector />
        </div>

        {/* ========================================================================= */}
        {/* SECTION 4: NOTIFICATIONS */}
        {/* ========================================================================= */}
        <div className="card-premium p-5 sm:p-6 bg-white dark:bg-[#0D151D] border border-black/10 dark:border-white/10 rounded-3xl shadow-sm">
          <h3 className="font-bold text-base text-neutral-900 dark:text-white flex items-center gap-2.5">
            <Bell className="h-5 w-5" />
            {tCommon.notificationPreferences}
          </h3>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200">
                {tCommon.bookingAlerts}
              </span>
              <Toggle on={emails} onChange={() => setEmails((v) => !v)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200">
                {tCommon.messageAlerts}
              </span>
              <Toggle on={push} onChange={() => setPush((v) => !v)} />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 5: ACCOUNT & PROFILE */}
        {/* ========================================================================= */}
        <div className="card-premium p-5 sm:p-6 bg-white dark:bg-[#0D151D] border border-black/10 dark:border-white/10 rounded-3xl shadow-sm">
          <h3 className="font-bold text-base text-neutral-900 dark:text-white flex items-center gap-2.5">
            <Lock className="h-5 w-5" />
            Account & Profile
          </h3>
          <Button
            variant="outline"
            className="mt-4 text-xs font-bold"
            onClick={() => navigate({ to: "/profile" })}
          >
            {tCommon.view} {tCommon.profile}
          </Button>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 6: DANGER ZONE */}
        {/* ========================================================================= */}
        <div className="card-premium p-5 sm:p-6 bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-300/80 dark:border-white/10 rounded-3xl shadow-sm">
          <h3 className="font-bold text-base text-neutral-900 dark:text-white flex items-center gap-2.5">
            <Trash2 className="h-5 w-5" />
            {tCommon.dangerZone}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {tCommon.logoutConfirmation}
          </p>
          <Button
            variant="destructive"
            className="mt-4 text-xs font-bold"
            onClick={() => {
              logout();
              navigate({ to: "/" });
            }}
          >
            {tCommon.logout}
          </Button>
        </div>
      </div>

      {/* Register Device Modal */}
      <RegisterDeviceModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={handleDeviceRegistered}
      />
    </DashboardLayout>
  );
}
