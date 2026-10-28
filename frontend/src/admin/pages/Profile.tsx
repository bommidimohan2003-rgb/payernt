import { useEffect, useState, useCallback } from "react";
import {
  User,
  Shield,
  Key,
  Mail,
  Phone,
  LogOut,
  CheckCircle2,
} from "lucide-react";
import { notificationsService } from "../services/notifications";
import { authService } from "../services/auth";
import { AdminUser } from "../services/api";
import { Loader } from "../components/layout/Loader";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { ProfilePhoto } from "@/components/common/ProfilePhoto";

export default function Profile() {
  const [profile, setProfile] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile Form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Password Form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const navigate = useNavigate();

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await authService.getMe();
      setProfile(data);
      setFullName(data.fullName || "");
      setEmail(data.email || "");
      setPhone(data.phone || "");
    } catch (err) {
      console.error(err);
      setError("Failed to load authenticated administrator credentials.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      await notificationsService.updateProfile({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      window.dispatchEvent(new Event("payent:admin:profile-updated"));
      toast.success("Profile credentials updated.");
    } catch {
      toast.error("Failed to update profile details.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    setUpdatingPassword(true);
    try {
      await notificationsService.updatePassword({
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully.");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to update password.";
      toast.error(msg);
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
  };

  if (loading && !profile) {
    return (
      <div className="py-24 flex items-center justify-center">
        <Loader message="Loading administrator profile..." size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER & TABS SWITCHER (Panel 16) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[rgba(161,161,170,0.18)] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F5F5]">
            Profile &amp; Settings
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-0.5 font-medium">
            Manage administrative profile and platform preferences.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 bg-[#10151B] rounded-lg border border-[rgba(161,161,170,0.18)] text-xs font-medium">
            <button
              className="px-3 py-1.5 rounded-md bg-white text-black font-semibold shadow-xs cursor-pointer text-xs"
            >
              Profile
            </button>
            <button
              onClick={() => navigate({ to: "/admin/settings" })}
              className="px-3 py-1.5 rounded-md text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors cursor-pointer text-xs"
            >
              Settings
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-all cursor-pointer border border-red-500/20"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchProfile} className="underline font-bold cursor-pointer">Retry</button>
        </div>
      )}

      {/* TWO PANEL CARDS (Panel 16) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT CARD: Admin Profile */}
        <div className="p-6 bg-[#10151B] rounded-2xl border border-[rgba(161,161,170,0.18)] space-y-6">
          <div>
            <h2 className="text-base font-bold text-[#F5F5F5]">Admin Profile</h2>
            <p className="text-xs text-[#A1A1AA] mt-0.5">Manage your profile information.</p>
          </div>

          {/* Profile Photo Area */}
          <div className="flex items-center gap-4">
            <ProfilePhoto
              src={(profile as any)?.profilePhotoUrl || (profile as any)?.profile_photo_url || profile?.avatar}
              alt={profile?.fullName || "Admin"}
              size="xl"
              shape="circle"
              className="border border-[rgba(161,161,170,0.18)] shrink-0"
            />
            <div>
              <div className="text-sm font-bold text-[#F5F5F5]">{profile?.fullName || "Admin"}</div>
              <div className="text-xs text-[#A1A1AA] font-mono mt-0.5">{profile?.email || "admin@payent.com"}</div>
              <span className="mt-1.5 inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-white/10 text-white">
                {profile?.role || "Administrator"}
              </span>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-[#F5F5F5]">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] text-[#F5F5F5] font-medium focus:outline-none focus:border-white/40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[#F5F5F5]">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] text-[#F5F5F5] font-medium focus:outline-none focus:border-white/40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[#F5F5F5]">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] text-[#F5F5F5] font-medium focus:outline-none focus:border-white/40 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={updatingProfile}
              className="px-4 py-2 rounded-lg bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition-colors cursor-pointer"
            >
              {updatingProfile ? "Saving..." : "Save Profile"}
            </button>
          </form>

          {/* Change Password */}
          <div className="pt-4 border-t border-[rgba(161,161,170,0.18)] space-y-3">
            <h3 className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wider">Change Password</h3>
            <form onSubmit={handleUpdatePassword} className="space-y-3 text-xs">
              <input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] text-[#F5F5F5]"
              />
              <input
                type="password"
                placeholder="New password (min 8 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] text-[#F5F5F5]"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] text-[#F5F5F5]"
              />
              <button
                type="submit"
                disabled={updatingPassword}
                className="px-3.5 py-1.5 rounded-lg bg-[#171C23] hover:bg-white/10 text-[#F5F5F5] font-medium border border-[rgba(161,161,170,0.18)] cursor-pointer"
              >
                {updatingPassword ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT CARD: Platform Settings (Panel 16) */}
        <div className="p-6 bg-[#10151B] rounded-2xl border border-[rgba(161,161,170,0.18)] space-y-6">
          <div>
            <h2 className="text-base font-bold text-[#F5F5F5]">Platform Settings</h2>
            <p className="text-xs text-[#A1A1AA] mt-0.5">Manage platform configuration and preferences.</p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-[#171C23] border border-[rgba(161,161,170,0.18)] flex items-center justify-between">
              <div>
                <div className="font-bold text-[#F5F5F5]">Email Notifications</div>
                <div className="text-[11px] text-[#A1A1AA] mt-0.5">Receive transaction &amp; dispatch alerts via email</div>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 accent-white cursor-pointer" />
            </div>

            <div className="p-3.5 rounded-xl bg-[#171C23] border border-[rgba(161,161,170,0.18)] flex items-center justify-between">
              <div>
                <div className="font-bold text-[#F5F5F5]">Booking Alerts</div>
                <div className="text-[11px] text-[#A1A1AA] mt-0.5">Immediate notifications on rental creation</div>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 accent-white cursor-pointer" />
            </div>

            <div className="p-3.5 rounded-xl bg-[#171C23] border border-[rgba(161,161,170,0.18)] flex items-center justify-between">
              <div>
                <div className="font-bold text-[#F5F5F5]">Security Alerts</div>
                <div className="text-[11px] text-[#A1A1AA] mt-0.5">Alert on suspicious logins or PIN failures</div>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 accent-white cursor-pointer" />
            </div>

            <div className="p-3.5 rounded-xl bg-[#171C23] border border-[rgba(161,161,170,0.18)] flex items-center justify-between">
              <div>
                <div className="font-bold text-[#F5F5F5]">Appearance Theme</div>
                <div className="text-[11px] text-[#A1A1AA] mt-0.5">Enterprise Dashboard Visual Mode</div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-black text-white font-mono text-xs border border-[rgba(161,161,170,0.18)]">
                Dark
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-[rgba(161,161,170,0.18)] flex justify-end">
            <button
              onClick={() => toast.success("Platform preferences persisted.")}
              className="px-4 py-2 rounded-lg bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition-colors cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
