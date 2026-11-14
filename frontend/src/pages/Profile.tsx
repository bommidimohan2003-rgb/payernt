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
  Save,
  HelpCircle,
  Upload,
  X,
  AlertTriangle,
  ChevronDown,
  Eye,
  EyeOff,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useState, useRef } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { BackButton } from "@/components/common/BackButton";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { api } from "@/utils/api";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { ProfilePhoto, isRealProfilePhoto } from "@/components/common/ProfilePhoto";
import { ProfilePhotoModal } from "@/components/profile/ProfilePhotoModal";
import { parseKycStatusResponse, type NormalizedKycStatus } from "@/utils/kyc";
import type { User, UserProfileStats } from "@/types";
import { cn } from "@/lib/utils";

export default function Profile() {
  const { user, ready, updateUser, logout, logoutAll, getSessions, revokeSession } = useAuth();
  const navigate = useNavigate();

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "location" | "payout" | "security">("details");
  const [showPan, setShowPan] = useState(false);

  const [stats, setStats] = useState<UserProfileStats | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const loadUserStats = useCallback(() => {
    const cached = storage.get<UserProfileStats | null>("user_profile_stats", null);
    if (cached) {
      setStats(cached);
    }
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) {
      setLoadingStats(false);
      setStatsError(null);
      return;
    }
    setStatsError(null);
    api
      .getUserStats(token)
      .then((data) => {
        if (data) {
          setStats(data);
          storage.set("user_profile_stats", data);
        }
      })
      .catch((err) => {
        console.warn("[Profile] Stats load notice:", err);
        setStatsError(
          err instanceof Error && err.message
            ? err.message
            : "Unable to load marketplace stats."
        );
      })
      .finally(() => {
        setLoadingStats(false);
      });
  }, []);

  useEffect(() => {
    loadUserStats();
  }, [user?.email, loadUserStats]);

  const [kycData, setKycData] = useState<NormalizedKycStatus | null>(null);
  const [kycLoading, setKycLoading] = useState<boolean>(false);
  const [kycError, setKycError] = useState<string | null>(null);

  const loadKycStatus = useCallback(async () => {
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) {
      setKycData(null);
      setKycError(null);
      setKycLoading(false);
      return;
    }
    setKycLoading(true);
    setKycError(null);
    try {
      const res = await api.getKycStatus(token);
      const parsed = parseKycStatusResponse(res);
      if (!parsed) {
        setKycData(null);
        setKycError("Invalid KYC status response received.");
      } else {
        setKycData(parsed);
      }
    } catch (err: unknown) {
      console.warn("[Profile] KYC status load notice:", err);
      setKycData(null);
      setKycError(
        err instanceof Error && err.message
          ? err.message
          : "Unable to load KYC verification status."
      );
    } finally {
      setKycLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadKycStatus();
    if (typeof window === "undefined") return;
    const handleKycUpdated = () => {
      void loadKycStatus();
    };
    window.addEventListener("payent_kyc_updated", handleKycUpdated);
    return () => {
      window.removeEventListener("payent_kyc_updated", handleKycUpdated);
    };
  }, [user?.email, loadKycStatus]);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    occupation: "",
    bio: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
    latitude: null as number | null,
    longitude: null as number | null,
    website: "",
    upiId: "",
  });

  useEffect(() => {
    const cachedUser = storage.get<User | null>(STORAGE_KEYS.currentUser, null);
    if (!cachedUser) return;
    setForm((prev) => ({
      ...prev,
      fullName: cachedUser.fullName || prev.fullName,
      email: cachedUser.email || prev.email,
      phone: cachedUser.phone || prev.phone,
      occupation: cachedUser.occupation || prev.occupation,
      bio: cachedUser.bio || prev.bio,
      address: cachedUser.address || prev.address,
      city: cachedUser.city || prev.city,
      state: cachedUser.state || prev.state,
      country: cachedUser.country || prev.country || "India",
      pincode: cachedUser.pincode || prev.pincode,
      latitude: cachedUser.latitude ?? prev.latitude ?? null,
      longitude: cachedUser.longitude ?? prev.longitude ?? null,
      website: cachedUser.website || prev.website,
      upiId: cachedUser.upiId || prev.upiId,
    }));
  }, []);

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
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (token) {
      try {
        const updated = await api.updateProfile(token, form);
        updateUser(updated || form);
        setLocationStatus(null);
        toast.success("Profile details saved successfully.");
      } catch (err: unknown) {
        const msg =
          err instanceof Error && err.message
            ? err.message
            : "Failed to save profile details.";
        toast.error(msg);
      }
      return;
    }
    updateUser(form);
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
        const savedUrl =
          res?.profile_photo_url ||
          res?.profilePhotoUrl ||
          res?.avatar ||
          res?.user?.profilePhotoUrl ||
          res?.user?.profile_photo_url ||
          res?.user?.avatar ||
          photoDataUrl;
        updateUser({
          ...(res?.user || {}),
          avatar: savedUrl,
          profilePhotoUrl: savedUrl,
          profile_photo_url: savedUrl,
        });
      } else {
        updateUser({ avatar: photoDataUrl, profilePhotoUrl: photoDataUrl, profile_photo_url: photoDataUrl });
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("payent:profile_photo_updated"));
        window.dispatchEvent(new CustomEvent("payent:storage_change"));
      }
      toast.success("Profile photo updated");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload profile photo.";
      toast.error(msg);
      throw err;
    }
  };

  const handleRemovePhoto = async () => {
    if (!user) return;
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    try {
      if (token) {
        await api.deleteProfilePhoto(token);
      }
      updateUser({ avatar: "", profilePhotoUrl: "", profile_photo_url: "" });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("payent:profile_photo_updated"));
        window.dispatchEvent(new CustomEvent("payent:storage_change"));
      }
      toast.success("Profile photo removed.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove photo.";
      toast.error(msg);
      throw err;
    }
  };

  const hasRealPhoto = isRealProfilePhoto(user?.profilePhotoUrl || user?.profile_photo_url || user?.avatar);
  const activePhoto = hasRealPhoto ? (user?.profilePhotoUrl || user?.profile_photo_url || user?.avatar) : null;

  const isPendingApproval = user?.status === "pending";

  if (!ready && !user) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-neutral-600 dark:text-neutral-400">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-900 dark:text-white" aria-hidden="true" />
          <p className="text-xs font-medium">Loading your profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl mx-auto pb-12">

        {/* Pending Approval Notice Banner */}
        {isPendingApproval && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 sm:p-5 flex items-start gap-3.5 text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-amber-800 dark:text-amber-300">
                Account Awaiting Administrative Approval
              </h2>
              <p className="text-xs text-amber-800/90 dark:text-amber-200/90 leading-relaxed">
                Your account registration has been submitted and is currently being verified by the paYent team. You can update your profile, take your identity photo, and browse equipment. Full listing and rental privileges unlock once approved.
              </p>
            </div>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BackButton fallback="/categories" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-950 dark:text-white font-display tracking-tight">
                Profile &amp; Identity
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 font-medium">
                Manage your personal identity, profile picture, payout channels, and security.
              </p>
            </div>
          </div>

          <Button
            onClick={saveProfile}
            className="min-h-[42px] bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 font-semibold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 self-start md:self-auto cursor-pointer"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            <span>Save Profile Changes</span>
          </Button>
        </div>

        {/* Profile Overview Surface (Monochrome — zero overlapping -mt-16 occlusion) */}
        <div className="rounded-3xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] shadow-xs">
          {/* Clean Header Strip */}
          <div className="px-6 py-4 bg-neutral-950 dark:bg-[#1E1E1E] text-white flex items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800">
            <div className="inline-flex items-center gap-2 text-xs font-semibold">
              <CheckCircle2
                className={cn("h-4 w-4 shrink-0", isPendingApproval ? "text-amber-400" : "text-emerald-400")}
                aria-hidden="true"
              />
              <span>{isPendingApproval ? "Pending Verification" : "Creator & Lender Account"}</span>
            </div>
            <div className="text-right hidden sm:flex items-center gap-2 text-xs">
              <span className="text-neutral-400 font-medium">Account Status:</span>
              <span
                className={cn(
                  "font-semibold",
                  isPendingApproval ? "text-amber-400" : "text-emerald-400"
                )}
              >
                {isPendingApproval ? "Pending Review" : "Active"}
              </span>
            </div>
          </div>

          {/* User Details Row */}
          <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Real Profile Photo & Key Info */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
              {/* Photo Box */}
              <div className="flex flex-col items-center gap-3 shrink-0">
                <ProfilePhoto
                  src={activePhoto}
                  alt={user?.fullName || "User Profile Photo"}
                  size="2xl"
                  shape="rounded"
                  editable
                  onEdit={() => setIsPhotoModalOpen(true)}
                  status={isPendingApproval ? "pending" : "active"}
                  statusTitle={isPendingApproval ? "Pending Admin Approval" : "Active Account"}
                  className="border-2 border-neutral-200 dark:border-neutral-800 shadow-sm"
                />

                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="w-full min-h-[40px] bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 text-xs py-2 px-3.5 rounded-xl font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Take Selfie</span>
                </button>
              </div>

              {/* Bio & Identity Chips */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
                  <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-950 dark:text-white font-display tracking-tight">
                    {user?.fullName || "Account Holder"}
                  </h2>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border",
                      isPendingApproval
                        ? "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30"
                        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                    )}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{isPendingApproval ? "Pending Verification" : "Identity Verified"}</span>
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 font-medium flex items-center gap-2.5 justify-center sm:justify-start flex-wrap">
                  {form.occupation && (
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4 text-neutral-700 dark:text-neutral-300 shrink-0" aria-hidden="true" />
                      <span>{form.occupation}</span>
                    </span>
                  )}
                  {form.occupation && <span className="hidden sm:inline" aria-hidden="true">·</span>}
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-neutral-700 dark:text-neutral-300 shrink-0" aria-hidden="true" />
                    <span>{form.address || form.city || "India"}</span>
                  </span>
                </p>

                {/* Identity Summary Badges */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <div className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700/80 text-xs font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300" aria-hidden="true" />
                    <span>
                      PAN:{" "}
                      <strong className="font-mono text-neutral-950 dark:text-white font-bold">
                        {kycLoading
                          ? "Checking..."
                          : kycError
                          ? "Unavailable"
                          : kycData?.maskedNumber ||
                            user?.panMasked ||
                            (user?.panNumber ? `XXXXX${user.panNumber.slice(-5)}` : "Not linked")}
                      </strong>
                    </span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700/80 text-xs font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300" aria-hidden="true" />
                    <span className="font-semibold">{user?.email || "—"}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700/80 text-xs font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300" aria-hidden="true" />
                    <span className="font-semibold">{user?.phone || "Not provided"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Marketplace Stats Row */}
          {statsError && !stats && !loadingStats ? (
            <div className="flex items-center justify-between gap-3 p-4 mx-3 sm:mx-6 mb-4 sm:mb-6 rounded-2xl bg-red-500/10 border border-red-500/25 text-xs">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-medium">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{statsError}</span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setLoadingStats(true);
                  loadUserStats();
                }}
                className="text-xs font-bold shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Retry</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4 mx-3 sm:mx-6 mb-4 sm:mb-6 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700/80 text-center">
              {/* Metric 1: Completed Rentals */}
              <div className="p-2 space-y-0.5">
                {loadingStats ? (
                  <div className="h-7 w-12 bg-neutral-200 dark:bg-neutral-800 rounded-lg mx-auto" />
                ) : (
                  <div className="text-xl font-semibold text-neutral-950 dark:text-white font-display tabular-nums">
                    {stats?.completed_rentals ?? 0}
                  </div>
                )}
                <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Completed Rentals</div>
              </div>

              {/* Metric 2: Lender Rating & Reviews */}
              <div className="p-2 space-y-0.5">
                {loadingStats ? (
                  <div className="h-7 w-16 bg-neutral-200 dark:bg-neutral-800 rounded-lg mx-auto" />
                ) : (
                  <div className="text-xl font-semibold text-neutral-950 dark:text-white font-display flex items-center justify-center gap-1 tabular-nums">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                    <span>
                      {stats?.lender_rating !== null && stats?.lender_rating !== undefined
                        ? stats.lender_rating.toFixed(1)
                        : "New"}
                    </span>
                  </div>
                )}
                <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  {stats?.review_count && stats.review_count > 0
                    ? `Lender Rating (${stats.review_count})`
                    : "No ratings yet"}
                </div>
              </div>

              {/* Metric 3: On-Time Return Rate */}
              <div className="p-2 space-y-0.5">
                {loadingStats ? (
                  <div className="h-7 w-14 bg-neutral-200 dark:bg-neutral-800 rounded-lg mx-auto" />
                ) : (
                  <div className="text-xl font-semibold text-neutral-950 dark:text-white font-display flex items-center justify-center gap-1 tabular-nums">
                    <Award className="h-4 w-4 text-neutral-700 dark:text-neutral-300 stroke-[1.75]" aria-hidden="true" />
                    <span>
                      {stats?.on_time_return_rate !== null && stats?.on_time_return_rate !== undefined
                        ? `${stats.on_time_return_rate}%`
                        : "N/A"}
                    </span>
                  </div>
                )}
                <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  {stats?.on_time_return_rate !== null && stats?.on_time_return_rate !== undefined
                    ? "On-Time Return Rate"
                    : "No return history"}
                </div>
              </div>

              {/* Metric 4: Avg Response Time */}
              <div className="p-2 space-y-0.5">
                {loadingStats ? (
                  <div className="h-7 w-14 bg-neutral-200 dark:bg-neutral-800 rounded-lg mx-auto" />
                ) : (
                  <div className="text-xl font-semibold text-neutral-950 dark:text-white font-display flex items-center justify-center gap-1 tabular-nums">
                    <Clock className="h-4 w-4 text-neutral-700 dark:text-neutral-300 stroke-[1.75]" aria-hidden="true" />
                    <span>
                      {stats?.average_response_time_minutes !== null && stats?.average_response_time_minutes !== undefined
                        ? stats.average_response_time_minutes < 60
                          ? `< 1 hr`
                          : `${Math.round(stats.average_response_time_minutes / 60)} hrs`
                        : "No data"}
                    </span>
                  </div>
                )}
                <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Avg Response Time</div>
              </div>
            </div>
          )}
        </div>

        {/* Section Navigation Tabs */}
        <div role="tablist" aria-label="Profile sections" className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2 overflow-x-auto">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "details"}
            onClick={() => setActiveTab("details")}
            className={cn(
              "min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap",
              activeTab === "details"
                ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-xs"
                : "bg-neutral-100 dark:bg-[#262626] text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-200/70 dark:hover:bg-[#2E2E2E]"
            )}
          >
            <UserIcon className="h-4 w-4" aria-hidden="true" />
            <span>General Creator Details</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "location"}
            onClick={() => setActiveTab("location")}
            className={cn(
              "min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap",
              activeTab === "location"
                ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-xs"
                : "bg-neutral-100 dark:bg-[#262626] text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-200/70 dark:hover:bg-[#2E2E2E]"
            )}
          >
            <MapPin className="h-4 w-4" aria-hidden="true" />
            <span>Realtime Location &amp; Address</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "payout"}
            onClick={() => setActiveTab("payout")}
            className={cn(
              "min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap",
              activeTab === "payout"
                ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-xs"
                : "bg-neutral-100 dark:bg-[#262626] text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-200/70 dark:hover:bg-[#2E2E2E]"
            )}
          >
            <CreditCard className="h-4 w-4" aria-hidden="true" />
            <span>Payout &amp; Contact</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "security"}
            onClick={() => setActiveTab("security")}
            className={cn(
              "min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap",
              activeTab === "security"
                ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-xs"
                : "bg-neutral-100 dark:bg-[#262626] text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-200/70 dark:hover:bg-[#2E2E2E]"
            )}
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            <span>Security &amp; Devices</span>
          </button>
        </div>

        {/* Content Section Grid */}
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Left 2 Columns: Active Tab Form Container */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === "details" && (
              <div className="relative rounded-2xl sm:rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] pt-5 sm:pt-6 p-6 sm:p-8 space-y-6 text-left">
                <div className="absolute -top-3 left-4 px-2 bg-white dark:bg-[#1E1E1E] flex items-center gap-1.5 z-10 pointer-events-none select-none">
                  <UserIcon className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300 stroke-[1.75]" aria-hidden="true" />
                  <span className="text-xs sm:text-[13px] font-semibold text-neutral-950 dark:text-white">
                    General Creator Details
                  </span>
                </div>
                <div className="absolute -top-3 right-4 px-1.5 bg-white dark:bg-[#1E1E1E] z-10">
                  <span className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">
                    Public Marketplace Info
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <Input
                    label="Full Name"
                    icon={<UserIcon className="h-4 w-4" />}
                    cutoutBgClass="bg-white dark:bg-[#1E1E1E]"
                    value={form.fullName}
                    onChange={(e) =>
                      setForm({ ...form, fullName: e.target.value })
                    }
                  />
                  <Input
                    label="Role / Occupation"
                    icon={<Briefcase className="h-4 w-4" />}
                    cutoutBgClass="bg-white dark:bg-[#1E1E1E]"
                    value={form.occupation}
                    onChange={(e) =>
                      setForm({ ...form, occupation: e.target.value })
                    }
                  />
                </div>

                {/* Bio Textarea */}
                <div className="space-y-2">
                  <label
                    htmlFor="profile-bio-input"
                    className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center justify-between"
                  >
                    <span>Creator Bio / Rental Notes</span>
                    <span className="text-xs text-neutral-600 dark:text-neutral-400 font-normal tabular-nums">
                      {(form.bio || "").length} characters
                    </span>
                  </label>
                  <textarea
                    id="profile-bio-input"
                    rows={4}
                    value={form.bio || ""}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    placeholder="Tell renters about your filmmaking background and equipment care guidelines..."
                    className="w-full bg-neutral-50 dark:bg-[#262626] text-neutral-950 dark:text-white placeholder:text-neutral-500 text-xs rounded-2xl p-4 border border-neutral-200 dark:border-neutral-700/80 focus:outline-none focus:border-neutral-950 dark:focus:border-white transition-colors font-medium resize-none"
                  />
                </div>

                <Input
                  label="Portfolio / Showreel URL"
                  icon={<Globe className="h-4 w-4" />}
                  cutoutBgClass="bg-white dark:bg-[#1E1E1E]"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://yourportfolio.com"
                />

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={saveProfile}
                    size="sm"
                    className="min-h-[40px] font-semibold text-xs px-6 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                  >
                    Save Creator Info
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "location" && (
              <div className="relative rounded-2xl sm:rounded-3xl border border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-[#1E1E1E] pt-5 sm:pt-6 p-6 sm:p-8 space-y-6 text-left">
                <div className="absolute -top-3 left-4 px-2 bg-white dark:bg-[#1E1E1E] flex items-center gap-1.5 z-10 pointer-events-none select-none">
                  <MapPin className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300 stroke-[1.75]" aria-hidden="true" />
                  <span className="text-xs sm:text-[13px] font-semibold text-neutral-950 dark:text-white">
                    Realtime Location &amp; Address
                  </span>
                </div>
                <div className="flex items-center justify-end pb-4 border-b border-neutral-200 dark:border-neutral-700/80 flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={detectingLocation}
                    onClick={detectCurrentLocation}
                    className="min-h-[40px] gap-2 font-semibold text-xs border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-[#262626] cursor-pointer py-2 px-4"
                  >
                    {detectingLocation ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        <span>Detecting GPS...</span>
                      </>
                    ) : (
                      <>
                        <LocateFixed className="h-4 w-4" aria-hidden="true" />
                        <span>Use Current Location</span>
                      </>
                    )}
                  </Button>
                </div>

                {locationStatus && (
                  <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700/80 text-xs font-semibold text-neutral-900 dark:text-neutral-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Navigation className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{locationStatus}</span>
                    </div>
                    {form.latitude !== null && form.longitude !== null && (
                      <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400 shrink-0 tabular-nums">
                        GPS: {form.latitude.toFixed(4)}, {form.longitude.toFixed(4)}
                      </span>
                    )}
                  </div>
                )}

                <Input
                  label="Street Address / Location"
                  icon={<MapPin className="h-4 w-4" />}
                  cutoutBgClass="bg-white dark:bg-[#1E1E1E]"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="e.g. 123 Indiranagar, 100ft Road"
                />

                <div className="grid sm:grid-cols-2 gap-5">
                  <Input
                    label="Primary City"
                    icon={<Building className="h-4 w-4" />}
                    cutoutBgClass="bg-white dark:bg-[#1E1E1E]"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="e.g. Bengaluru"
                  />
                  <Input
                    label="State / Region"
                    icon={<MapPin className="h-4 w-4" />}
                    cutoutBgClass="bg-white dark:bg-[#1E1E1E]"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    placeholder="e.g. Karnataka"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <Input
                    label="Country"
                    icon={<Globe className="h-4 w-4" />}
                    cutoutBgClass="bg-white dark:bg-[#1E1E1E]"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    placeholder="e.g. India"
                  />
                  <Input
                    label="Pincode / Postal Code"
                    icon={<MapPin className="h-4 w-4" />}
                    cutoutBgClass="bg-white dark:bg-[#1E1E1E]"
                    value={form.pincode}
                    onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                    placeholder="e.g. 560038"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={saveProfile}
                    size="sm"
                    className="min-h-[40px] font-semibold text-xs px-6 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                  >
                    Save Location Details
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "payout" && (
              <div className="relative rounded-2xl sm:rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] pt-5 sm:pt-6 p-6 sm:p-8 space-y-6 text-left">
                <div className="absolute -top-3 left-4 px-2 bg-white dark:bg-[#1E1E1E] flex items-center gap-1.5 z-10 pointer-events-none select-none">
                  <CreditCard className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300 stroke-[1.75]" aria-hidden="true" />
                  <span className="text-xs sm:text-[13px] font-semibold text-neutral-950 dark:text-white">
                    Contact &amp; Payout Channels
                  </span>
                </div>
                <div className="absolute -top-3 right-4 px-1.5 bg-white dark:bg-[#1E1E1E] z-10">
                  <span className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">
                    Financial &amp; Settlement
                  </span>
                </div>

                <div className="grid sm:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="profile-pan-input"
                      className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-neutral-700 dark:text-neutral-300" aria-hidden="true" />
                        PAN Number
                      </span>
                      {user?.panNumber && user.panNumber.length > 5 && (
                        <button
                          type="button"
                          onClick={() => setShowPan(!showPan)}
                          className="text-xs text-neutral-900 dark:text-neutral-100 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                        >
                          {showPan ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
                          {showPan ? "Mask" : "Show Full"}
                        </button>
                      )}
                    </label>
                    <Input
                      id="profile-pan-input"
                      cutoutBgClass="bg-white dark:bg-[#1E1E1E]"
                      value={
                        showPan
                          ? user?.panNumber ||
                            kycData?.maskedNumber ||
                            user?.panMasked ||
                            "Not linked"
                          : kycData?.maskedNumber ||
                            user?.panMasked ||
                            (user?.panNumber ? `XXXXX${user.panNumber.slice(-5)}` : "Not linked")
                      }
                      disabled
                      className="font-mono uppercase font-bold tracking-wider"
                    />
                  </div>
                  <Input
                    label="Email Address"
                    icon={<Mail className="h-4 w-4" />}
                    cutoutBgClass="bg-white dark:bg-[#1E1E1E]"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    disabled
                  />
                  <Input
                    label="Phone Number"
                    icon={<Phone className="h-4 w-4" />}
                    cutoutBgClass="bg-white dark:bg-[#1E1E1E]"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>

                <Input
                  label="Lender Payout UPI ID (For Rental Earnings)"
                  icon={<CreditCard className="h-4 w-4" />}
                  cutoutBgClass="bg-white dark:bg-[#1E1E1E]"
                  value={form.upiId}
                  onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                  placeholder="you@upi"
                />

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={saveProfile}
                    size="sm"
                    className="min-h-[40px] font-semibold text-xs px-6 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                  >
                    Update Payout Info
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-6">
                {/* Security & Password Change */}
                <div className="relative rounded-2xl sm:rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] pt-5 sm:pt-6 p-6 sm:p-8 space-y-6 text-left">
                  <div className="absolute -top-3 left-4 px-2 bg-white dark:bg-[#1E1E1E] flex items-center gap-1.5 z-10 pointer-events-none select-none">
                    <Lock className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300 stroke-[1.75]" aria-hidden="true" />
                    <span className="text-xs sm:text-[13px] font-semibold text-neutral-950 dark:text-white">
                      Security &amp; Password
                    </span>
                  </div>
                  <div className="absolute -top-3 right-4 px-1.5 bg-white dark:bg-[#1E1E1E] z-10">
                    <span className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">
                      Account Protection
                    </span>
                  </div>

                  <form onSubmit={handlePasswordChange} className="space-y-5">
                    <Input
                      type="password"
                      label="Current Password"
                      icon={<Key className="h-4 w-4" />}
                      cutoutBgClass="bg-white dark:bg-[#1E1E1E]"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                    />

                    <div className="grid sm:grid-cols-2 gap-5">
                      <Input
                        type="password"
                        label="New Password"
                        icon={<Lock className="h-4 w-4" />}
                        cutoutBgClass="bg-white dark:bg-[#1E1E1E]"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        placeholder="At least 6 characters"
                      />
                      <Input
                        type="password"
                        label="Confirm New Password"
                        icon={<Lock className="h-4 w-4" />}
                        cutoutBgClass="bg-white dark:bg-[#1E1E1E]"
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
                        className="min-h-[40px] font-semibold text-xs px-6 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                      >
                        {changingPassword ? "Updating Password..." : "Update Password"}
                      </Button>
                    </div>
                  </form>
                </div>

                {/* Active Sessions & Devices */}
                <div className="rounded-3xl bg-white dark:bg-[#1E1E1E] p-6 sm:p-8 border border-neutral-200 dark:border-neutral-800 space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Laptop className="h-5 w-5 text-neutral-700 dark:text-neutral-300 stroke-[1.75]" aria-hidden="true" />
                      <h3 className="font-semibold text-lg text-neutral-950 dark:text-white">
                        Active Devices &amp; Multi-Sessions
                      </h3>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleLogoutAllDevices}
                      className="font-bold text-xs text-red-700 dark:text-red-400 border-red-500/30 hover:bg-red-500/10 cursor-pointer py-2 px-4"
                    >
                      Log Out All Other Devices
                    </Button>
                  </div>

                  <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                    Manage active multi-device logins. Each active session uses a 30-minute access token and a 7-day refresh session.
                  </p>

                  <div className="space-y-3">
                    {sessions.length > 0 ? (
                      sessions.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700/80 flex-wrap gap-4"
                        >
                          <div className="flex items-center gap-3.5">
                            {s.deviceName?.includes("Mobile") ? (
                              <Smartphone className="h-6 w-6 text-neutral-700 dark:text-neutral-300 shrink-0" aria-hidden="true" />
                            ) : (
                              <Laptop className="h-6 w-6 text-neutral-700 dark:text-neutral-300 shrink-0" aria-hidden="true" />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-neutral-950 dark:text-white">
                                  {s.deviceName || "Web Browser"}
                                </p>
                                {s.isCurrent && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                                    Current device
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium mt-0.5">
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
                              className="text-xs font-bold text-red-700 dark:text-red-400 hover:bg-red-500/10 cursor-pointer gap-1.5"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                              <span>Revoke Session</span>
                            </Button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700/80 text-center text-xs text-neutral-600 dark:text-neutral-400 font-medium">
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
            <div className="rounded-3xl bg-white dark:bg-[#1E1E1E] p-6 border border-neutral-200 dark:border-neutral-700/80 space-y-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700/80 pb-3">
                <h3 className="font-semibold text-base text-neutral-950 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-neutral-700 dark:text-neutral-300 stroke-[1.75]" aria-hidden="true" />
                  <span>Verification &amp; Trust Status</span>
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate({ to: "/payent/kyc" })}
                  className="gap-1.5 text-xs font-semibold py-1.5 px-3 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-[#262626]"
                >
                  <span>{kycData?.status === "APPROVED" ? "View PAN KYC" : "Manage PAN KYC"}</span>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {kycLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-neutral-600 dark:text-neutral-400 shrink-0" aria-hidden="true" />
                      ) : kycError ? (
                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" aria-hidden="true" />
                      ) : kycData?.status === "APPROVED" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                      ) : kycData?.status === "REJECTED" ? (
                        <X className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" aria-hidden="true" />
                      ) : kycData?.status === "PENDING" ? (
                        <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
                      ) : (
                        <ShieldCheck className="h-5 w-5 text-neutral-600 dark:text-neutral-400 shrink-0" aria-hidden="true" />
                      )}
                      <div>
                        <p className="text-xs font-bold text-neutral-950 dark:text-white">
                          Govt PAN Card Verification
                        </p>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium font-mono">
                          PAN:{" "}
                          {kycLoading
                            ? "Checking..."
                            : kycError
                            ? "Unavailable"
                            : kycData?.maskedNumber ||
                              user?.panMasked ||
                              (user?.panNumber ? `XXXXX${user.panNumber.slice(-5)}` : "Not linked")}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-full border capitalize",
                        kycLoading
                          ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700"
                          : kycError
                          ? "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30"
                          : kycData?.status === "APPROVED"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                          : kycData?.status === "REJECTED"
                          ? "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30"
                          : kycData?.status === "PENDING"
                          ? "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30"
                          : "bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700"
                      )}
                    >
                      {kycLoading
                        ? "Checking"
                        : kycError
                        ? "Unavailable"
                        : (kycData?.status || "Not started").replace(/_/g, " ").toLowerCase()}
                    </span>
                  </div>

                  {kycError && (
                    <div className="flex items-center justify-between gap-2 text-xs text-red-700 dark:text-red-400 bg-red-500/10 rounded-xl p-2 font-medium">
                      <span>{kycError}</span>
                      <button
                        type="button"
                        onClick={() => void loadKycStatus()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-[#1E1E1E] border border-neutral-300 dark:border-neutral-700 text-neutral-950 dark:text-white font-bold cursor-pointer shrink-0 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <RefreshCw className="h-3 w-3" aria-hidden="true" />
                        <span>Retry</span>
                      </button>
                    </div>
                  )}

                  {!kycError && kycData?.status === "REJECTED" && kycData.rejectionReason && (
                    <div className="text-xs text-red-700 dark:text-red-400 bg-red-500/10 rounded-xl p-2 font-medium">
                      Rejection Reason: {kycData.rejectionReason}
                    </div>
                  )}

                  {!kycLoading && !kycError && kycData?.status !== "APPROVED" && (
                    <div className="pt-1">
                      <Button
                        size="sm"
                        onClick={() => navigate({ to: "/payent/kyc" })}
                        className="w-full min-h-[40px] text-xs font-semibold bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 py-1.5"
                      >
                        {kycData?.status === "PENDING" ? "Check PAN Verification Status" : "Verify PAN Card Now"}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700/80">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="text-xs font-bold text-neutral-950 dark:text-white">
                        Phone &amp; Email Check
                      </p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                        OTP &amp; Security confirmed
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    Verified
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700/80">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-emerald-700 dark:text-emerald-400 shrink-0 stroke-[1.75]" aria-hidden="true" />
                    <div>
                      <p className="text-xs font-semibold text-neutral-950 dark:text-white">
                        Equipment Protection Shield
                      </p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium tabular-nums">
                        ₹5,00,000 Equipment Coverage
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* Handover & Pickup Info */}
            <div className="rounded-3xl bg-white dark:bg-[#1E1E1E] p-6 border border-neutral-200 dark:border-neutral-800 space-y-4 shadow-xs">
              <h3 className="font-semibold text-base text-neutral-950 dark:text-white flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
                <MapPin className="h-5 w-5 text-neutral-700 dark:text-neutral-300 stroke-[1.75]" aria-hidden="true" />
                <span>Handover Preferences</span>
              </h3>

              <div className="space-y-3 text-xs font-medium">
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Handover Mode:</span>
                  <span className="font-semibold text-neutral-950 dark:text-white">
                    Self Pickup / Local Courier
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Pickup Operating Hours:</span>
                  <span className="font-semibold text-neutral-950 dark:text-white tabular-nums">
                    09:00 AM - 08:00 PM
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Deposit Security:</span>
                  <span className="font-semibold text-neutral-950 dark:text-white">
                    Zero-Hold Authorization
                  </span>
                </div>
              </div>
            </div>

            {/* Support Callout */}
            <div className="rounded-3xl bg-neutral-100/70 dark:bg-[#1E1E1E] p-6 border border-neutral-200 dark:border-neutral-800 space-y-3 text-center shadow-xs">
              <HelpCircle className="h-8 w-8 text-neutral-700 dark:text-neutral-300 mx-auto stroke-[1.75]" aria-hidden="true" />
              <h4 className="text-xs font-semibold text-neutral-950 dark:text-white">
                Need help updating account credentials?
              </h4>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                Contact paYent 24/7 Support for GST billing updates or identity re-verification.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ to: "/contact" })}
                className="w-full min-h-[40px] font-semibold text-xs mt-2 py-2"
              >
                Contact Support
              </Button>
            </div>

            {/* Account Security & Sign Out Section */}
            <div className="rounded-3xl p-6 border border-red-500/30 bg-red-500/5 space-y-4">
              <div>
                <h3 className="font-semibold text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                  <LogOut className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
                  <span>Account Session</span>
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium mt-1">
                  Logged in as <span className="font-bold text-neutral-950 dark:text-white">{user?.email}</span>.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => {
                  logout();
                  toast.success("Logged out successfully.");
                  navigate({ to: "/" });
                }}
                className="w-full min-h-[42px] font-semibold text-xs flex items-center justify-center gap-2 py-2.5 shadow-xs transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>Log Out of paYent</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ProfilePhotoModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        currentPhotoUrl={activePhoto}
        onSave={handleUploadPhoto}
        onRemove={handleRemovePhoto}
        canRemove={hasRealPhoto}
      />
    </DashboardLayout>
  );
}
