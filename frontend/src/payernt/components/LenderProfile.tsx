import React, { useState } from "react";
import {
  User,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  Sparkles,
  Package,
  IndianRupee,
  CreditCard,
  Building,
  RotateCcw,
  Edit3,
  ExternalLink,
  Award,
  Sun,
  Moon,
  BadgeCheck,
  Check,
  Calendar,
  Layers,
  Wallet,
  LogOut,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { LenderProfile, PayerntAccount } from "../types";
import { useTheme } from "@/hooks/useTheme";

interface LenderProfileProps {
  profile: LenderProfile;
  activeAccount?: PayerntAccount | null;
  onUpdateProfile: (updates: Partial<LenderProfile>) => void;
  onResetDemo: () => void;
  onNavigateToProducts: () => void;
  onLogout?: () => void;
  onBack?: () => void;
}

export function LenderProfileView({
  profile,
  activeAccount,
  onUpdateProfile,
  onResetDemo,
  onNavigateToProducts,
  onLogout,
  onBack,
}: LenderProfileProps) {
  const { theme, toggle: toggleTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(activeAccount?.name || profile.name || "");
  const [phone, setPhone] = useState(activeAccount?.phone || profile.phone || "");
  const [city, setCity] = useState(profile.city || "");
  const [area, setArea] = useState(profile.area || "");
  const [address, setAddress] = useState(activeAccount?.address || profile.address || "");
  const [pincode, setPincode] = useState(activeAccount?.pincode || profile.pincode || "");

  const accountId = activeAccount?.accountId || (activeAccount as any)?.id || profile.accountId || "VENDOR_ACTIVE";
  const rawAadhaar = activeAccount?.aadhaarNumber || (activeAccount as any)?.aadhaar_number || profile.aadhaarMasked || "";
  const maskedAadhaar = rawAadhaar
    ? (rawAadhaar.startsWith("XXXX") ? rawAadhaar : `XXXX-XXXX-${rawAadhaar.slice(-4)}`)
    : "Not Linked";

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      name: name.trim(),
      phone: phone.trim(),
      city: city.trim(),
      area: area.trim(),
      address: address.trim(),
      pincode: pincode.trim(),
    });
    setIsEditing(false);
    toast.success("Profile updated successfully!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 text-left pb-16">
      {/* Back Button */}
      {onBack && (
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border/80 bg-card hover:bg-secondary text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs group"
          >
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Home</span>
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>paye₹nt Host Account</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-display">
            Lender Profile & Verification
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage your verified host identity, KYC credentials, coverage policy, and preferences.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-border bg-card text-foreground hover:bg-secondary text-xs font-bold cursor-pointer shrink-0 shadow-xs active:scale-98 transition-all"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>{isEditing ? "Cancel Editing" : "Edit Profile"}</span>
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-bold cursor-pointer shrink-0 shadow-xs active:scale-98 transition-all"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Profile Info Card */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="relative shrink-0">
            <img
              src={activeAccount?.avatar || profile.avatar}
              alt={name}
              className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl object-cover border-2 border-border shadow-md"
            />
            <span
              className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg border-2 border-card"
              title="Verified Host"
            >
              <BadgeCheck className="h-5 w-5" />
            </span>
          </div>

          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground font-display">
                {name}
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                <CheckCircle2 className="h-3.5 w-3.5" /> Verified Host
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg bg-secondary text-foreground border border-border">
                {accountId}
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              Account Type: <span className="font-bold text-foreground">paye₹nt (Product Owner / Lender)</span>
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-foreground">{activeAccount?.email || profile.email}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-foreground">{activeAccount?.phone || profile.phone}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-foreground font-mono">Aadhaar: {maskedAadhaar}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-foreground">{address} ({pincode})</span>
              </span>
            </div>
          </div>
        </div>

        {/* Edit Form with AnimatePresence */}
        <AnimatePresence>
          {isEditing && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSave}
              className="p-5 rounded-2xl border border-border bg-secondary/30 space-y-4 pt-4 text-xs overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-foreground">Edit Profile Information</h4>
                <span className="text-[11px] text-muted-foreground">Changes reflect across all your product listings</span>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground block">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground block">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground block">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground block">Area / Locality</label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-secondary cursor-pointer font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-foreground text-background font-bold cursor-pointer text-xs shadow-sm hover:opacity-90 active:scale-98"
                >
                  Save Profile
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Host Trust & Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-4 border-t border-border/60">
          <div className="p-4 rounded-2xl border border-border bg-secondary/30 space-y-1.5">
            <span className="text-[10px] text-muted-foreground uppercase font-extrabold tracking-wider block">
              Host Trust Score
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-black text-foreground font-display">{profile.trustScore}</span>
              <span className="text-amber-500 font-bold text-lg">★</span>
            </div>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Top 5% verified host</p>
          </div>

          <div className="p-4 rounded-2xl border border-border bg-secondary/30 space-y-1.5">
            <span className="text-[10px] text-muted-foreground uppercase font-extrabold tracking-wider block">
              Gear Hosted
            </span>
            <div className="text-2xl font-black text-foreground font-display">{profile.totalGearListed} Items</div>
            <p className="text-[10px] text-muted-foreground">Active in marketplace</p>
          </div>

          <div className="p-4 rounded-2xl border border-border bg-secondary/30 space-y-1.5">
            <span className="text-[10px] text-muted-foreground uppercase font-extrabold tracking-wider block">
              Active Rentals
            </span>
            <div className="text-2xl font-black text-foreground font-display">{profile.activeRentalsCount} Ongoing</div>
            <p className="text-[10px] text-muted-foreground">Currently with borrowers</p>
          </div>

          <div className="p-4 rounded-2xl border border-border bg-secondary/30 space-y-1.5">
            <span className="text-[10px] text-muted-foreground uppercase font-extrabold tracking-wider block">
              Lifetime Yield
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-display">
              ₹{profile.lifetimeEarnings.toLocaleString("en-IN")}
            </div>
            <p className="text-[10px] text-muted-foreground">Total earned to date</p>
          </div>
        </div>
      </div>

      {/* Lender Insurance Coverage Section */}
      <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-6 sm:p-7 space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
            <ShieldCheck className="h-5 w-5" />
            <span>Payent Comprehensive Protection Guarantee</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase">
            Active Coverage
          </span>
        </div>

        <p className="text-muted-foreground leading-relaxed">
          Every piece of equipment listed under your profile is protected up to <strong className="text-foreground">₹50,000</strong> against physical damage, mechanical failure, or non-return. Borrowers undergo strict Aadhaar KYC checks and escrow payments before pickup.
        </p>

        <div className="grid sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl border border-emerald-500/20 bg-card/80 flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-foreground block">Zero Commission</span>
              <span className="text-[10px] text-muted-foreground">Keep 100% rental fees</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border border-emerald-500/20 bg-card/80 flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-foreground block">Escrow Protection</span>
              <span className="text-[10px] text-muted-foreground">Rental payments held safe</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border border-emerald-500/20 bg-card/80 flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-foreground block">Instant Settlement</span>
              <span className="text-[10px] text-muted-foreground">Direct User Wallet payout</span>
            </div>
          </div>
        </div>
      </div>

      {/* Appearance & Theme Section */}
      <div className="p-6 sm:p-7 rounded-3xl border border-border/80 bg-card space-y-4">
        <div>
          <h4 className="text-sm font-bold text-foreground">Theme & Interface Appearance</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose your preferred color theme. Preference is remembered across all sessions.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-sm">
          <button
            type="button"
            onClick={() => {
              if (theme !== "light") toggleTheme();
            }}
            className={`p-4 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
              theme === "light"
                ? "border-foreground bg-secondary/80 font-bold shadow-xs text-foreground"
                : "border-border bg-card hover:bg-secondary/40 text-muted-foreground"
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs">
              <Sun className="h-4 w-4 text-amber-500" />
              <span>Studio Light</span>
            </div>
            {theme === "light" && <CheckCircle2 className="h-4 w-4 text-foreground" />}
          </button>

          <button
            type="button"
            onClick={() => {
              if (theme !== "dark") toggleTheme();
            }}
            className={`p-4 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
              theme === "dark"
                ? "border-foreground bg-secondary/80 font-bold shadow-xs text-foreground"
                : "border-border bg-card hover:bg-secondary/40 text-muted-foreground"
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs">
              <Moon className="h-4 w-4 text-sky-400" />
              <span>Studio Dark</span>
            </div>
            {theme === "dark" && <CheckCircle2 className="h-4 w-4 text-foreground" />}
          </button>
        </div>
      </div>

    </div>
  );
}

export default LenderProfileView;
