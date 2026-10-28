import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  Package,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  IndianRupee,
  ShieldCheck,
  Power,
  Trash2,
  Edit3,
  ExternalLink,
  MapPin,
  Tag,
  Layers,
  Sparkles,
  Video,
  Plus,
  X,
  AlertTriangle,
  Sliders,
  Check,
  CalendarOff,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { usePayernt } from "../context";
import { getOptimizedImageUrl } from "@/utils/images";
import type { PayerntProduct } from "../types";
import payerntApi from "../payerntApiService";
import { VendorAvailabilityCalendar } from "./VendorAvailabilityCalendar";
import { resolveProductImageUrl, resolveAllProductImages } from "../productUtils";

export function LenderProductDetails({ productId: propId }: { productId?: string }) {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { id?: string; productId?: string };
  const productId = propId || params.id || params.productId || "";
  const { userProducts, toggleAvailability, deleteProduct, updateProduct } = usePayernt();

  const [product, setProduct] = useState<PayerntProduct | null>(null);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  // Time-Slot & Availability Settings
  const [allowHalfDay, setAllowHalfDay] = useState(true);
  const [morningSlotEnabled, setMorningSlotEnabled] = useState(true);
  const [afternoonSlotEnabled, setAfternoonSlotEnabled] = useState(true);
  const [fullDaySlotEnabled, setFullDaySlotEnabled] = useState(true);
  const [halfDayRate, setHalfDayRate] = useState<string>("");
  const [bufferMinutes, setBufferMinutes] = useState(60);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [newBlockedDate, setNewBlockedDate] = useState("");
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  useEffect(() => {
    if (!productId) return;
    payerntApi.getProductAvailabilityConfig(productId).then((res) => {
      if (res.success && res.config) {
        setAllowHalfDay(res.config.allowHalfDay ?? true);
        setMorningSlotEnabled(res.config.morningSlotEnabled ?? true);
        setAfternoonSlotEnabled(res.config.afternoonSlotEnabled ?? true);
        setFullDaySlotEnabled(res.config.fullDaySlotEnabled ?? true);
        setHalfDayRate(res.config.halfDayRate ? String(res.config.halfDayRate) : "");
        setBufferMinutes(res.config.bufferMinutes || 60);
        setBlockedDates(res.config.blockedDates || []);
      }
    });
  }, [productId]);

  useEffect(() => {
    const found = userProducts.find(
      (p) => String(p.id) === String(productId) || String(p.title).toLowerCase().replace(/\s+/g, "-") === productId
    );
    if (found) {
      setProduct(found);
      setNewPrice(String(found.pricePerDay || found.fairMarketPrice || ""));
    }
  }, [productId, userProducts]);

  if (!product) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-muted/60 border border-border flex items-center justify-center">
          <Package className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Product Not Found</h2>
          <p className="text-sm text-muted-foreground mt-1">
            No listed gear was found matching ID <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{productId}</code>
          </p>
        </div>
        <button
          onClick={() => navigate({ to: "/payernt/products" })}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-xs font-bold shadow-sm hover:opacity-90 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Products
        </button>
      </div>
    );
  }

  const isApproved =
    product.verificationStatus === "approved" ||
    product.verificationStatus === "verified" ||
    product.status === "approved";
  const isUnderReview =
    product.verificationStatus === "under_review" ||
    product.verificationStatus === "submitted" ||
    product.status === "under_review";
  const isAvailable =
    product.availabilityStatus === "available" ||
    (typeof product.availability === "string" && product.availability === "available") ||
    Boolean(product.isAvailable);

  const handlePriceSave = async () => {
    const val = Number(newPrice);
    if (isNaN(val) || val <= 0) {
      toast.error("Please enter a valid price amount.");
      return;
    }
    const res = await updateProduct(product.id, { pricePerDay: val, fairMarketPrice: val });
    if (res && !res.success) {
      toast.error(res.error || "Failed to update daily rate.");
      return;
    }
    setIsEditingPrice(false);
    toast.success(`Updated daily rental rate to ₹${val.toLocaleString("en-IN")}`);
  };

  const handleDelete = () => {
    try {
      deleteProduct(product.id);
      toast.success("Listing deleted successfully.");
      navigate({ to: "/payernt/products" });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete listing.");
    }
  };


  const handleSaveAvailabilityConfig = async () => {
    if (!productId) return;
    setIsSavingConfig(true);
    try {
      const res = await payerntApi.updateProductAvailabilityConfig(productId, {
        allowHalfDay,
        morningSlotEnabled,
        afternoonSlotEnabled,
        fullDaySlotEnabled,
        halfDayRate: halfDayRate ? Number(halfDayRate) : undefined,
        bufferMinutes,
        blockedDates,
      });
      if (res.success) {
        toast.success("Rental availability and time-slot rules saved!");
      } else {
        toast.error(res.error || "Failed to update availability settings.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error saving availability config.");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleAddBlockedDate = () => {
    if (!newBlockedDate) return;
    if (blockedDates.includes(newBlockedDate)) {
      toast.error("This date is already blocked.");
      return;
    }
    setBlockedDates([...blockedDates, newBlockedDate].sort());
    setNewBlockedDate("");
  };

  const handleRemoveBlockedDate = (d: string) => {
    setBlockedDates(blockedDates.filter((item) => item !== d));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/80">
        <button
          onClick={() => navigate({ to: "/payernt/products" })}
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Products
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              toggleAvailability(product.id);
              toast.success(isAvailable ? "Listing paused." : "Listing set to active.");
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              isAvailable
                ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {isAvailable ? "Pause Listing" : "Resume Listing"}
          </button>

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/15 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Listing
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-destructive/10 border border-destructive/40 p-1 rounded-xl">
              <span className="text-[11px] font-bold text-destructive px-2">Confirm?</span>
              <button
                onClick={handleDelete}
                className="px-2.5 py-1 rounded-lg bg-destructive text-destructive-foreground text-xs font-bold cursor-pointer"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 rounded-lg bg-muted text-foreground text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Product Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image Gallery & Specs */}
        <div className="lg:col-span-7 space-y-4">
          {(() => {
            const allImgs = resolveAllProductImages(product);
            const mainImg = allImgs[activePhotoIdx] || resolveProductImageUrl(product);

            return (
              <div className="space-y-2.5">
                <div className="relative aspect-video sm:aspect-4/3 rounded-2xl overflow-hidden bg-secondary/60 border border-border flex items-center justify-center">
                  {mainImg ? (
                    <img
                      src={getOptimizedImageUrl(mainImg) || mainImg}
                      alt={product.title}
                      className="w-full h-full object-cover object-center"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                      <Package className="w-10 h-10 opacity-60 mb-1" />
                      <span className="text-xs font-semibold">{product.category || "Gear"}</span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                    {isApproved && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-extrabold shadow-md">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified & Live
                      </span>
                    )}
                    {isUnderReview && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[11px] font-extrabold shadow-md">
                        <Clock className="w-3 h-3" />
                        Under Admin Review
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-bold">
                      <Tag className="w-3 h-3" />
                      {product.category || "Gear"}
                    </span>
                  </div>
                </div>

                {/* Thumbnails if multiple images exist */}
                {allImgs.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {allImgs.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActivePhotoIdx(idx)}
                        className={`h-14 w-14 rounded-xl overflow-hidden border-2 shrink-0 cursor-pointer transition-all ${
                          activePhotoIdx === idx
                            ? "border-foreground scale-102"
                            : "border-border/60 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Details Card */}
          <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {product.title}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {product.brand && <span className="font-semibold text-foreground">{product.brand} • </span>}
                {product.model || product.category}
              </p>
            </div>

            {product.description && (
              <div className="pt-3 border-t border-border/70">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Description
                </h3>
                <p className="text-sm text-foreground/90 mt-1.5 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}

            {/* Included Accessories */}
            {product.accessories && (Array.isArray(product.accessories) ? product.accessories.length > 0 : String(product.accessories).trim().length > 0) && (
              <div className="pt-3 border-t border-border/70">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Included Accessories
                </h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(Array.isArray(product.accessories)
                    ? product.accessories
                    : String(product.accessories).split(",")
                  ).map((acc, i) => {
                    const label = typeof acc === "string" ? acc.trim() : String(acc);
                    if (!label) return null;
                    return (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium"
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 10-Second Equipment Inspection Video */}
          {(product.videoUrl || (product as any).video_url) && (
            <div className="p-5 rounded-2xl border border-border bg-card space-y-3.5 shadow-2xs text-left">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-foreground">
                  <Video className="w-4 h-4 text-primary" />
                  <span>Verified 10s Inspection Video</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" /> Recorded Live Check
                </span>
              </div>

              <div className="relative rounded-2xl overflow-hidden bg-black border border-border aspect-video group">
                <video
                  src={product.videoUrl || (product as any).video_url}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-contain"
                />
              </div>

              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                Your recorded physical equipment condition evidence securely stored on Cloud CDN.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Rate Card, KYC & Actions */}
        <div className="lg:col-span-5 space-y-5">
          {/* Rate Management Card */}
          <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Rental Rate</span>
              <button
                onClick={() => setIsEditingPrice(!isEditingPrice)}
                className="text-primary text-xs font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
                {isEditingPrice ? "Cancel" : "Edit"}
              </button>
            </h3>

            {!isEditingPrice ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-foreground font-display">
                  ₹{Number(product.pricePerDay || product.fairMarketPrice || 0).toLocaleString("en-IN")}
                </span>
                <span className="text-xs text-muted-foreground font-semibold">/ day</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-border bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Rate per day"
                  />
                </div>
                <button
                  onClick={handlePriceSave}
                  className="w-full py-2 rounded-xl bg-foreground text-background text-xs font-bold hover:opacity-90 transition-all cursor-pointer"
                >
                  Save Daily Rate
                </button>
              </div>
            )}

            <div className="pt-3 border-t border-border/70 text-xs space-y-2 text-muted-foreground">
              <div className="flex justify-between">
                <span>Security Deposit</span>
                <span className="font-bold text-foreground">
                  ₹{Number(product.securityDeposit || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Replacement Value</span>
                <span className="font-bold text-foreground">
                  ₹{Number(product.fairMarketPrice || product.replacementValue || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Location</span>
                <span className="font-bold text-foreground">
                  {typeof product.location === "object" && product.location !== null
                    ? [product.location.city, product.location.state].filter(Boolean).join(", ") || product.city || "Available locally"
                    : String(product.location || product.city || "Available locally")}
                </span>
              </div>
            </div>
          </div>

          {/* Rental Slots & Availability Settings Card */}
          <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary" />
                <span>Time Slots & Availability</span>
              </h3>
              <span className="text-[10px] text-muted-foreground font-semibold">
                Flexible Rentals
              </span>
            </div>

            {/* Slot Toggles */}
            <div className="space-y-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground">
                <input
                  type="checkbox"
                  checked={allowHalfDay}
                  onChange={(e) => setAllowHalfDay(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                />
                <span>Enable Half-Day Rental Slots</span>
              </label>

              {allowHalfDay && (
                <div className="ml-6 space-y-2.5 p-3 rounded-xl bg-secondary/40 border border-border/60">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground">
                    <input
                      type="checkbox"
                      checked={morningSlotEnabled}
                      onChange={(e) => setMorningSlotEnabled(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                    />
                    <span className="font-semibold">Morning Slot</span>
                    <span className="text-[10px] text-muted-foreground">(8:00 AM – 12:00 PM)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground">
                    <input
                      type="checkbox"
                      checked={afternoonSlotEnabled}
                      onChange={(e) => setAfternoonSlotEnabled(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                    />
                    <span className="font-semibold">Afternoon Slot</span>
                    <span className="text-[10px] text-muted-foreground">(1:00 PM – 5:00 PM)</span>
                  </label>

                  <div className="pt-2 border-t border-border/40 space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground block">
                      Custom Half-Day Rate (Leave empty for default 60% of daily rate)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                        ₹
                      </span>
                      <input
                        type="number"
                        placeholder={String(Math.round(Number(product.pricePerDay || product.fairMarketPrice || 0) * 0.6))}
                        value={halfDayRate}
                        onChange={(e) => setHalfDayRate(e.target.value)}
                        className="w-full pl-6 pr-3 py-1.5 rounded-lg border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground">
                <input
                  type="checkbox"
                  checked={fullDaySlotEnabled}
                  onChange={(e) => setFullDaySlotEnabled(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                />
                <span>Enable Full-Day Rentals</span>
                <span className="text-[10px] text-muted-foreground font-normal">(8:00 AM – 5:00 PM)</span>
              </label>
            </div>

            {/* Turnaround Buffer */}
            <div className="pt-3 border-t border-border/70 space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground block">
                Turnaround / Return Buffer
              </label>
              <select
                value={bufferMinutes}
                onChange={(e) => setBufferMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value={30}>30 Minutes</option>
                <option value={60}>60 Minutes (Standard / Recommended)</option>
                <option value={90}>90 Minutes</option>
                <option value={120}>120 Minutes (Extended Check)</option>
              </select>
              <p className="text-[10px] text-muted-foreground">
                Applied between reservations to inspect condition and prevent back-to-back conflicts.
              </p>
            </div>

            {/* Block Personal-Use Dates (Visual Interactive Calendar) */}
            <div className="pt-3 border-t border-border/70">
              <VendorAvailabilityCalendar
                productId={productId}
                initialBlockedDates={blockedDates}
                onDatesChange={(newDates) => setBlockedDates(newDates)}
                standalone={true}
                onSave={async (newDates) => {
                  setBlockedDates(newDates);
                  const res = await payerntApi.updateProductAvailabilityConfig(productId, {
                    allowHalfDay,
                    morningSlotEnabled,
                    afternoonSlotEnabled,
                    fullDaySlotEnabled,
                    halfDayRate: halfDayRate ? Number(halfDayRate) : undefined,
                    bufferMinutes,
                    blockedDates: newDates,
                  });
                  if (res.success) {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new CustomEvent("payent_booking_updated"));
                    }
                    toast.success("Blocked dates updated and saved to database!");
                  } else {
                    toast.error(res.error || "Failed to update blocked dates.");
                    throw new Error(res.error || "Failed to update blocked dates.");
                  }
                }}
                title="Block Dates for Personal Use / Servicing"
                subtitle="Select individual dates or continuous date ranges to block equipment from renter bookings."
              />
            </div>

            {/* Save Config Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={isSavingConfig}
                onClick={handleSaveAvailabilityConfig}
                className="w-full py-2.5 rounded-xl bg-foreground text-background text-xs font-extrabold hover:opacity-90 shadow-sm active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSavingConfig ? (
                  <span>Saving Configuration...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Availability Settings</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Verification Status Card */}
          <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Verification & Security Status
            </h3>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/60 border border-border/60">
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
              <div className="text-xs">
                <div className="font-bold text-foreground">
                  {isApproved ? "Admin Approved for Peer Lending" : "Under Admin Review"}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Serial Number & KYC data verified securely.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LenderProductDetails;
