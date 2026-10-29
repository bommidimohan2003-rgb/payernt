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
import { resolveProductImageUrl, resolveProductDailyRate, normalizePayerntProduct } from "../productUtils";

export function LenderProductDetails({ productId: propId }: { productId?: string }) {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { id?: string; productId?: string };
  const productId = propId || params.id || params.productId || "";
  const { userProducts, toggleAvailability, deleteProduct, updateProduct } = usePayernt();

  const [product, setProduct] = useState<PayerntProduct | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

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
    if (!productId) {
      setIsLoadingProduct(false);
      return;
    }

    const found = userProducts.find(
      (p) => String(p.id) === String(productId) || String(p.title).toLowerCase().replace(/\s+/g, "-") === productId
    );

    if (found) {
      const canonical = normalizePayerntProduct(found);
      setProduct(canonical);
      const rate = resolveProductDailyRate(canonical, 0);
      setNewPrice(String(rate));
      setIsLoadingProduct(false);
    } else {
      setIsLoadingProduct(true);
      payerntApi
        .getProductById(productId)
        .then((res) => {
          if (res.success && res.product) {
            const canonical = normalizePayerntProduct(res.product);
            setProduct(canonical);
            const rate = resolveProductDailyRate(canonical, 0);
            setNewPrice(String(rate));
          }
        })
        .catch((e) => {
          console.warn("[LenderProductDetails] Error fetching product:", e);
        })
        .finally(() => {
          setIsLoadingProduct(false);
        });
    }
  }, [productId, userProducts]);

  if (isLoadingProduct) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 space-y-4 max-w-4xl mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center animate-pulse">
          <Clock className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground">Loading product inspection details...</p>
      </div>
    );
  }

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
    if (!product) return;
    const val = Number(newPrice);
    if (isNaN(val) || val <= 0) {
      toast.error("Please enter a valid price amount greater than 0.");
      return;
    }
    const updates = {
      price: val,
      daily_rate: val,
      dailyRate: val,
      pricePerDay: val,
      pricing: {
        ...product.pricing,
        daily: val,
      },
    };
    const res = await updateProduct(product.id, updates);
    if (res && res.success) {
      const nextProduct = res.product ? normalizePayerntProduct(res.product) : { ...product, ...updates };
      setProduct(nextProduct);
      setNewPrice(String(resolveProductDailyRate(nextProduct, val)));
      setIsEditingPrice(false);
      toast.success(`Updated daily rental rate to ₹${val.toLocaleString("en-IN")}`);
    } else {
      toast.error(res?.error || "Failed to update daily rate.");
    }
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/payernt/products" })}
            className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to My Products
          </button>
          <div className="h-4 w-px bg-border" />
          <span className="text-xs font-mono text-muted-foreground">
            Listing ID: #{product.id}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate({ to: "/payernt/products/$id/edit", params: { id: product.id } })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-xs active:scale-98"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Listing</span>
          </button>

          <button
            onClick={() => {
              toggleAvailability(product.id);
              toast.success(isAvailable ? "Listing paused." : "Listing set to active.");
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${isAvailable
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
        {/* Left Column: Product Photo & Specs */}
        {/* Left Column: Hero Product Photo with Overlay Text & Specs */}
        <div className="lg:col-span-7 space-y-5">
          {(() => {
            const mainImg = resolveProductImageUrl(product);
            const conditionGrade = typeof product.condition === "object"
              ? product.condition?.grade || "Good"
              : product.condition || "Good";
            const locationCity = typeof product.location === "object"
              ? product.location?.city || product.location?.area || "Visakhapatnam"
              : product.location || "Visakhapatnam";

            return (
              <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] min-h-[380px] sm:min-h-[440px] rounded-3xl overflow-hidden bg-neutral-950 border border-black/10 dark:border-white/10 shadow-lg flex flex-col justify-between p-5 sm:p-7 select-none group">
                {/* 1. Large Hero Product Image */}
                <div className="absolute inset-0 w-full h-full overflow-hidden bg-neutral-900 pointer-events-none">
                  {mainImg ? (
                    <img
                      src={getOptimizedImageUrl(mainImg) || mainImg}
                      alt={product.title}
                      className="w-full h-full object-cover object-center group-hover:scale-[1.01] transition-transform duration-500 ease-out"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                      <Package className="w-12 h-12 opacity-40 mb-2" />
                      <span className="text-xs font-semibold">{product.category || "Gear"}</span>
                    </div>
                  )}

                  {/* Gradient Scrims: subtle dark vignette on top for badges, rich smooth gradient at bottom for text */}
                  <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/75 via-black/35 to-transparent pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />
                </div>

                {/* 2. Top Badges Over Image */}
                <div className="relative z-10 flex flex-wrap items-center gap-2">
                  {isApproved && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-md backdrop-blur-md">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified & Live
                    </span>
                  )}
                  {isUnderReview && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-bold shadow-md backdrop-blur-md">
                      <Clock className="w-3.5 h-3.5" />
                      Under Admin Review
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/55 backdrop-blur-md text-white text-xs font-bold border border-white/15 shadow-sm">
                    <Tag className="w-3.5 h-3.5" />
                    {product.category || "Gear"}
                  </span>
                  {!isAvailable && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/90 text-white text-xs font-bold shadow-md backdrop-blur-md">
                      Paused
                    </span>
                  )}
                </div>

                {/* 3. Hero Text Overlay at Bottom of Image */}
                <div className="relative z-10 space-y-2 mt-auto">
                  {(product.brand || product.model) && (
                    <div className="flex items-center gap-2 text-white/85 text-xs sm:text-sm font-semibold tracking-wide">
                      {product.brand && <span className="text-white font-bold">{product.brand}</span>}
                      {product.brand && product.model && <span className="text-white/40">•</span>}
                      {product.model && (
                        <span className="text-white/80 font-mono text-[11px] sm:text-xs">
                          {product.model}
                        </span>
                      )}
                    </div>
                  )}

                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white font-display tracking-tight leading-tight drop-shadow-md">
                    {product.title}
                  </h1>

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-white/85 text-xs">
                    <div className="flex items-center gap-1.5 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{locationCity}</span>
                    </div>
                    <span className="text-white/30">•</span>
                    <div className="flex items-center gap-1.5 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Condition: <strong className="text-white font-semibold">{conditionGrade}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Details & Specifications Card */}
          <div className="p-6 rounded-3xl border border-border bg-card space-y-5 shadow-xs">
            {product.description && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Description
                </h3>
                <p className="text-sm text-foreground/90 mt-2 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}

            {/* Included Accessories */}
            {product.accessories && (Array.isArray(product.accessories) ? product.accessories.length > 0 : String(product.accessories).trim().length > 0) && (
              <div className="pt-4 border-t border-border/70">
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

            {/* Condition & Damage Disclosure */}
            <div className={`${product.description ? "pt-4 border-t border-border/70" : ""} space-y-2`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Condition & Physical Wear
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-secondary text-foreground border border-border">
                  {typeof product.condition === "object" ? product.condition?.grade || "Good" : product.condition || "Good"}
                </span>
              </div>
              {(typeof product.condition === "object" && (product.condition?.additionalNotes || product.condition?.notes)) && (
                <p className="text-xs text-foreground/80 leading-relaxed">
                  {product.condition?.additionalNotes || product.condition?.notes}
                </p>
              )}
              {(product.damageDetails || (typeof product.condition === "object" && product.condition?.visibleDamage)) ? (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 space-y-1">
                  <span className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Disclosed Cosmetic Wear / Scuffs:
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    {product.damageDetails || (typeof product.condition === "object" ? product.condition?.damageDetails || product.condition?.damageDescription : "") || "Disclosed cosmetic markings."}
                  </p>
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>No visible cosmetic wear or physical defects reported.</span>
                </div>
              )}
            </div>

            {/* Handover Location & Pickup Instructions */}
            <div className="pt-4 border-t border-border/70 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Handover & Pickup Instructions
              </h3>
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>
                  {[
                    typeof product.location === "object" ? product.location?.area : (product as any).area,
                    typeof product.location === "object" ? product.location?.city : (product.city || ""),
                    typeof product.location === "object" ? product.location?.pincode : ((product as any).pincode || ""),
                  ].filter(Boolean).join(", ") || "Visakhapatnam, Andhra Pradesh"}
                </span>
              </div>
              {(product.pickupInstructions || (product as any).pickup_instructions || (typeof product.location === "object" && product.location?.pickupInstructions)) && (
                <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border/70 text-xs text-muted-foreground leading-relaxed">
                  <span className="font-bold text-foreground block mb-0.5">Instructions for Renter:</span>
                  {product.pickupInstructions || (product as any).pickup_instructions || (typeof product.location === "object" ? product.location?.pickupInstructions : "")}
                </div>
              )}
            </div>
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
                  ₹{resolveProductDailyRate(product, 0).toLocaleString("en-IN")}
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
                <span>Weekly Rate</span>
                <span className="font-bold text-foreground">
                  ₹{Number(product.pricing?.weekly ?? (product as any).weekly_rate ?? (product as any).weeklyRate ?? Math.round(resolveProductDailyRate(product, 0) * 7 * 0.85)).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Monthly Rate</span>
                <span className="font-bold text-foreground">
                  ₹{Number(product.pricing?.monthly ?? (product as any).monthly_rate ?? (product as any).monthlyRate ?? Math.round(resolveProductDailyRate(product, 0) * 30 * 0.7)).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Security Deposit</span>
                <span className="font-bold text-foreground">
                  ₹{Number(product.pricing?.securityDeposit ?? product.securityDeposit ?? (product as any).security_deposit ?? 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Replacement Value</span>
                <span className="font-bold text-foreground">
                  ₹{Number(product.replacementValue ?? product.fairMarketPrice ?? 0).toLocaleString("en-IN")}
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
                        placeholder={String(Math.round(resolveProductDailyRate(product, 0) * 0.6))}
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
