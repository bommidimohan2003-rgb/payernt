import { useNavigate } from "@tanstack/react-router";
import {
  Camera,
  Mail,
  Phone,
  User as UserIcon,
  MapPin,
  Briefcase,
  Globe,
  ShieldCheck,
  Star,
  CheckCircle2,
  CreditCard,
  Building,
  Clock,
  Award,
  Navigation,
  LocateFixed,
  Key,
  Loader2,
  Lock,
  LogOut,
  Laptop,
  Smartphone,
  Trash2,
  Sparkles,
  Save,
  HelpCircle,
  Upload,
  X,
  AlertTriangle,
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { api } from "@/utils/api";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { CameraPhotoModal } from "@/components/profile/CameraPhotoModal";
import type { User, UserProfileStats } from "@/types";
import { cn } from "@/lib/utils";

export default function Profile() {
  const { user, ready, updateUser, logout, logoutAll, getSessions, revokeSession } = useAuth();
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "location" | "payout" | "security">("details");
  const [showPan, setShowPan] = useState(false);

  const [stats, setStats] = useState<UserProfileStats | null>(() => {
    return storage.get<UserProfileStats | null>("user_profile_stats", null);
  });
  const [loadingStats, setLoadingStats] = useState(() => {
    const cached = storage.get<UserProfileStats | null>("user_profile_stats", null);
    return !cached;
  });

  useEffect(() => {
    let isMounted = true;
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) {
      setLoadingStats(false);
      return;
    }
    api
      .getUserStats(token)
      .then((data) => {
        if (isMounted && data) {
          setStats(data);
          storage.set("user_profile_stats", data);
        }
      })
      .catch((err) => {
        console.warn("[Profile] Stats load notice:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingStats(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user?.email]);

  const [form, setForm] = useState(() => {
    const cachedUser = storage.get<User | null>(STORAGE_KEYS.currentUser, null);
    return {
      fullName: cachedUser?.fullName || user?.fullName || "",
      email: cachedUser?.email || user?.email || "",
      phone: cachedUser?.phone || user?.phone || "",
      occupation: cachedUser?.occupation || user?.occupation || "",
      bio: cachedUser?.bio || user?.bio || "",
      address: cachedUser?.address || user?.address || "",
      city: cachedUser?.city || user?.city || "",
      state: cachedUser?.state || user?.state || "",
      country: cachedUser?.country || user?.country || "India",
      pincode: cachedUser?.pincode || user?.pincode || "",
      latitude: (cachedUser?.latitude ?? user?.latitude) ?? null,
      longitude: (cachedUser?.longitude ?? user?.longitude) ?? null,
      website: cachedUser?.website || user?.website || "",
      upiId: cachedUser?.upiId || user?.upiId || "",
    };
  });

  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [sessions, setSessions] = useState<{
    id: string;
    deviceName: string;
    ipAddress: string;
    createdAt: string;
    lastUsedAt: string;
    expiresAt: string;
    isCurrent: boolean;
  }[]>([]);

  const fetchSessions = async () => {
    try {
      const list = await getSessions();
      setSessions(list || []);
    } catch (e) {
      console.warn("Notice: Failed to fetch sessions list:", e);
    }
  };

  useEffect(() => {
    if (ready && !user) {
      navigate({ to: "/login" });
      return;
    }
    if (user) {
      setForm({
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        occupation: user.occupation || "",
        bio: user.bio || "",
        address: user.address || "",
        city: user.city || "",
        state: user.state || "",
        country: user.country || "India",
        pincode: user.pincode || "",
        latitude: user.latitude ?? null,
        longitude: user.longitude ?? null,
        website: user.website || "",
        upiId: user.upiId || "",
      });
      fetchSessions();
    }
  }, [user, ready, navigate]);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeSession(sessionId);
      toast.success("Session revoked successfully.");
      fetchSessions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to revoke session.";
      toast.error(msg);
    }
  };

  const handleLogoutAllDevices = async () => {
    try {
      await logoutAll();
      toast.success("Logged out from all active devices.");
      navigate({ to: "/login" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to log out all devices.";
      toast.error(msg);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    updateUser(form);
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (token) {
      try {
        const updated = await api.updateProfile(token, form);
        if (updated) {
          updateUser(updated);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to sync profile.";
        console.warn("Notice: Profile sync issue:", msg);
      }
    }
    setLocationStatus(null);
    toast.success("Profile details saved successfully.");
  };

  const detectCurrentLocation = async () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      toast.error("Browser does not support geolocation detection.");
      return;
    }

    setDetectingLocation(true);
    setLocationStatus("Requesting browser location permission...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setForm((prev) => ({
          ...prev,
          latitude,
          longitude,
        }));

        toast.info(`Coordinates detected (${latitude.toFixed(4)}, ${longitude.toFixed(4)}). Fetching address...`);

        const token = storage.get<string | null>(STORAGE_KEYS.token, null);
        if (token) {
          try {
            const geo = await api.reverseGeocode(token, latitude, longitude);
            if (geo) {
              setForm((prev) => ({
                ...prev,
                address: geo.address || prev.address,
                city: geo.city || prev.city,
                state: geo.state || prev.state,
                country: geo.country || prev.country || "India",
                pincode: geo.pincode || prev.pincode,
                latitude,
                longitude,
              }));
              toast.success(`Location detected: ${geo.city || geo.address}. Review address below and click 'Save Location Details' to apply.`);
              setLocationStatus(`Location detected: ${geo.city || ""}${geo.state ? ", " + geo.state : ""}. (Not saved until you click Save)`);
            }
          } catch (e) {
            console.warn("Reverse geocode notice:", e);
            toast.info("GPS coordinates set. Please review and refine your address manually.");
            setLocationStatus(`GPS coordinates captured (${latitude.toFixed(4)}, ${longitude.toFixed(4)}). Review address and save.`);
          }
        } else {
          toast.info("GPS coordinates retrieved. Review details and click 'Save Details'.");
        }
        setDetectingLocation(false);
      },
      (error) => {
        setDetectingLocation(false);
        setLocationStatus(null);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Location permission was denied. You can enter your address manually.");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Location information is unavailable. You can enter your address manually.");
            break;
          case error.TIMEOUT:
            toast.error("Location detection request timed out. Please enter your address manually.");
            break;
          default:
            toast.error("Unable to obtain location. Please enter your address manually.");
            break;
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) {
      toast.error("Please enter your current password.");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }

    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) {
      toast.error("You must be logged in to change your password.");
      return;
    }

    setChangingPassword(true);
    try {
      await api.changePassword(
        token,
        passwordForm.currentPassword,
        passwordForm.newPassword,
        passwordForm.confirmPassword
      );
      toast.success("Password updated successfully.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to change password.";
      toast.error(msg);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleUploadPhoto = async (photoDataUrl: string) => {
    if (!user) return;
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    try {
      if (token) {
        const res = await api.uploadProfilePhoto(token, photoDataUrl);
        if (res && res.user) {
          updateUser(res.user);
        } else {
          updateUser({ avatar: photoDataUrl, profilePhotoUrl: photoDataUrl });
        }
      } else {
        updateUser({ avatar: photoDataUrl, profilePhotoUrl: photoDataUrl });
      }
      toast.success("Profile photo updated successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload profile photo.";
      toast.error(msg);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (JPEG, PNG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size exceeds 5MB limit. Please select a smaller photo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      handleUploadPhoto(dataUrl);
      setIsPhotoMenuOpen(false);
    };
    reader.onerror = () => {
      toast.error("Failed to read the selected image file.");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemovePhoto = async () => {
    if (!user) return;
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || user.email || "User")}&background=161616&color=ffffff`;
    try {
      if (token) {
        await api.updateProfile(token, { avatar: defaultAvatar, profilePhotoUrl: "" });
      }
      updateUser({ avatar: defaultAvatar, profilePhotoUrl: "", profile_photo_url: "" });
      setIsPhotoMenuOpen(false);
      toast.success("Profile photo removed.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove photo.";
      toast.error(msg);
    }
  };

  const hasRealPhoto = Boolean(
    user?.profilePhotoUrl ||
      user?.profile_photo_url ||
      (user?.avatar && !user.avatar.includes("ui-avatars.com")),
  );
  const activePhoto =
    user?.profilePhotoUrl || user?.profile_photo_url || user?.avatar;

  const isPendingApproval = user?.status === "pending";

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl mx-auto pb-12">
        {/* Hidden File Input for Upload Photo */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Pending Approval Notice Banner */}
        {isPendingApproval && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 sm:p-5 flex items-start gap-3.5 text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-600 dark:text-amber-400">
                Account Awaiting Administrative Approval
              </h4>
              <p className="text-xs text-amber-700/80 dark:text-amber-300/80 leading-relaxed">
                Your account registration has been submitted and is currently being verified by the Payent team. You can update your profile, take your identity photo, and browse equipment. Full rental and listing privileges will unlock once an admin approves your profile.
              </p>
            </div>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-extrabold text-foreground font-display tracking-tight">
                Profile & Identity
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                <span>{isPendingApproval ? "Pending Verification" : "Verified Account"}</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 font-medium">
              Manage your personal identity, device camera profile picture, payout channels, and security.
            </p>
          </div>

          <Button
            onClick={saveProfile}
            className="btn-gradient font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg active:scale-95 flex items-center justify-center gap-2 self-start md:self-auto cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>Save Profile Changes</span>
          </Button>
        </div>

        {/* Hero Glass Banner Card */}
        <div className="relative rounded-3xl overflow-hidden border border-border/80 bg-card/40 backdrop-blur-xl shadow-2xl">
          {/* Animated Gradient Cover */}
          <div className="h-44 sm:h-52 bg-gradient-to-r from-zinc-950 via-zinc-900 to-black relative p-6 flex items-start justify-between border-b border-border/50">
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none" />
            <div className="relative z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-extrabold shadow-md">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>{isPendingApproval ? "Pending Approval" : "Verified Creator & Lender"}</span>
            </div>
            <div className="relative z-10 text-right hidden sm:block">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">Account Status</span>
              <span className={cn(
                "text-xs font-black uppercase",
                isPendingApproval ? "text-amber-400" : "text-emerald-400"
              )}>
                {isPendingApproval ? "Pending Review" : "Active & Protected"}
              </span>
            </div>
          </div>

          {/* User Details Row */}
          <div className="p-6 sm:p-8 pt-0 relative flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-16 sm:-mt-20">
            {/* Avatar & Key Info */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 text-center sm:text-left">
              {/* Photo Box */}
              <div className="flex flex-col items-center gap-3 shrink-0 relative">
                <div className="h-32 w-32 sm:h-36 sm:w-36 rounded-3xl bg-secondary/80 border-4 border-card grid place-items-center text-foreground text-4xl font-extrabold shadow-2xl overflow-hidden relative group">
                  {hasRealPhoto ? (
                    <img
                      src={activePhoto}
                      alt={user?.fullName || "User Profile Photo"}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-3 text-center text-muted-foreground w-full h-full bg-secondary/90">
                      <Camera className="h-10 w-10 text-primary mb-1 animate-pulse" />
                      <span className="text-[11px] font-bold">No Photo</span>
                    </div>
                  )}
                  {/* Status Dot */}
                  <div
                    className={cn(
                      "absolute bottom-2 right-2 h-4 w-4 rounded-full border-2 border-card shadow-md",
                      isPendingApproval ? "bg-amber-500" : "bg-emerald-500"
                    )}
                    title={isPendingApproval ? "Pending Admin Approval" : "Active Account"}
                  />
                </div>

                {/* Change Photo Trigger with Dropdown Options */}
                <div className="relative w-full">
                  <button
                    type="button"
                    onClick={() => setIsPhotoMenuOpen(!isPhotoMenuOpen)}
                    className="w-full btn-gradient text-xs py-2 px-3.5 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-md hover:scale-102 active:scale-95 transition-all cursor-pointer"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Change Profile Photo</span>
                    <ChevronDown className="h-3 w-3 opacity-70" />
                  </button>

                  {/* Photo Options Menu */}
                  {isPhotoMenuOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-30 bg-card border border-border rounded-2xl p-1.5 shadow-2xl space-y-1 animate-in fade-in zoom-in-95 duration-150">
                      <button
                        type="button"
                        onClick={() => {
                          setIsPhotoMenuOpen(false);
                          setIsCameraOpen(true);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold rounded-xl text-foreground hover:bg-secondary flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Camera className="h-3.5 w-3.5 text-primary" />
                        <span>Take Photo</span>
                      </button>

                      {hasRealPhoto && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="w-full text-left px-3 py-2 text-xs font-bold rounded-xl text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          <span>Remove Photo</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bio & Identity Chips */}
              <div className="space-y-2.5 pb-2">
                <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
                  <h2 className="text-2xl sm:text-3xl font-black text-foreground font-display tracking-tight">
                    {user?.fullName || "Verified User"}
                  </h2>
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border",
                    isPendingApproval
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  )}>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>{isPendingApproval ? "Pending Verification" : "Identity Verified"}</span>
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground font-semibold flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4 text-primary shrink-0" />
                    <span>{form.occupation}</span>
                  </span>
                  <span className="hidden sm:inline">·</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{form.address || form.city || "India"}</span>
                  </span>
                </p>

                {/* Identity Summary Badges */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
                  <div className="px-3 py-1 rounded-xl bg-secondary/80 border border-border text-xs font-medium text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    <span>PAN: <strong className="font-mono text-foreground font-bold">{user?.panMasked || (user?.panNumber ? `XXXXX${user.panNumber.slice(-5)}` : "Not linked")}</strong></span>
                  </div>
                  <div className="px-3 py-1 rounded-xl bg-secondary/80 border border-border text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-primary" />
                    <span className="text-foreground font-semibold">{user?.email || "—"}</span>
                  </div>
                  <div className="px-3 py-1 rounded-xl bg-secondary/80 border border-border text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-purple-500" />
                    <span className="text-foreground font-semibold">{user?.phone || "Not provided"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Marketplace Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 mx-6 mb-6 rounded-2xl bg-secondary/30 border border-border/60 text-center backdrop-blur-md">
            {/* Metric 1: Completed Rentals */}
            <div className="p-2 space-y-0.5">
              {loadingStats ? (
                <div className="h-7 w-12 bg-secondary/80 animate-pulse rounded-lg mx-auto" />
              ) : (
                <div className="text-xl font-black text-foreground font-display">
                  {stats?.completed_rentals ?? 0}
                </div>
              )}
              <div className="text-xs font-semibold text-muted-foreground">Completed Rentals</div>
            </div>

            {/* Metric 2: Lender Rating & Reviews */}
            <div className="p-2 space-y-0.5">
              {loadingStats ? (
                <div className="h-7 w-16 bg-secondary/80 animate-pulse rounded-lg mx-auto" />
              ) : (
                <div className="text-xl font-black text-foreground font-display flex items-center justify-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span>
                    {stats?.lender_rating !== null && stats?.lender_rating !== undefined
                      ? stats.lender_rating.toFixed(1)
                      : "New"}
                  </span>
                </div>
              )}
              <div className="text-xs font-semibold text-muted-foreground">
                {stats?.review_count && stats.review_count > 0
                  ? `Lender Rating (${stats.review_count})`
                  : "No ratings yet"}
              </div>
            </div>

            {/* Metric 3: On-Time Return Rate */}
            <div className="p-2 space-y-0.5">
              {loadingStats ? (
                <div className="h-7 w-14 bg-secondary/80 animate-pulse rounded-lg mx-auto" />
              ) : (
                <div className="text-xl font-black text-foreground font-display flex items-center justify-center gap-1">
                  <Award className="h-4 w-4 text-emerald-500" />
                  <span>
                    {stats?.on_time_return_rate !== null && stats?.on_time_return_rate !== undefined
                      ? `${stats.on_time_return_rate}%`
                      : "N/A"}
                  </span>
                </div>
              )}
              <div className="text-xs font-semibold text-muted-foreground">
                {stats?.on_time_return_rate !== null && stats?.on_time_return_rate !== undefined
                  ? "On-Time Return Rate"
                  : "No return history"}
              </div>
            </div>

            {/* Metric 4: Avg Response Time */}
            <div className="p-2 space-y-0.5">
              {loadingStats ? (
                <div className="h-7 w-14 bg-secondary/80 animate-pulse rounded-lg mx-auto" />
              ) : (
                <div className="text-xl font-black text-foreground font-display flex items-center justify-center gap-1">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>
                    {stats?.average_response_time_minutes !== null && stats?.average_response_time_minutes !== undefined
                      ? stats.average_response_time_minutes < 60
                        ? `< 1 hr`
                        : `${Math.round(stats.average_response_time_minutes / 60)} hrs`
                      : "No data"}
                  </span>
                </div>
              )}
              <div className="text-xs font-semibold text-muted-foreground">Avg Response Time</div>
            </div>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("details")}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "details"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <UserIcon className="h-4 w-4" />
            <span>General Creator Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("location")}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "location"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <MapPin className="h-4 w-4" />
            <span>Realtime Location & Address</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("payout")}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "payout"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>Payout & Contact</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "security"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Lock className="h-4 w-4" />
            <span>Security & Devices</span>
          </button>
        </div>

        {/* Content Section Grid */}
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Left 2 Columns: Active Tab Form Container */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === "details" && (
              <div className="card-premium p-6 sm:p-8 border border-border/80 space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-primary" />
                    <h3 className="font-extrabold text-lg text-foreground">
                      General Creator Details
                    </h3>
                  </div>
                  <span className="text-xs text-muted-foreground font-semibold">
                    Public Marketplace Info
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <Input
                    label="Full Name"
                    icon={<UserIcon className="h-4 w-4" />}
                    value={form.fullName}
                    onChange={(e) =>
                      setForm({ ...form, fullName: e.target.value })
                    }
                  />
                  <Input
                    label="Role / Occupation"
                    icon={<Briefcase className="h-4 w-4" />}
                    value={form.occupation}
                    onChange={(e) =>
                      setForm({ ...form, occupation: e.target.value })
                    }
                  />
                </div>

                {/* Bio Textarea */}
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-foreground flex items-center justify-between">
                    <span>Creator Bio / Rental Notes</span>
                    <span className="text-[11px] text-muted-foreground font-normal">
                      {(form.bio || "").length} characters
                    </span>
                  </label>
                  <textarea
                    rows={4}
                    value={form.bio || ""}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    placeholder="Tell renters about your filmmaking background and equipment care guidelines..."
                    className="w-full bg-secondary/50 text-foreground text-xs rounded-2xl p-4 border border-border focus:outline-none focus:border-primary transition-all font-medium resize-none"
                  />
                </div>

                <Input
                  label="Portfolio / Showreel URL"
                  icon={<Globe className="h-4 w-4" />}
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://yourportfolio.com"
                />

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={saveProfile}
                    size="sm"
                    className="font-bold text-xs px-6 py-2.5"
                  >
                    Save Creator Info
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "location" && (
              <div className="card-premium p-6 sm:p-8 border border-border/80 space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-4 border-b border-border flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-emerald-500" />
                    <h3 className="font-extrabold text-lg text-foreground">
                      Realtime Location & Address
                    </h3>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={detectingLocation}
                    onClick={detectCurrentLocation}
                    className="gap-2 font-bold text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer py-2 px-4"
                  >
                    {detectingLocation ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Detecting GPS...</span>
                      </>
                    ) : (
                      <>
                        <LocateFixed className="h-4 w-4 text-emerald-500" />
                        <span>Use Current Location</span>
                      </>
                    )}
                  </Button>
                </div>

                {locationStatus && (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Navigation className="h-4 w-4 shrink-0" />
                      <span>{locationStatus}</span>
                    </div>
                    {form.latitude !== null && form.longitude !== null && (
                      <span className="text-[10px] font-mono opacity-80 shrink-0">
                        GPS: {form.latitude.toFixed(4)}, {form.longitude.toFixed(4)}
                      </span>
                    )}
                  </div>
                )}

                <Input
                  label="Street Address / Location"
                  icon={<MapPin className="h-4 w-4" />}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="e.g. 123 Indiranagar, 100ft Road"
                />

                <div className="grid sm:grid-cols-2 gap-5">
                  <Input
                    label="Primary City"
                    icon={<Building className="h-4 w-4" />}
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="e.g. Bengaluru"
                  />
                  <Input
                    label="State / Region"
                    icon={<MapPin className="h-4 w-4" />}
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    placeholder="e.g. Karnataka"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <Input
                    label="Country"
                    icon={<Globe className="h-4 w-4" />}
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    placeholder="e.g. India"
                  />
                  <Input
                    label="Pincode / Postal Code"
                    icon={<MapPin className="h-4 w-4" />}
                    value={form.pincode}
                    onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                    placeholder="e.g. 560038"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={saveProfile}
                    size="sm"
                    className="font-bold text-xs px-6 py-2.5"
                  >
                    Save Location Details
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "payout" && (
              <div className="card-premium p-6 sm:p-8 border border-border/80 space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <h3 className="font-extrabold text-lg text-foreground">
                      Contact & Payout Channels
                    </h3>
                  </div>
                  <span className="text-xs text-muted-foreground font-semibold">
                    Financial & Settlement
                  </span>
                </div>

                <div className="grid sm:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        PAN Number
                      </span>
                      {user?.panNumber && user.panNumber.length > 5 && (
                        <button
                          type="button"
                          onClick={() => setShowPan(!showPan)}
                          className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
                        >
                          {showPan ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          {showPan ? "Mask" : "Show Full"}
                        </button>
                      )}
                    </label>
                    <Input
                      value={
                        showPan
                          ? user?.panNumber || user?.panMasked || "XXXXX1234F"
                          : user?.panMasked || (user?.panNumber ? `XXXXX${user.panNumber.slice(-5)}` : "XXXXX1234F")
                      }
                      disabled
                      className="font-mono uppercase font-bold tracking-wider"
                    />
                  </div>
                  <Input
                    label="Email Address"
                    icon={<Mail className="h-4 w-4" />}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    disabled
                  />
                  <Input
                    label="Phone Number"
                    icon={<Phone className="h-4 w-4" />}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>

                <Input
                  label="Lender Payout UPI ID (For Rental Earnings)"
                  icon={<CreditCard className="h-4 w-4" />}
                  value={form.upiId}
                  onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                  placeholder="you@upi"
                />

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={saveProfile}
                    size="sm"
                    className="font-bold text-xs px-6 py-2.5"
                  >
                    Update Payout Info
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Security & Password Change */}
                <div className="card-premium p-6 sm:p-8 border border-border/80 space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Lock className="h-5 w-5 text-primary" />
                      <h3 className="font-extrabold text-lg text-foreground">
                        Security & Password
                      </h3>
                    </div>
                    <span className="text-xs text-muted-foreground font-semibold">
                      Account Protection
                    </span>
                  </div>

                  <form onSubmit={handlePasswordChange} className="space-y-5">
                    <Input
                      type="password"
                      label="Current Password"
                      icon={<Key className="h-4 w-4" />}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                    />

                    <div className="grid sm:grid-cols-2 gap-5">
                      <Input
                        type="password"
                        label="New Password"
                        icon={<Lock className="h-4 w-4" />}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        placeholder="At least 6 characters"
                      />
                      <Input
                        type="password"
                        label="Confirm New Password"
                        icon={<Lock className="h-4 w-4" />}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        placeholder="Repeat new password"
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        type="submit"
                        disabled={changingPassword}
                        size="sm"
                        className="font-bold text-xs px-6 py-2.5"
                      >
                        {changingPassword ? "Updating Password..." : "Update Password"}
                      </Button>
                    </div>
                  </form>
                </div>

                {/* Active Sessions & Devices */}
                <div className="card-premium p-6 sm:p-8 border border-border/80 space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-border flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Laptop className="h-5 w-5 text-primary" />
                      <h3 className="font-extrabold text-lg text-foreground">
                        Active Devices & Multi-Sessions
                      </h3>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleLogoutAllDevices}
                      className="font-bold text-xs text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer py-2 px-4"
                    >
                      Log Out All Other Devices
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground font-medium">
                    Manage active multi-device logins. Each active session uses a 30-minute access token and a 7-day refresh session.
                  </p>

                  <div className="space-y-3">
                    {sessions.length > 0 ? (
                      sessions.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between p-4 rounded-2xl bg-secondary/40 border border-border/60 flex-wrap gap-4"
                        >
                          <div className="flex items-center gap-3.5">
                            {s.deviceName?.includes("Mobile") ? (
                              <Smartphone className="h-6 w-6 text-emerald-500 shrink-0" />
                            ) : (
                              <Laptop className="h-6 w-6 text-emerald-500 shrink-0" />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-foreground">
                                  {s.deviceName || "Web Browser"}
                                </p>
                                {s.isCurrent && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase">
                                    Current Device
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                                IP: {s.ipAddress || "127.0.0.1"} · Last active:{" "}
                                {s.lastUsedAt ? new Date(s.lastUsedAt).toLocaleString() : "Recently"}
                              </p>
                            </div>
                          </div>

                          {!s.isCurrent && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevokeSession(s.id)}
                              className="text-xs font-bold text-destructive hover:bg-destructive/10 cursor-pointer gap-1.5"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>Revoke Session</span>
                            </Button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-4 rounded-2xl bg-secondary/20 border border-border text-center text-xs text-muted-foreground font-medium">
                        Active device session securely stored (30-min access / 7-day refresh).
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Verification & Trust Badges */}
          <div className="space-y-6">
            {/* Verification Status Card */}
            <div className="card-premium p-6 border border-border/80 space-y-5">
              <h3 className="font-extrabold text-base text-foreground flex items-center gap-2 border-b border-border pb-3">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <span>Verification & Trust Status</span>
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/40 border border-border/60">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        Govt PAN Card Verification
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium font-mono">
                        PAN: {user?.panMasked || (user?.panNumber ? `XXXXX${user.panNumber.slice(-5)}` : "XXXXX1234F")} (Verified)
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-emerald-500 uppercase">
                    Verified
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/40 border border-border/60">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        Phone & Email Check
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        OTP & Security confirmed
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-emerald-500 uppercase">
                    Verified
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/40 border border-border/60">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        Equipment Protection Shield
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        ₹5,00,000 Equipment Coverage
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-emerald-500 uppercase">
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* Handover & Pickup Info */}
            <div className="card-premium p-6 border border-border/80 space-y-4">
              <h3 className="font-extrabold text-base text-foreground flex items-center gap-2 border-b border-border pb-3">
                <MapPin className="h-5 w-5 text-primary" />
                <span>Handover Preferences</span>
              </h3>

              <div className="space-y-3 text-xs font-medium">
                <div className="flex justify-between text-muted-foreground">
                  <span>Handover Mode:</span>
                  <span className="font-bold text-foreground">
                    Self Pickup / Local Courier
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Pickup Operating Hours:</span>
                  <span className="font-bold text-foreground">
                    09:00 AM - 08:00 PM
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Deposit Security:</span>
                  <span className="font-bold text-foreground">
                    Zero-Hold Authorization
                  </span>
                </div>
              </div>
            </div>

            {/* Support Callout */}
            <div className="card-premium p-6 border border-border/80 bg-secondary/30 space-y-3 text-center">
              <HelpCircle className="h-8 w-8 text-primary mx-auto opacity-90" />
              <h4 className="text-xs font-extrabold text-foreground">
                Need help updating account credentials?
              </h4>
              <p className="text-[11px] text-muted-foreground font-medium">
                Contact Payent 24/7 Creator Support for GST billing updates or identity re-verification.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ to: "/contact" })}
                className="w-full font-bold text-xs mt-2 py-2"
              >
                Contact Support
              </Button>
            </div>

            {/* Account Security & Sign Out Section */}
            <div className="card-premium p-6 border border-destructive/30 bg-destructive/5 space-y-4">
              <div>
                <h3 className="font-extrabold text-sm text-destructive flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  <span>Account Session</span>
                </h3>
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  Logged in as <span className="font-bold text-foreground">{user?.email}</span>.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => {
                  logout();
                  toast.success("Logged out successfully.");
                  navigate({ to: "/" });
                }}
                className="w-full font-bold text-xs flex items-center justify-center gap-2 py-2.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Log Out of Payent</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <CameraPhotoModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleUploadPhoto}
      />
    </DashboardLayout>
  );
}
