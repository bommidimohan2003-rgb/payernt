import React, { useState, useMemo } from "react";
import {
  Package,
  Plus,
  Power,
  Trash2,
  Edit3,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  IndianRupee,
  Layers,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Filter,
  X,
  RefreshCw,
  ExternalLink,
  MapPin,
  Calendar,
  DollarSign,
  SlidersHorizontal,
  ArrowLeft,
  Video,
  Copy,
  Check,
  AlertTriangle,
  Upload,
  Camera,
  Image as ImageIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { PayerntProduct, VerificationStatus } from "../types";
import { resolveProductImageUrl, resolveAllProductImages } from "../productUtils";

interface MyProductsProps {
  products: PayerntProduct[];
  onToggleAvailability: (productId: string) => void;
  onDeleteProduct: (productId: string) => void;
  onUpdateProduct: (productId: string, updates: Partial<PayerntProduct>) => void;
  onAddNewGear: () => void;
  onNavigateToRequests: () => void;
  onBack?: () => void;
}

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

/**
 * Robust Product Card Image with loading state, safe URL resolution,
 * and guaranteed visual fallback (never renders an empty dark rectangle).
 */
function ProductCardImage({
  product,
  aspectRatio = "aspect-[16/10]",
}: {
  product: PayerntProduct;
  aspectRatio?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const imgUrl = useMemo(() => resolveProductImageUrl(product), [product]);

  return (
    <div
      className={`relative rounded-xl overflow-hidden ${aspectRatio} bg-secondary/70 border border-border/80 flex items-center justify-center`}
    >
      {imgUrl && !hasError ? (
        <>
          {isLoading && (
            <div className="absolute inset-0 bg-secondary/50 flex items-center justify-center animate-pulse z-0">
              <Package className="h-6 w-6 text-muted-foreground/30 animate-pulse" />
            </div>
          )}
          <img
            src={imgUrl}
            alt={product.title || "Gear item"}
            className={`w-full h-full object-cover object-center group-hover:scale-103 transition-transform duration-300 z-1 ${
              isLoading ? "opacity-0" : "opacity-100"
            }`}
            loading="lazy"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
          />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center text-muted-foreground p-3 text-center w-full h-full bg-gradient-to-b from-secondary/40 to-secondary/80">
          <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center mb-1 text-muted-foreground border border-border/60 shadow-2xs">
            <Package className="h-5 w-5 stroke-[1.4] opacity-80" />
          </div>
          <span className="text-[11px] font-bold text-foreground/85 uppercase tracking-wide truncate max-w-[90%]">
            {product.category || "Gear"}
          </span>
          <span className="text-[10px] text-muted-foreground/75">No image uploaded</span>
        </div>
      )}
    </div>
  );
}

export function MyProducts({
  products,
  onToggleAvailability,
  onDeleteProduct,
  onUpdateProduct,
  onAddNewGear,
  onNavigateToRequests,
  onBack,
}: MyProductsProps) {
  const [filterTab, setFilterTab] = useState<"all" | "approved" | "under_review" | "draft" | "paused">("all");
  const [selectedProduct, setSelectedProduct] = useState<PayerntProduct | null>(null);
  const [activeGalleryIdx, setActiveGalleryIdx] = useState<number>(0);
  const [copiedId, setCopiedId] = useState(false);

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState<PayerntProduct | null>(null);
  const [editFormData, setEditFormData] = useState<{
    title: string;
    category: string;
    brand: string;
    model: string;
    description: string;
    dailyPrice: string;
    weeklyPrice: string;
    conditionGrade: string;
    conditionNotes: string;
    visibleDamage: boolean;
    damageDetails: string;
    city: string;
    area: string;
    pincode: string;
    pickupInstructions: string;
    primaryImage: string;
    availabilityStatus: "available" | "paused";
  }>({
    title: "",
    category: "Cameras",
    brand: "",
    model: "",
    description: "",
    dailyPrice: "500",
    weeklyPrice: "",
    conditionGrade: "Like New",
    conditionNotes: "",
    visibleDamage: false,
    damageDetails: "",
    city: "Visakhapatnam",
    area: "",
    pincode: "",
    pickupInstructions: "",
    primaryImage: "",
    availabilityStatus: "available",
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Confirmation Dialog State
  const [productToDelete, setProductToDelete] = useState<PayerntProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const isApproved =
      p.verificationStatus === "approved" ||
      p.verificationStatus === "verified" ||
      p.status === "approved" ||
      p.status === "active";
    const isUnderReview =
      p.verificationStatus === "under_review" ||
      p.verificationStatus === "submitted" ||
      p.status === "under_review" ||
      p.status === "pending" ||
      p.status === "pending_admin_review" ||
      p.status === "pending_confirmation";

    if (filterTab === "all") return true;
    if (filterTab === "approved") return isApproved;
    if (filterTab === "under_review") return isUnderReview;
    if (filterTab === "draft") return p.verificationStatus === "draft" || p.status === "draft";
    if (filterTab === "paused") return p.availabilityStatus === "paused";
    return true;
  });

  const getStatusBadge = (verificationStatus?: VerificationStatus, status?: string) => {
    const effStatus = verificationStatus || status;

    if (effStatus === "draft") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-muted-foreground border border-border shadow-2xs">
          DRAFT
        </span>
      );
    }
    if (
      effStatus === "under_review" ||
      effStatus === "submitted" ||
      effStatus === "pending" ||
      effStatus === "pending_admin_review" ||
      effStatus === "pending_confirmation"
    ) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1 shadow-2xs backdrop-blur-xs">
          <Clock className="h-3 w-3" /> PENDING REVIEW
        </span>
      );
    }
    if (effStatus === "needs_correction" || effStatus === "revision_required") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 flex items-center gap-1 shadow-2xs backdrop-blur-xs">
          <AlertCircle className="h-3 w-3" /> NEEDS CORRECTION
        </span>
      );
    }
    if (effStatus === "rejected") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-1 shadow-2xs backdrop-blur-xs">
          <X className="h-3 w-3" /> REJECTED
        </span>
      );
    }
    if (effStatus === "approved" || effStatus === "verified" || effStatus === "active") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 border border-neutral-900 dark:border-white flex items-center gap-1 shadow-2xs backdrop-blur-xs">
          <CheckCircle2 className="h-3 w-3" /> APPROVED & LIVE
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-muted-foreground border border-border">
        LISTED
      </span>
    );
  };

  // Open Edit Modal with prefilled product values
  const handleOpenEdit = (p: PayerntProduct) => {
    const daily = p.pricing?.daily ?? (p as any).daily_rate ?? (p as any).dailyRate ?? p.price ?? 500;
    const weekly = p.pricing?.weekly ?? (p as any).weekly_rate ?? (p as any).weeklyRate ?? "";
    const condGrade = typeof p.condition === "object" ? p.condition?.grade || "Like New" : p.condition || "Like New";
    const condNotes = typeof p.condition === "object" ? p.condition?.additionalNotes || p.condition?.notes || "" : "";
    const visDmg = typeof p.condition === "object" ? Boolean(p.condition?.visibleDamage) : false;
    const dmgDetails = p.damageDetails || (typeof p.condition === "object" ? p.condition?.damageDetails || p.condition?.damageDescription || "" : "");
    const cityVal = typeof p.location === "object" ? p.location?.city || "Visakhapatnam" : p.location || "Visakhapatnam";
    const areaVal = typeof p.location === "object" ? p.location?.area || "" : "";
    const pinVal = typeof p.location === "object" ? p.location?.pincode || (p.location as any)?.postalCode || "" : (p as any).pincode || "";
    const pickupInst = typeof p.location === "object" ? p.location?.pickupInstructions || "" : (p as any).pickup_instructions || "";
    const resolvedImg = resolveProductImageUrl(p);

    setEditFormData({
      title: p.title || p.name || "",
      category: p.category || "Cameras",
      brand: p.brand || p.specs?.brand || "",
      model: p.model || p.specs?.model || "",
      description: p.description || "",
      dailyPrice: String(daily),
      weeklyPrice: weekly ? String(weekly) : "",
      conditionGrade: condGrade,
      conditionNotes: condNotes,
      visibleDamage: visDmg,
      damageDetails: dmgDetails,
      city: cityVal,
      area: areaVal,
      pincode: pinVal,
      pickupInstructions: pickupInst,
      primaryImage: resolvedImg,
      availabilityStatus: p.availabilityStatus === "paused" ? "paused" : "available",
    });

    setEditingProduct(p);
  };

  // Submit Edit Modal updates
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

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

    const weeklyNum = editFormData.weeklyPrice ? Number(editFormData.weeklyPrice) : Math.round(priceNum * 7 * 0.85);

    setIsSavingEdit(true);
    try {
      const updates: Partial<PayerntProduct> = {
        title: trimmedTitle,
        name: trimmedTitle,
        category: editFormData.category,
        brand: editFormData.brand.trim() || undefined,
        model: editFormData.model.trim() || undefined,
        description: editFormData.description.trim(),
        primaryImage: editFormData.primaryImage.trim() || editingProduct.primaryImage,
        primary_image: editFormData.primaryImage.trim() || editingProduct.primaryImage,
        image: editFormData.primaryImage.trim() || editingProduct.primaryImage,
        price: priceNum,
        daily_rate: priceNum,
        dailyRate: priceNum,
        pricing: {
          ...editingProduct.pricing,
          daily: priceNum,
          weekly: weeklyNum,
          monthly: Math.round(priceNum * 30 * 0.7),
          securityDeposit: 0,
        },
        condition: {
          ...((editingProduct.condition && typeof editingProduct.condition === "object") ? editingProduct.condition : {}),
          grade: editFormData.conditionGrade as any,
          visibleDamage: editFormData.visibleDamage,
          damageDetails: editFormData.visibleDamage ? editFormData.damageDetails.trim() : "None",
          additionalNotes: editFormData.conditionNotes.trim() || undefined,
        },
        condition_grade: editFormData.conditionGrade,
        damageDetails: editFormData.visibleDamage ? editFormData.damageDetails.trim() : "None",
        location: {
          ...((editingProduct.location && typeof editingProduct.location === "object") ? editingProduct.location : {}),
          city: editFormData.city.trim(),
          area: editFormData.area.trim(),
          pincode: editFormData.pincode.trim(),
          pickupInstructions: editFormData.pickupInstructions.trim(),
        },
        city: editFormData.city.trim(),
        area: editFormData.area.trim(),
        pincode: editFormData.pincode.trim(),
        pickup_instructions: editFormData.pickupInstructions.trim(),
        availabilityStatus: editFormData.availabilityStatus,
      };

      onUpdateProduct(editingProduct.id, updates);

      // If Inspect modal was open for this product, sync it
      if (selectedProduct && selectedProduct.id === editingProduct.id) {
        setSelectedProduct({ ...selectedProduct, ...updates } as PayerntProduct);
      }

      toast.success("Product listing updated successfully!");
      setEditingProduct(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save product changes.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Safe Deletion Handler
  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      onDeleteProduct(productToDelete.id);
      if (selectedProduct && selectedProduct.id === productToDelete.id) {
        setSelectedProduct(null);
      }
      toast.success(`"${productToDelete.title}" listing deleted successfully.`);
      setProductToDelete(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete product.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-5 text-left pb-16">
      {/* Back Button */}
      {onBack && (
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-secondary text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs group"
          >
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground font-display">
            My Equipment Listings
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your peer-to-peer equipment inventory, pricing, availability, and Admin review statuses.
          </p>
        </div>

        <button
          onClick={onAddNewGear}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent-primary hover:bg-accent-hover text-white text-xs font-bold shadow-xs active:scale-[0.98] transition-all cursor-pointer shrink-0"
        >
          <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: "all", label: `All (${products.length})` },
          {
            id: "approved",
            label: `Approved & Live (${
              products.filter(
                (p) =>
                  p.verificationStatus === "approved" ||
                  p.verificationStatus === "verified" ||
                  p.status === "approved" ||
                  p.status === "active"
              ).length
            })`,
          },
          {
            id: "under_review",
            label: `Under Review (${
              products.filter(
                (p) =>
                  p.verificationStatus === "under_review" ||
                  p.verificationStatus === "submitted" ||
                  p.status === "under_review" ||
                  p.status === "pending" ||
                  p.status === "pending_admin_review" ||
                  p.status === "pending_confirmation"
              ).length
            })`,
          },
          {
            id: "draft",
            label: `Drafts (${
              products.filter((p) => p.verificationStatus === "draft" || p.status === "draft").length
            })`,
          },
          {
            id: "paused",
            label: `Paused (${
              products.filter((p) => p.availabilityStatus === "paused").length
            })`,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border active:scale-[0.98] ${
              filterTab === tab.id
                ? "bg-accent-primary text-white border-accent-primary shadow-2xs font-bold"
                : "bg-card hover:bg-secondary text-muted-foreground hover:text-foreground border-border"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="p-10 text-center rounded-2xl border border-dashed border-border bg-secondary/15 space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-secondary text-muted-foreground flex items-center justify-center mx-auto border border-border">
            <Package className="h-6 w-6 opacity-70" />
          </div>
          <h3 className="text-sm font-bold text-foreground">No listings found in this filter</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            You haven't listed any equipment matching this criteria yet.
          </p>
          <button
            onClick={onAddNewGear}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent-primary hover:bg-accent-hover text-white text-xs font-bold active:scale-[0.98] transition-all cursor-pointer mt-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>List a Product</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const dailyRate =
              product.pricing?.daily ??
              (product as any).daily_rate ??
              (product as any).dailyRate ??
              product.price ??
              500;
            const condGrade =
              typeof product.condition === "object"
                ? product.condition?.grade || "Good"
                : product.condition || "Good";
            const locCity =
              typeof product.location === "object"
                ? product.location?.city || product.location?.area || "Visakhapatnam"
                : product.location || "Visakhapatnam";
            const hasVideo = Boolean(product.videoUrl || (product as any).video_url);

            return (
              <div
                key={product.id}
                className="rounded-2xl border border-border/80 bg-card p-3.5 sm:p-4 hover:border-foreground/30 transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs group"
              >
                <div className="space-y-3">
                  {/* Top Image area with badges */}
                  <div className="relative">
                    <ProductCardImage product={product} aspectRatio="aspect-[16/10]" />

                    {/* Status badge top-left */}
                    <div className="absolute top-2 left-2 flex items-center gap-1 pointer-events-none z-10">
                      {getStatusBadge(product.verificationStatus, product.status)}
                    </div>

                    {/* 10-Second inspection video tag top-right */}
                    {hasVideo && (
                      <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded-lg text-[9px] font-bold text-white flex items-center gap-1 border border-white/20 shadow-xs z-10">
                        <Video className="h-3 w-3 text-primary" />
                        <span>10s Video</span>
                      </div>
                    )}

                    {/* Daily rate badge bottom-right */}
                    <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-md px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold text-foreground border border-border/80 shadow-2xs z-10">
                      ₹{dailyRate}
                      <span className="text-[9px] font-sans font-normal text-muted-foreground ml-0.5">/day</span>
                    </div>
                  </div>

                  {/* Title & category */}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                        {product.category || "Gear"}
                      </span>
                      {product.availabilityStatus === "paused" && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Paused
                        </span>
                      )}
                    </div>
                    <h3
                      className="text-xs sm:text-sm font-bold text-foreground truncate"
                      title={product.title || product.name}
                    >
                      {product.title || product.name || "Untitled Equipment"}
                    </h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {product.description || "No description provided."}
                    </p>
                  </div>

                  {/* Details strip: Condition & Location */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-[11px]">
                    <div>
                      <span className="text-[9px] uppercase tracking-wide text-muted-foreground/75 block">Condition</span>
                      <span className="font-semibold text-foreground text-xs truncate block">
                        {condGrade}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wide text-muted-foreground/75 block">Location</span>
                      <span className="font-semibold text-foreground text-xs truncate block">
                        {locCity}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Controls: Inspect, Edit, Delete */}
                <div className="pt-3 border-t border-border/60 mt-3">
                  <div className="flex items-center justify-between gap-1.5">
                    {/* Inspect Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProduct(product);
                        setActiveGalleryIdx(0);
                      }}
                      className="flex-1 px-2.5 py-1.5 rounded-xl border border-border/80 bg-secondary/50 hover:bg-secondary text-xs font-semibold text-foreground flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer"
                      title="Inspect full product details"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Inspect</span>
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(product)}
                      className="px-2.5 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-secondary text-xs font-semibold text-foreground flex items-center gap-1 active:scale-[0.98] transition-all cursor-pointer"
                      title="Edit product information"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => setProductToDelete(product)}
                      className="p-1.5 rounded-xl border border-border/80 hover:bg-destructive/10 text-destructive active:scale-[0.98] transition-all cursor-pointer"
                      title="Delete equipment listing"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. COMPREHENSIVE INSPECT MODAL (Full Product Information) */}
      {/* ============================================================ */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-surface-modal border border-border rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 space-y-5 shadow-elevation-3 animate-in zoom-in-95 duration-200 text-left my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/80 pb-3.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold uppercase text-muted-foreground tracking-wider">
                  Equipment Inspection
                </span>
                {getStatusBadge(selectedProduct.verificationStatus, selectedProduct.status)}
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Close Inspection"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Media & Key Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              {/* Image Preview & Gallery Column */}
              <div className="md:col-span-5 space-y-2.5">
                {(() => {
                  const gallery = resolveAllProductImages(selectedProduct);
                  const activeImg = gallery[activeGalleryIdx] || resolveProductImageUrl(selectedProduct);
                  const dailyRate =
                    selectedProduct.pricing?.daily ??
                    (selectedProduct as any).daily_rate ??
                    (selectedProduct as any).dailyRate ??
                    selectedProduct.price ??
                    500;

                  return (
                    <>
                      <div className="rounded-2xl overflow-hidden border border-border aspect-[4/3] bg-secondary/70 relative flex items-center justify-center">
                        {activeImg ? (
                          <img
                            src={activeImg}
                            alt={selectedProduct.title}
                            className="w-full h-full object-cover object-center"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                            <Package className="h-10 w-10 opacity-70 mb-1" />
                            <span className="text-xs font-semibold">No Image Available</span>
                          </div>
                        )}
                        <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-background/90 backdrop-blur-xs text-xs font-mono font-bold text-foreground border border-border shadow-xs">
                          ₹{dailyRate}/day
                        </div>
                      </div>

                      {/* Thumbnails if multiple images exist */}
                      {gallery.length > 1 && (
                        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                          {gallery.map((url, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActiveGalleryIdx(idx)}
                              className={`h-14 w-14 rounded-xl overflow-hidden border-2 shrink-0 cursor-pointer transition-all ${
                                activeGalleryIdx === idx
                                  ? "border-foreground scale-102"
                                  : "border-border/60 opacity-70 hover:opacity-100"
                              }`}
                            >
                              <img src={url} alt={`Angle ${idx + 1}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Details Column */}
              <div className="md:col-span-7 space-y-3.5">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                    {selectedProduct.category}
                    {selectedProduct.specs?.brand ? ` • ${selectedProduct.specs.brand}` : selectedProduct.brand ? ` • ${selectedProduct.brand}` : ""}
                    {selectedProduct.specs?.model ? ` ${selectedProduct.specs.model}` : selectedProduct.model ? ` ${selectedProduct.model}` : ""}
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-foreground font-display mt-0.5">
                    {selectedProduct.title || selectedProduct.name}
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                    {selectedProduct.description || "No full description provided for this gear."}
                  </p>
                </div>

                {/* Rental Pricing Summary Grid */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-secondary/40 border border-border">
                  <div>
                    <span className="text-[9px] text-muted-foreground uppercase font-mono block">Daily Rate</span>
                    <span className="text-xs sm:text-sm font-bold font-mono text-foreground">
                      ₹{selectedProduct.pricing?.daily ?? (selectedProduct as any).daily_rate ?? selectedProduct.price ?? 500}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground uppercase font-mono block">Weekly Rate</span>
                    <span className="text-xs sm:text-sm font-bold font-mono text-foreground">
                      ₹{selectedProduct.pricing?.weekly ?? Math.round(Number(selectedProduct.pricing?.daily || selectedProduct.price || 500) * 7 * 0.85)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground uppercase font-mono block">Security Deposit</span>
                    <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      ₹0 (Platform Protected)
                    </span>
                  </div>
                </div>

                {/* Structured Metadata Breakdown */}
                <div className="space-y-1.5 border-t border-border/80 pt-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground text-[11px]">Condition Grade</span>
                    <span className="font-semibold text-foreground text-[11px]">
                      {typeof selectedProduct.condition === "object"
                        ? selectedProduct.condition?.grade || "Good"
                        : selectedProduct.condition || "Good"}
                    </span>
                  </div>

                  {typeof selectedProduct.condition === "object" && selectedProduct.condition?.additionalNotes && (
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground text-[11px]">Condition Notes</span>
                      <span className="font-medium text-foreground text-right max-w-xs truncate text-[11px]">
                        {selectedProduct.condition.additionalNotes}
                      </span>
                    </div>
                  )}

                  {((typeof selectedProduct.condition === "object" && selectedProduct.condition?.visibleDamage) || selectedProduct.damageDetails) && (
                    <div className="flex justify-between py-1 border-b border-border/40 text-amber-600 dark:text-amber-400">
                      <span className="text-[11px]">Disclosed Damage</span>
                      <span className="font-medium text-right max-w-xs truncate text-[11px]">
                        {selectedProduct.damageDetails || (typeof selectedProduct.condition === "object" ? selectedProduct.condition?.damageDetails : "Minor wear noted")}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground text-[11px]">Pickup Location</span>
                    <span className="font-semibold text-foreground text-right text-[11px] truncate max-w-[60%]">
                      {typeof selectedProduct.location === "object"
                        ? `${selectedProduct.location?.area ? selectedProduct.location.area + ", " : ""}${selectedProduct.location?.city || "Visakhapatnam"}`
                        : selectedProduct.location || "Visakhapatnam"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground text-[11px]">Availability Status</span>
                    <span className="font-semibold text-[11px] capitalize">
                      {selectedProduct.availabilityStatus === "paused" ? "Paused (Not accepting rentals)" : "Active & Rentable"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <span className="text-muted-foreground text-[11px]">Listing ID</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-muted-foreground text-[11px]">
                        {selectedProduct.id}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedProduct.id);
                          setCopiedId(true);
                          setTimeout(() => setCopiedId(false), 2000);
                          toast.success("Listing ID copied to clipboard!");
                        }}
                        className="text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Copy ID"
                      >
                        {copiedId ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 10-Second Inspection Video Player */}
            {(selectedProduct.videoUrl || (selectedProduct as any).video_url) && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-secondary/40 border border-border space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <div className="flex items-center gap-1.5 text-foreground">
                    <Video className="h-4 w-4 text-primary" />
                    <span>Verified 10-Second Inspection Video</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="h-3 w-3" /> Live Evidence
                  </span>
                </div>
                <div className="relative rounded-xl overflow-hidden bg-black border border-border aspect-video max-h-[280px]">
                  <video
                    src={selectedProduct.videoUrl || (selectedProduct as any).video_url}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  const toEdit = selectedProduct;
                  setSelectedProduct(null);
                  handleOpenEdit(toEdit);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-semibold text-foreground transition-all cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit This Listing</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="px-5 py-2 rounded-xl bg-foreground text-background text-xs font-bold active:scale-[0.98] cursor-pointer shadow-xs hover:opacity-90 transition-all"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. FULL EDIT PRODUCT MODAL (Update Existing Products) */}
      {/* ============================================================ */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-surface-modal border border-border rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-7 space-y-5 shadow-elevation-3 animate-in zoom-in-95 duration-200 text-left my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/80 pb-3.5">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-foreground font-display flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-foreground" />
                  Edit Equipment Listing
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Update equipment specifications, rental rate, description, and images.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Product Title */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Equipment Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  placeholder="e.g. Sony A7 IV Mirrorless Camera"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-foreground"
                />
              </div>

              {/* Category, Brand & Model Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Category <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-foreground cursor-pointer"
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
                    placeholder="e.g. A7M4"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-foreground"
                  />
                </div>
              </div>

              {/* Rental Rates & Availability Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-2xl bg-secondary/30 border border-border">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Daily Rate (₹) <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs font-mono text-muted-foreground">₹</span>
                    <input
                      type="number"
                      required
                      min="1"
                      value={editFormData.dailyPrice}
                      onChange={(e) => setEditFormData({ ...editFormData, dailyPrice: e.target.value })}
                      className="w-full pl-6 pr-3 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs font-mono font-bold focus:outline-hidden focus:ring-1 focus:ring-foreground"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Weekly Rate (₹) <span className="text-[10px] font-normal text-muted-foreground">(Optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs font-mono text-muted-foreground">₹</span>
                    <input
                      type="number"
                      min="1"
                      value={editFormData.weeklyPrice}
                      onChange={(e) => setEditFormData({ ...editFormData, weeklyPrice: e.target.value })}
                      placeholder="Auto calculated"
                      className="w-full pl-6 pr-3 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-foreground"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Listing Status</label>
                  <select
                    value={editFormData.availabilityStatus}
                    onChange={(e) => setEditFormData({ ...editFormData, availabilityStatus: e.target.value as any })}
                    className="w-full px-3 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-foreground cursor-pointer"
                  >
                    <option value="available">Active & Rentable</option>
                    <option value="paused">Paused (Temporarily unavailable)</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Product Description <span className="text-destructive">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="Describe your gear, included components, capabilities, and rental terms..."
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-foreground resize-none"
                />
              </div>

              {/* Image URL / Replacement */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Product Primary Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={editFormData.primaryImage}
                    onChange={(e) => setEditFormData({ ...editFormData, primaryImage: e.target.value })}
                    placeholder="https://images.unsplash.com/... or hosted image URL"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-foreground"
                  />
                  {editFormData.primaryImage && (
                    <div className="h-9 w-9 rounded-xl overflow-hidden border border-border shrink-0 bg-secondary">
                      <img
                        src={editFormData.primaryImage}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Provide a direct image URL or leave unchanged to preserve the current uploaded photo.
                </p>
              </div>

              {/* Condition Grade & Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Condition Grade</label>
                  <select
                    value={editFormData.conditionGrade}
                    onChange={(e) => setEditFormData({ ...editFormData, conditionGrade: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-foreground cursor-pointer"
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
                    placeholder="e.g. Minor cosmetic scratches on bottom"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-foreground"
                  />
                </div>
              </div>

              {/* Location Details */}
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
                    placeholder="e.g. Madhurawada"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Pincode</label>
                  <input
                    type="text"
                    value={editFormData.pincode}
                    onChange={(e) => setEditFormData({ ...editFormData, pincode: e.target.value })}
                    placeholder="e.g. 530048"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-foreground"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-xl border border-border hover:bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-accent-primary hover:bg-accent-hover text-white text-xs font-bold active:scale-[0.98] cursor-pointer shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <>
                      <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. SAFE DELETE CONFIRMATION DIALOG */}
      {/* ============================================================ */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-surface-modal border border-border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-elevation-3 animate-in zoom-in-95 duration-200 text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Delete Equipment Listing?</h3>
                <p className="text-xs text-muted-foreground">
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-secondary/40 border border-border flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl overflow-hidden bg-secondary shrink-0 border border-border flex items-center justify-center">
                {resolveProductImageUrl(productToDelete) ? (
                  <img
                    src={resolveProductImageUrl(productToDelete)}
                    alt={productToDelete.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground block truncate">
                  {productToDelete.category}
                </span>
                <span className="text-xs font-bold text-foreground block truncate">
                  {productToDelete.title || productToDelete.name}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground block">
                  ₹{productToDelete.pricing?.daily ?? (productToDelete as any).daily_rate ?? productToDelete.price ?? 500}/day
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete this listing? It will be removed from your catalog and will no longer accept new rental bookings.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 rounded-xl border border-border hover:bg-secondary text-xs font-semibold text-foreground transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold active:scale-[0.98] transition-all cursor-pointer shadow-xs hover:opacity-90 flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="h-3 w-3 border-2 border-destructive-foreground border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Listing</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyProducts;
