import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Camera,
  Upload,
  X,
  Check,
  AlertTriangle,
  RefreshCw,
  Package,
  Layers,
  Sparkles,
  ShieldCheck,
  Tag,
  DollarSign,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { usePayernt } from "../context";
import type { PayerntProduct, VerificationStatus } from "../types";
import { resolveProductImageUrl, resolveProductDailyRate } from "../productUtils";
import { uploadImageToCloudinary } from "@/utils/cloudinary";
import { CameraCaptureModal } from "@/components/lender/CameraCaptureModal";
import payerntApi from "../payerntApiService";

const CATEGORIES = [
  "Cameras",
  "Lenses",
  "Drones",
  "Audio & Microphones",
  "Lighting",
  "Gimbals & Rigs",
  "Laptops & Computing",
  "Gaming Consoles",
  "Action Cameras",
  "Projectors",
  "Accessories",
  "Other",
];

const CONDITION_GRADES = ["Like New", "Excellent", "Good", "Fair"];

export function LenderProductEdit({ productId: propId }: { productId?: string }) {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { id?: string; productId?: string };
  const productId = propId || params.id || params.productId || "";
  const { userProducts, updateProduct } = usePayernt();

  const [product, setProduct] = useState<PayerntProduct | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);

  // File picker ref for fallback upload
  const primaryFileInputRef = useRef<HTMLInputElement>(null);

  // Camera modal state
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Form State
  const [editFormData, setEditFormData] = useState<{
    title: string;
    category: string;
    brand: string;
    model: string;
    description: string;
    dailyPrice: string;
    weeklyPrice: string;
    securityDeposit: string;
    conditionGrade: string;
    conditionNotes: string;
    visibleDamage: boolean;
    damageDetails: string;
    city: string;
    area: string;
    pincode: string;
    pickupInstructions: string;
    primaryImage: string;
    images: string[];
    availabilityStatus: "available" | "paused";
  }>({
    title: "",
    category: "Cameras",
    brand: "",
    model: "",
    description: "",
    dailyPrice: "500",
    weeklyPrice: "",
    securityDeposit: "0",
    conditionGrade: "Like New",
    conditionNotes: "",
    visibleDamage: false,
    damageDetails: "",
    city: "Visakhapatnam",
    area: "",
    pincode: "",
    pickupInstructions: "",
    primaryImage: "",
    images: [],
    availabilityStatus: "available",
  });

  // Populate form from product
  const populateForm = (p: PayerntProduct) => {
    const daily = resolveProductDailyRate(p, 500);
    const weekly = p.pricing?.weekly ?? (p as any).weekly_rate ?? (p as any).weeklyRate ?? "";
    const depositVal = p.pricing?.securityDeposit ?? (p as any).security_deposit ?? 0;
    const condGrade = typeof p.condition === "object" ? p.condition?.grade || "Like New" : p.condition || "Like New";
    const condNotes = typeof p.condition === "object" ? p.condition?.additionalNotes || p.condition?.notes || "" : "";
    const visDmg = typeof p.condition === "object" ? Boolean(p.condition?.visibleDamage) : false;
    const dmgDetails = p.damageDetails || (typeof p.condition === "object" ? p.condition?.damageDetails || p.condition?.damageDescription || "" : "");
    const cityVal = typeof p.location === "object" ? p.location?.city || "Visakhapatnam" : p.location || "Visakhapatnam";
    const areaVal = typeof p.location === "object" ? p.location?.area || "" : "";
    const pinVal = typeof p.location === "object" ? p.location?.pincode || (p.location as any)?.postalCode || "" : (p as any).pincode || "";
    const pickupInst = typeof p.location === "object" ? p.location?.pickupInstructions || "" : (p as any).pickup_instructions || "";
    const resolvedImg = resolveProductImageUrl(p);

    const existingImgs = Array.isArray(p.images)
      ? p.images.filter(Boolean)
      : typeof p.images === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(p.images);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      : [];

    setEditFormData({
      title: p.title || p.name || "",
      category: p.category || "Cameras",
      brand: p.brand || p.specs?.brand || "",
      model: p.model || p.specs?.model || "",
      description: p.description || "",
      dailyPrice: String(daily),
      weeklyPrice: weekly ? String(weekly) : "",
      securityDeposit: depositVal ? String(depositVal) : "0",
      conditionGrade: condGrade,
      conditionNotes: condNotes,
      visibleDamage: visDmg,
      damageDetails: dmgDetails,
      city: cityVal,
      area: areaVal,
      pincode: pinVal,
      pickupInstructions: pickupInst,
      primaryImage: resolvedImg,
      images: existingImgs,
      availabilityStatus: p.availabilityStatus === "paused" ? "paused" : "available",
    });
  };

  // Load product on mount / parameter change
  useEffect(() => {
    if (!productId) {
      setIsLoadingProduct(false);
      return;
    }

    const found = userProducts.find(
      (p) => String(p.id) === String(productId) || String(p.title).toLowerCase().replace(/\s+/g, "-") === productId
    );

    if (found) {
      setProduct(found);
      populateForm(found);
      setIsLoadingProduct(false);
    } else {
      setIsLoadingProduct(true);
      payerntApi
        .getProductById(productId)
        .then((res) => {
          if (res.success && res.product) {
            setProduct(res.product);
            populateForm(res.product);
          }
        })
        .catch((e) => {
          console.warn("[LenderProductEdit] Failed to fetch product:", e);
        })
        .finally(() => {
          setIsLoadingProduct(false);
        });
    }
  }, [productId, userProducts]);

  // Handle Camera Capture for Primary Product Photo
  const handleCameraCapture = async (imageDataUrl: string) => {
    if (isUploadingMedia) {
      toast.error("An image upload is already in progress.");
      return;
    }

    if (!imageDataUrl || (!imageDataUrl.startsWith("data:image/") && !imageDataUrl.startsWith("blob:"))) {
      toast.error("Invalid image capture format.");
      return;
    }

    // Size validation (20MB limit)
    const base64Length = imageDataUrl.length - (imageDataUrl.indexOf(",") + 1);
    const approximateSizeBytes = (base64Length * 3) / 4;
    if (approximateSizeBytes > 20 * 1024 * 1024) {
      toast.error("Captured image is too large (exceeds 20MB limit).");
      return;
    }

    setIsUploadingMedia(true);
    setUploadProgress(0);
    const loadingToastId = toast.loading("Uploading product photo to storage...");

    try {
      const hostedUrl = await uploadImageToCloudinary(imageDataUrl, (percent) => {
        setUploadProgress(percent);
      });

      if (!hostedUrl || !hostedUrl.startsWith("http")) {
        throw new Error("Invalid URL returned from storage provider.");
      }

      setEditFormData((prev) => ({
        ...prev,
        primaryImage: hostedUrl,
      }));
      toast.success("Primary product photo updated successfully!", { id: loadingToastId });
    } catch (err: any) {
      console.error("[LenderProductEdit] Camera photo upload failed:", err);
      toast.error(err?.message || "Failed to upload photo. Please check your connection and try again.", {
        id: loadingToastId,
      });
    } finally {
      if (imageDataUrl.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(imageDataUrl);
        } catch {}
      }
      setIsUploadingMedia(false);
      setUploadProgress(null);
    }
  };

  // Fallback File Upload Handler for Primary Photo
  const handlePrimaryFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image file is too large (max 20MB).");
      return;
    }

    setIsUploadingMedia(true);
    try {
      const url = await uploadImageToCloudinary(file);
      setEditFormData((prev) => ({ ...prev, primaryImage: url }));
      toast.success("Primary photo uploaded successfully.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload photo to storage.");
    } finally {
      setIsUploadingMedia(false);
      if (e.target) e.target.value = "";
    }
  };

  // Handle Form Submit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    const trimmedTitle = editFormData.title.trim();
    if (!trimmedTitle || trimmedTitle.length < 3) {
      toast.error("Please enter a valid product title (at least 3 characters).");
      return;
    }

    const priceNum = Number(editFormData.dailyPrice);
    if (!priceNum || priceNum <= 0) {
      toast.error("Please enter a valid daily rental price greater than 0.");
      return;
    }

    if (editFormData.visibleDamage && !editFormData.damageDetails.trim()) {
      toast.error("Please describe the visible wear or damage locations.");
      return;
    }

    const weeklyNum = editFormData.weeklyPrice
      ? Number(editFormData.weeklyPrice)
      : Math.round(priceNum * 7 * 0.85);
    const depositNum =
      editFormData.securityDeposit !== ""
        ? Math.max(0, Number(editFormData.securityDeposit))
        : (product.pricing?.securityDeposit ?? 0);

    setIsSavingEdit(true);
    try {
      const updates: Partial<PayerntProduct> = {
        title: trimmedTitle,
        name: trimmedTitle,
        category: editFormData.category,
        brand: editFormData.brand.trim() || undefined,
        model: editFormData.model.trim() || undefined,
        description: editFormData.description.trim(),
        primaryImage: editFormData.primaryImage.trim() || product.primaryImage,
        primary_image: editFormData.primaryImage.trim() || product.primaryImage,
        image: editFormData.primaryImage.trim() || product.primaryImage,
        images: editFormData.images,
        price: priceNum,
        daily_rate: priceNum,
        dailyRate: priceNum,
        pricePerDay: priceNum,
        pricing: {
          ...product.pricing,
          daily: priceNum,
          weekly: weeklyNum,
          monthly: Math.round(priceNum * 30 * 0.7),
          securityDeposit: depositNum,
        },
        condition: {
          ...((product.condition && typeof product.condition === "object") ? product.condition : {}),
          grade: editFormData.conditionGrade as any,
          visibleDamage: editFormData.visibleDamage,
          damageDetails: editFormData.visibleDamage ? editFormData.damageDetails.trim() : "None",
          damageDescription: editFormData.visibleDamage ? editFormData.damageDetails.trim() : "None",
          additionalNotes: editFormData.conditionNotes.trim() || undefined,
        },
        condition_grade: editFormData.conditionGrade,
        damageDetails: editFormData.visibleDamage ? editFormData.damageDetails.trim() : "None",
        location: {
          ...((product.location && typeof product.location === "object") ? product.location : {}),
          city: editFormData.city.trim(),
          area: editFormData.area.trim(),
          pincode: editFormData.pincode.trim(),
          pickupInstructions: editFormData.pickupInstructions.trim(),
        },
        city: editFormData.city.trim(),
        area: editFormData.area.trim(),
        pincode: editFormData.pincode.trim(),
        pickup_instructions: editFormData.pickupInstructions.trim(),
        pickupInstructions: editFormData.pickupInstructions.trim(),
        availabilityStatus: editFormData.availabilityStatus,
      };

      const res = await updateProduct(product.id, updates);
      if (res && !res.success) {
        toast.error(res.error || "Failed to save product changes.");
        return;
      }

      toast.success("Product listing updated successfully!");
      // Navigate to the updated product details page
      navigate({ to: "/payernt/products/$id", params: { id: product.id } });
    } catch (err: any) {
      console.error("[LenderProductEdit] Save error:", err);
      toast.error(err?.message || "Failed to save product changes.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const getStatusBadge = (verificationStatus?: VerificationStatus, status?: string) => {
    const effStatus = verificationStatus || status;
    if (effStatus === "draft") {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-secondary text-muted-foreground border border-border">
          DRAFT
        </span>
      );
    }
    if (
      effStatus === "under_review" ||
      effStatus === "submitted" ||
      effStatus === "pending" ||
      effStatus === "pending_admin_review"
    ) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1.5 shadow-2xs">
          <Clock className="h-3.5 w-3.5" /> PENDING ADMIN REVIEW
        </span>
      );
    }
    if (effStatus === "approved" || effStatus === "verified" || effStatus === "active") {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 border border-neutral-900 dark:border-white flex items-center gap-1.5 shadow-2xs">
          <CheckCircle2 className="h-3.5 w-3.5" /> APPROVED & LIVE
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-secondary text-muted-foreground border border-border">
        LISTED
      </span>
    );
  };

  if (isLoadingProduct) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 space-y-4 max-w-4xl mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center animate-pulse">
          <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground">Loading product details for editing...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 space-y-4 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Product Not Found</h2>
          <p className="text-sm text-muted-foreground mt-1">
            No equipment listing was found matching ID <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{productId}</code>
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Hidden File Input for fallback upload */}
      <input
        ref={primaryFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePrimaryFileSelect}
      />

      {/* Camera Capture Modal */}
      {isCameraModalOpen && (
        <CameraCaptureModal
          isOpen={isCameraModalOpen}
          onClose={() => setIsCameraModalOpen(false)}
          onCapture={handleCameraCapture}
          onFallbackUpload={() => primaryFileInputRef.current?.click()}
          isUploading={isUploadingMedia}
          uploadProgress={uploadProgress}
        />
      )}

      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/payernt/products/$id", params: { id: product.id } })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-secondary/50 hover:bg-secondary text-xs font-semibold text-foreground transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cancel & Back</span>
          </button>
          <div className="h-4 w-px bg-border" />
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <span>Edit Equipment Listing</span>
            </h1>
            <p className="text-xs text-muted-foreground font-mono">
              Listing ID: #{product.id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {getStatusBadge(product.verificationStatus, product.status)}
          <button
            type="button"
            onClick={() => navigate({ to: "/payernt/products/$id", params: { id: product.id } })}
            className="px-3.5 py-2 rounded-xl border border-border hover:bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveEdit}
            disabled={isSavingEdit || isUploadingMedia}
            className="px-5 py-2 rounded-xl bg-accent-primary hover:bg-accent-hover text-white text-xs font-bold active:scale-[0.98] cursor-pointer shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isUploadingMedia ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Uploading Media...</span>
              </>
            ) : isSavingEdit ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Edit Form */}
      <form onSubmit={handleSaveEdit} className="space-y-6">
        {/* SECTION 1: BASIC PRODUCT IDENTITY */}
        <div className="p-5 sm:p-6 rounded-3xl border border-border bg-card space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">1. Equipment Identification</h2>
              <p className="text-xs text-muted-foreground">General equipment title, classification, brand, and rental description.</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary px-2.5 py-1 rounded-full border border-border">
              Core Specs
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Product Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              minLength={3}
              value={editFormData.title}
              onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
              placeholder="e.g. Sony FX3 Cinema Camera Kit"
              className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-1 focus:ring-foreground"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Category <span className="text-destructive">*</span>
              </label>
              <select
                value={editFormData.category}
                onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-foreground cursor-pointer font-medium"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Brand</label>
              <input
                type="text"
                value={editFormData.brand}
                onChange={(e) => setEditFormData({ ...editFormData, brand: e.target.value })}
                placeholder="e.g. Sony"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Model</label>
              <input
                type="text"
                value={editFormData.model}
                onChange={(e) => setEditFormData({ ...editFormData, model: e.target.value })}
                placeholder="e.g. FX3"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-foreground"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Product Description <span className="text-destructive">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={editFormData.description}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              placeholder="Describe your equipment, included accessories, optical condition, capabilities, and rental guidelines..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs sm:text-sm leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-foreground resize-none"
            />
          </div>
        </div>

        {/* SECTION 2: PRICING & AVAILABILITY */}
        <div className="p-5 sm:p-6 rounded-3xl border border-border bg-card space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">2. Rental Rates & Availability</h2>
              <p className="text-xs text-muted-foreground">Rental fee per day, security deposit, and live listing status.</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary px-2.5 py-1 rounded-full border border-border">
              Pricing
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Daily Rate (₹) <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-mono text-muted-foreground">₹</span>
                <input
                  type="number"
                  required
                  min="1"
                  value={editFormData.dailyPrice}
                  onChange={(e) => setEditFormData({ ...editFormData, dailyPrice: e.target.value })}
                  className="w-full pl-7 pr-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs sm:text-sm font-mono font-bold focus:outline-hidden focus:ring-1 focus:ring-foreground"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Weekly Rate (₹) <span className="text-[10px] font-normal text-muted-foreground">(Optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-mono text-muted-foreground">₹</span>
                <input
                  type="number"
                  min="1"
                  value={editFormData.weeklyPrice}
                  onChange={(e) => setEditFormData({ ...editFormData, weeklyPrice: e.target.value })}
                  placeholder="Auto calculated"
                  className="w-full pl-7 pr-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-foreground"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Security Deposit (₹) <span className="text-[10px] font-normal text-muted-foreground">(Refundable)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-mono text-muted-foreground">₹</span>
                <input
                  type="number"
                  min="0"
                  value={editFormData.securityDeposit}
                  onChange={(e) => setEditFormData({ ...editFormData, securityDeposit: e.target.value })}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-foreground"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Listing Status</label>
              <select
                value={editFormData.availabilityStatus}
                onChange={(e) => setEditFormData({ ...editFormData, availabilityStatus: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-foreground cursor-pointer"
              >
                <option value="available">Active & Rentable</option>
                <option value="paused">Paused (Temporarily unavailable)</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 3: PRODUCT PHOTOS & CAMERA CAPTURE */}
        <div className="p-5 sm:p-6 rounded-3xl border border-border bg-card space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">3. Product Photography</h2>
              <p className="text-xs text-muted-foreground">Capture your primary product photo using your real phone camera.</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary px-2.5 py-1 rounded-full border border-border">
              Phone Camera
            </span>
          </div>

          {/* Primary Product Photo */}
          <div className="p-4 sm:p-5 rounded-2xl bg-secondary/20 border border-border space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <label className="block text-xs font-bold text-foreground">
                  Primary Product Photo
                </label>
                <p className="text-[11px] text-muted-foreground">
                  The hero cover photo shown on catalog cards and search listings.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                disabled={isUploadingMedia}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Camera className="h-4 w-4" />
                <span>Take Photo</span>
              </button>
            </div>

            {/* Single Primary Image Preview */}
            <div className="relative rounded-2xl overflow-hidden border border-border bg-neutral-900 aspect-video sm:aspect-[16/9] max-h-72 w-full flex items-center justify-center shadow-inner group">
              {editFormData.primaryImage ? (
                <>
                  <img
                    src={editFormData.primaryImage}
                    alt="Primary Product Photo"
                    className="w-full h-full object-cover object-center"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-bold text-white border border-white/15 shadow-sm">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      Cover Photo
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                  <div className="h-12 w-12 rounded-2xl bg-secondary/60 grid place-items-center mb-2">
                    <Camera className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">No product photo yet</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Click &ldquo;Take Photo&rdquo; to launch your phone camera</p>
                </div>
              )}

              {/* Uploading overlay */}
              {isUploadingMedia && (
                <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-4 z-20">
                  <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-2" />
                  <p className="text-xs font-bold text-white">Uploading photo to secure storage...</p>
                  {uploadProgress !== null && (
                    <div className="w-48 bg-white/20 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-300 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Hosted image URL fallback / inspection */}
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                Hosted Image URL
              </label>
              <input
                type="url"
                value={editFormData.primaryImage}
                onChange={(e) => setEditFormData({ ...editFormData, primaryImage: e.target.value })}
                placeholder="https://... (auto-filled on camera capture)"
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-foreground"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: CONDITION & DAMAGE DISCLOSURE */}
        <div className="p-5 sm:p-6 rounded-3xl border border-border bg-card space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">4. Condition & Wear Disclosures</h2>
              <p className="text-xs text-muted-foreground">Transparent disclosure protects your equipment during renter handovers.</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary px-2.5 py-1 rounded-full border border-border">
              Inspection
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Condition Grade</label>
              <select
                value={editFormData.conditionGrade}
                onChange={(e) => setEditFormData({ ...editFormData, conditionGrade: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-foreground cursor-pointer font-medium"
              >
                {CONDITION_GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Condition Notes</label>
              <input
                type="text"
                value={editFormData.conditionNotes}
                onChange={(e) => setEditFormData({ ...editFormData, conditionNotes: e.target.value })}
                placeholder="e.g. Minor scuff on lens hood, optics 100% spotless"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-foreground"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/20 border border-border space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editFormData.visibleDamage}
                onChange={(e) => setEditFormData({ ...editFormData, visibleDamage: e.target.checked })}
                className="rounded border-border text-foreground focus:ring-foreground h-4 w-4 cursor-pointer"
              />
              <span className="text-xs font-bold text-foreground">
                Equipment has visible cosmetic wear, scuffs, or minor markings
              </span>
            </label>
            {editFormData.visibleDamage && (
              <div className="pt-1">
                <label className="block text-xs font-bold text-foreground mb-1">
                  Damage Details & Locations <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required={editFormData.visibleDamage}
                  value={editFormData.damageDetails}
                  onChange={(e) => setEditFormData({ ...editFormData, damageDetails: e.target.value })}
                  placeholder="e.g. Scuff mark on tripod mount base, small scratch near battery latch"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-foreground"
                />
              </div>
            )}
          </div>
        </div>

        {/* SECTION 5: PICKUP LOCATION & INSTRUCTIONS */}
        <div className="p-5 sm:p-6 rounded-3xl border border-border bg-card space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">5. Handover Location & Instructions</h2>
              <p className="text-xs text-muted-foreground">Accurate handover location and specific instructions for verified renters.</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary px-2.5 py-1 rounded-full border border-border">
              Pickup
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">City</label>
              <input
                type="text"
                value={editFormData.city}
                onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                placeholder="e.g. Visakhapatnam"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-foreground"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Area / Locality</label>
              <input
                type="text"
                value={editFormData.area}
                onChange={(e) => setEditFormData({ ...editFormData, area: e.target.value })}
                placeholder="e.g. MVP Colony"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-foreground"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Pincode</label>
              <input
                type="text"
                value={editFormData.pincode}
                onChange={(e) => setEditFormData({ ...editFormData, pincode: e.target.value })}
                placeholder="e.g. 530017"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-foreground"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Pickup Instructions & Landmarks
            </label>
            <input
              type="text"
              value={editFormData.pickupInstructions}
              onChange={(e) => setEditFormData({ ...editFormData, pickupInstructions: e.target.value })}
              placeholder="e.g. Gate 2, near HDFC Bank ATM, please bring original Govt ID for physical verification"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-foreground"
            />
          </div>
        </div>

        {/* BOTTOM STICKY ACTION BAR */}
        <div className="sticky bottom-4 z-30 p-4 rounded-2xl bg-background/95 backdrop-blur-md border border-border shadow-elevation-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/payernt/products/$id", params: { id: product.id } })}
            className="px-4 py-2 rounded-xl border border-border hover:bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSavingEdit || isUploadingMedia}
            className="px-6 py-2.5 rounded-xl bg-accent-primary hover:bg-accent-hover text-white text-xs sm:text-sm font-bold active:scale-[0.98] cursor-pointer shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isUploadingMedia ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Uploading Media...</span>
              </>
            ) : isSavingEdit ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default LenderProductEdit;
