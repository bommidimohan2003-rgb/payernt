import React, { useState } from "react";
import { Bell, Globe, Lock, Trash2, Sun, Moon } from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Button } from "@/components/common/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "@tanstack/react-router";
import { useLanguage, LanguageSelector } from "@/i18n";

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

  return (
    <DashboardLayout>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white font-display tracking-tight">
        {tCommon.settings}
      </h1>
      <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
        {tCommon.settings} &bull; Payrent
      </p>

      <div className="mt-6 space-y-6 max-w-3xl">
        {/* Appearance Card */}
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

        {/* Languages Card */}
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

        {/* Notifications Card */}
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

        {/* Security Card */}
        <div className="card-premium p-5 sm:p-6 bg-white dark:bg-[#0D151D] border border-black/10 dark:border-white/10 rounded-3xl shadow-sm">
          <h3 className="font-bold text-base text-neutral-900 dark:text-white flex items-center gap-2.5">
            <Lock className="h-5 w-5" />
            Security & Profile
          </h3>
          <Button
            variant="outline"
            className="mt-4 text-xs font-bold"
            onClick={() => navigate({ to: "/profile" })}
          >
            {tCommon.view} {tCommon.profile}
          </Button>
        </div>

        {/* Danger Zone */}
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
    </DashboardLayout>
  );
}
