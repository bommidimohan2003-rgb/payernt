import { useEffect, useState, useCallback } from "react";
import {
  Globe,
  Palette,
  Megaphone,
  Share2,
  Save,
  RefreshCw,
  Sun,
  Moon,
} from "lucide-react";
import { notificationsService } from "../services/notifications";
import { AdminSettings } from "../services/api";
import { useTheme } from "@/hooks/useTheme";
import { Loader } from "../components/layout/Loader";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Settings() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "branding" | "seo" | "appearance">("general");

  const { theme, setThemeMode } = useTheme();

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await notificationsService.getSettings();
      setSettings(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load platform settings from database.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      setSubmitting(true);
      const updated = await notificationsService.updateSettings(settings);
      setSettings(updated);
      toast.success("Platform settings persisted successfully.");
    } catch {
      toast.error("Failed to save settings to database.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFieldChange = (field: keyof AdminSettings, value: string) => {
    setSettings((prev) => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
  };

  if (loading && !settings) {
    return (
      <div className="py-24 flex items-center justify-center">
        <Loader message="Loading platform configuration..." size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER & TABS SWITCHER (Panel 16) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--admin-border)] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--admin-text)]">
            Platform Settings
          </h1>
          <p className="text-xs text-[var(--admin-text-muted)] mt-0.5 font-medium">
            Manage platform configuration, SEO parameters, and system preferences.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSettings}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--admin-card)] hover:bg-[var(--admin-elevated)] border border-[var(--admin-border)] text-[var(--admin-text)] text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-[var(--admin-text-muted)]", loading && "animate-spin")} />
            <span>Sync Settings</span>
          </button>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchSettings} className="underline font-bold cursor-pointer">Retry</button>
        </div>
      )}

      {settings && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          {/* TAB NAVIGATION PANEL */}
          <div className="p-1.5 bg-[var(--admin-card)] rounded-xl border border-[var(--admin-border)] space-y-1">
            {[
              { id: "general", label: "General Settings", icon: Globe },
              { id: "branding", label: "Branding & Banners", icon: Megaphone },
              { id: "seo", label: "SEO & Metadata", icon: Share2 },
              { id: "appearance", label: "System Appearance", icon: Palette },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer",
                    active
                      ? "bg-[var(--admin-accent)] text-[var(--admin-bg)] font-semibold shadow-xs"
                      : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-elevated)]"
                  )}
                >
                  <Icon className={cn("h-4 w-4", active ? "text-[var(--admin-bg)]" : "text-[var(--admin-text-muted)]")} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* MAIN SETTINGS FORM */}
          <div className="md:col-span-3 p-5 bg-[var(--admin-card)] rounded-xl border border-[var(--admin-border)]">
            <form onSubmit={handleSave} className="space-y-5 text-xs">
              {activeTab === "general" && (
                <div className="space-y-4">
                  <div className="border-b border-[var(--admin-border)] pb-2">
                    <h3 className="text-sm font-semibold text-[var(--admin-text)]">General Marketplace Parameters</h3>
                    <p className="text-[11px] text-[var(--admin-text-muted)] mt-0.5">Core identity and primary support contact channels.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-[var(--admin-text)]">Website Platform Name</label>
                      <input
                        type="text"
                        value={settings.websiteName}
                        onChange={(e) => handleFieldChange("websiteName", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] text-[var(--admin-text)] font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-[var(--admin-text)]">Contact Email</label>
                      <input
                        type="email"
                        value={settings.contactEmail}
                        onChange={(e) => handleFieldChange("contactEmail", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] text-[var(--admin-text)] font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-[var(--admin-text)]">Support Hotline Phone</label>
                    <input
                      type="text"
                      value={settings.contactPhone}
                      onChange={(e) => handleFieldChange("contactPhone", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] text-[var(--admin-text)] font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {activeTab === "branding" && (
                <div className="space-y-4">
                  <div className="border-b border-[var(--admin-border)] pb-2">
                    <h3 className="text-sm font-semibold text-[var(--admin-text)]">Branding Assets & Announcement Banners</h3>
                    <p className="text-[11px] text-[var(--admin-text-muted)] mt-0.5">Public assets, headlines, and copyright notices.</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[var(--admin-text)]">Navbar Logo Asset URL</label>
                    <input
                      type="text"
                      value={settings.logoUrl}
                      onChange={(e) => handleFieldChange("logoUrl", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] text-[var(--admin-text)] font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-[var(--admin-text)]">Homepage Hero Headline / Banner</label>
                    <input
                      type="text"
                      value={settings.homepageBannerText}
                      onChange={(e) => handleFieldChange("homepageBannerText", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] text-[var(--admin-text)] font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-[var(--admin-text)]">Footer Copyright Notice</label>
                    <input
                      type="text"
                      value={settings.footerText}
                      onChange={(e) => handleFieldChange("footerText", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] text-[var(--admin-text)] font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {activeTab === "seo" && (
                <div className="space-y-4">
                  <div className="border-b border-[var(--admin-border)] pb-2">
                    <h3 className="text-sm font-semibold text-[var(--admin-text)]">Search Engine Optimization Tags</h3>
                    <p className="text-[11px] text-[var(--admin-text-muted)] mt-0.5">Global meta tags indexing across search engine crawlers.</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[var(--admin-text)]">Meta Title</label>
                    <input
                      type="text"
                      value={settings.seoTitle}
                      onChange={(e) => handleFieldChange("seoTitle", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] text-[var(--admin-text)] font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-[var(--admin-text)]">Meta Description</label>
                    <textarea
                      rows={3}
                      value={settings.seoDescription}
                      onChange={(e) => handleFieldChange("seoDescription", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] text-[var(--admin-text)] font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {activeTab === "appearance" && (
                <div className="space-y-4">
                  <div className="border-b border-[var(--admin-border)] pb-2">
                    <h3 className="text-sm font-semibold text-[var(--admin-text)]">System Appearance Mode</h3>
                    <p className="text-[11px] text-[var(--admin-text-muted)] mt-0.5">Toggle admin interface theme preferences.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setThemeMode("light")}
                      className={cn(
                        "p-4 rounded-xl border flex flex-col items-center gap-2 cursor-pointer transition-colors",
                        theme === "light" ? "border-emerald-500 bg-emerald-500/5 font-semibold text-[var(--admin-text)]" : "border-[var(--admin-border)] bg-[var(--admin-elevated)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
                      )}
                    >
                      <Sun className="h-5 w-5 text-amber-500" />
                      <span className="text-xs font-semibold">Light Mode</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setThemeMode("dark")}
                      className={cn(
                        "p-4 rounded-xl border flex flex-col items-center gap-2 cursor-pointer transition-colors",
                        theme === "dark" ? "border-emerald-500 bg-emerald-500/5 font-semibold text-[var(--admin-text)]" : "border-[var(--admin-border)] bg-[var(--admin-elevated)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
                      )}
                    >
                      <Moon className="h-5 w-5 text-[var(--admin-text)]" />
                      <span className="text-xs font-semibold">Dark Mode</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-[var(--admin-border)]">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] text-[var(--admin-bg)] font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{submitting ? "Saving to Database..." : "Save Settings"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
