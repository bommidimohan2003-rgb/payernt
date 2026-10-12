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

  const { theme, toggle } = useTheme();

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[rgba(161,161,170,0.18)] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F5F5]">
            Platform Settings
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-0.5 font-medium">
            Manage platform configuration, SEO parameters, and system preferences.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSettings}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10151B] hover:bg-[#171C23] border border-[rgba(161,161,170,0.18)] text-[#F5F5F5] text-xs font-semibold transition-all cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-[#A1A1AA]", loading && "animate-spin")} />
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
          <div className="p-1.5 bg-[#10151B] rounded-xl border border-[rgba(161,161,170,0.18)] space-y-1">
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
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer",
                    active
                      ? "bg-white text-black font-bold shadow-2xs"
                      : "text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-white/5"
                  )}
                >
                  <Icon className={cn("h-4 w-4", active ? "text-black" : "text-[#A1A1AA]")} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* MAIN SETTINGS FORM */}
          <div className="md:col-span-3 p-5 bg-[#10151B] rounded-xl border border-[rgba(161,161,170,0.18)]">
            <form onSubmit={handleSave} className="space-y-5 text-xs">
              {activeTab === "general" && (
                <div className="space-y-4">
                  <div className="border-b border-border/50 pb-2">
                    <h3 className="text-sm font-semibold text-foreground">General Marketplace Parameters</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Core identity and primary support contact channels.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-foreground">Website Platform Name</label>
                      <input
                        type="text"
                        value={settings.websiteName}
                        onChange={(e) => handleFieldChange("websiteName", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 text-foreground font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-foreground">Contact Email</label>
                      <input
                        type="email"
                        value={settings.contactEmail}
                        onChange={(e) => handleFieldChange("contactEmail", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 text-foreground font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Support Hotline Phone</label>
                    <input
                      type="text"
                      value={settings.contactPhone}
                      onChange={(e) => handleFieldChange("contactPhone", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 text-foreground font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {activeTab === "branding" && (
                <div className="space-y-4">
                  <div className="border-b border-border/50 pb-2">
                    <h3 className="text-sm font-semibold text-foreground">Branding Assets & Announcement Banners</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Public assets, headlines, and copyright notices.</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Navbar Logo Asset URL</label>
                    <input
                      type="text"
                      value={settings.logoUrl}
                      onChange={(e) => handleFieldChange("logoUrl", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 text-foreground font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Homepage Hero Headline / Banner</label>
                    <input
                      type="text"
                      value={settings.homepageBannerText}
                      onChange={(e) => handleFieldChange("homepageBannerText", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 text-foreground font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Footer Copyright Notice</label>
                    <input
                      type="text"
                      value={settings.footerText}
                      onChange={(e) => handleFieldChange("footerText", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 text-foreground font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {activeTab === "seo" && (
                <div className="space-y-4">
                  <div className="border-b border-border/50 pb-2">
                    <h3 className="text-sm font-semibold text-foreground">Search Engine Optimization Tags</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Global meta tags indexing across search engine crawlers.</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Meta Title</label>
                    <input
                      type="text"
                      value={settings.seoTitle}
                      onChange={(e) => handleFieldChange("seoTitle", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 text-foreground font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Meta Description</label>
                    <textarea
                      rows={3}
                      value={settings.seoDescription}
                      onChange={(e) => handleFieldChange("seoDescription", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 text-foreground font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {activeTab === "appearance" && (
                <div className="space-y-4">
                  <div className="border-b border-border/50 pb-2">
                    <h3 className="text-sm font-semibold text-foreground">System Appearance Mode</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Toggle admin interface theme preferences.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={toggle}
                      className={cn(
                        "p-4 rounded-xl border flex flex-col items-center gap-2 cursor-pointer transition-all",
                        theme === "light" ? "border-emerald-500 bg-emerald-500/5 font-semibold text-foreground" : "border-border/70 bg-secondary/30 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Sun className="h-5 w-5 text-amber-500" />
                      <span className="text-xs font-semibold">Light Mode</span>
                    </button>

                    <button
                      type="button"
                      onClick={toggle}
                      className={cn(
                        "p-4 rounded-xl border flex flex-col items-center gap-2 cursor-pointer transition-all",
                        theme === "dark" ? "border-emerald-500 bg-emerald-500/5 font-semibold text-foreground" : "border-border/70 bg-secondary/30 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Moon className="h-5 w-5 text-foreground" />
                      <span className="text-xs font-semibold">Dark Mode</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-[rgba(161,161,170,0.18)]">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition-all cursor-pointer disabled:opacity-50"
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
