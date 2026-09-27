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
    navigate({ to: "/" });
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
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground font-display">
            Administrator Profile
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage authenticated administrator credentials, contact information, and security keys.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-[#FF1744] text-xs font-semibold transition-all cursor-pointer self-start sm:self-auto"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="p-3.5 rounded-lg bg-destructive/10 border border-[#FF1744]/30 text-[#FF1744] text-xs font-medium flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchProfile} className="underline font-bold cursor-pointer">Retry</button>
        </div>
      )}

      {profile && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* PROFILE SUMMARY CARD */}
          <div className="p-5 bg-card rounded-xl border border-border/70 shadow-2xs space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="h-14 w-14 rounded-lg bg-secondary border border-border/70 flex items-center justify-center font-bold text-lg text-foreground overflow-hidden shrink-0">
                {profile.avatar || profile.profilePhotoUrl ? (
                  <img src={profile.avatar || profile.profilePhotoUrl} alt={profile.fullName} className="h-full w-full object-cover" />
                ) : (
                  <span>{(profile.fullName || profile.email).charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground truncate">{profile.fullName || "Administrator"}</h3>
                <p className="text-xs text-muted-foreground font-mono truncate">{profile.email}</p>
                <span className="mt-1.5 inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-secondary border border-border/60 text-foreground">
                  {profile.role || "admin"}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-secondary/30 border border-border/50 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Admin ID</span>
                <span className="font-mono font-semibold text-foreground">{profile.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Session Status</span>
                <span className="font-semibold text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Active
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Registered</span>
                <span className="font-mono text-muted-foreground">{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}</span>
              </div>
            </div>
          </div>

          {/* EDIT CREDENTIALS & PASSWORD */}
          <div className="lg:col-span-2 space-y-6">
            {/* PROFILE DETAILS FORM */}
            <div className="p-5 bg-card rounded-xl border border-border/70 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                <User className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-foreground">Identity & Contact Information</h3>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Full Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 text-foreground font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 text-foreground font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 text-foreground font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={updatingProfile}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {updatingProfile ? "Saving..." : "Save Identity Changes"}
                  </button>
                </div>
              </form>
            </div>

            {/* PASSWORD FORM */}
            <div className="p-5 bg-card rounded-xl border border-border/70 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                <Key className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-foreground">Password & Security Key Rotation</h3>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 text-foreground font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 text-foreground font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 text-foreground font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={updatingPassword}
                    className="px-4 py-2 rounded-lg bg-foreground hover:bg-foreground/90 text-background font-semibold text-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {updatingPassword ? "Rotating Password..." : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
