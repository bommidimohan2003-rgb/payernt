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
  Filter,
  X,
  MapPin,
  Tag,
  ArrowLeft,
  Video,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { PayerntProduct, VerificationStatus } from "../types";
import { resolveProductImageUrl, resolveAllProductImages } from "../productUtils";

export interface MyProductsProps {
  products: PayerntProduct[];
  onToggleAvailability: (productId: string) => void;
  onDeleteProduct: (productId: string) => void;
  onUpdateProduct?: (productId: string, updates: Partial<PayerntProduct>) => Promise<{ success: boolean; product?: PayerntProduct; error?: string }> | void;
  onAddNewGear: () => void;
  onNavigateToRequests: () => void;
  onBack?: () => void;
  onInspectProduct?: (product: PayerntProduct) => void;
  onEditProduct?: (product: PayerntProduct) => void;
}

export function MyProducts({
  products,
  onToggleAvailability,
  onDeleteProduct,
  onUpdateProduct,
  onAddNewGear,
  onNavigateToRequests,
  onBack,
  onInspectProduct,
  onEditProduct,
}: MyProductsProps) {
  const navigate = useNavigate();
  const [filterTab, setFilterTab] = useState<"all" | "approved" | "under_review" | "draft" | "paused">("all");

  // Delete Confirmation Dialog State
  const [productToDelete, setProductToDelete] = useState<PayerntProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter products by tab
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
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-md text-neutral-300 border border-white/15 shadow-sm">
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
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/25 backdrop-blur-md text-amber-300 border border-amber-400/40 flex items-center gap-1 shadow-sm">
          <Clock className="h-3 w-3" /> PENDING REVIEW
        </span>
      );
    }
    if (effStatus === "needs_correction" || effStatus === "revision_required") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/25 backdrop-blur-md text-orange-300 border border-orange-400/40 flex items-center gap-1 shadow-sm">
          <AlertCircle className="h-3 w-3" /> NEEDS CORRECTION
        </span>
      );
    }
    if (effStatus === "rejected") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-destructive/30 backdrop-blur-md text-red-300 border border-destructive/40 flex items-center gap-1 shadow-sm">
          <X className="h-3 w-3" /> REJECTED
        </span>
      );
    }
    if (effStatus === "approved" || effStatus === "verified" || effStatus === "active") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/25 backdrop-blur-md text-emerald-300 border border-emerald-400/40 flex items-center gap-1 shadow-sm">
          <CheckCircle2 className="h-3 w-3" /> APPROVED & LIVE
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-md text-neutral-300 border border-white/15 shadow-sm">
        LISTED
      </span>
    );
  };

  const handleInspect = (product: PayerntProduct) => {
    if (onInspectProduct) {
      onInspectProduct(product);
    } else {
      try {
        navigate({ to: "/payernt/products/$id", params: { id: String(product.id) } });
      } catch {
        navigate({ to: `/payernt/products/${product.id}` as any });
      }
    }
  };

  const handleEdit = (product: PayerntProduct) => {
    if (onEditProduct) {
      onEditProduct(product);
    } else {
      try {
        navigate({ to: "/payernt/products/$id/edit", params: { id: String(product.id) } });
      } catch {
        navigate({ to: `/payernt/products/${product.id}/edit` as any });
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteProduct(productToDelete.id);
      toast.success(`"${productToDelete.title || productToDelete.name || "Equipment"}" listing deleted successfully.`);
      setProductToDelete(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete product.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 text-left pb-16 max-w-7xl mx-auto">
      {/* Back Button */}
      {onBack && (
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-secondary text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs group"
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
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-primary hover:bg-accent-hover text-white text-xs font-bold shadow-xs active:scale-[0.98] transition-all cursor-pointer shrink-0"
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
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-secondary/15 space-y-3">
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const dailyRate =
              product.pricing?.daily ??
              (product as any).daily_rate ??
              (product as any).dailyRate ??
              product.price ??
              500;
            const locCity =
              typeof product.location === "object"
                ? product.location?.city || product.location?.area || "Visakhapatnam"
                : product.location || "Visakhapatnam";
            const brandLabel =
              product.brand || (product as any).specs?.brand || product.category || "Pro Gear";
            const hasVideo = Boolean(product.videoUrl || (product as any).video_url);
            const imgUrl = resolveProductImageUrl(product);
            const allImages = resolveAllProductImages(product);
            const galleryCount = allImages.length;
            const isPaused = product.availabilityStatus === "paused";

            return (
              <motion.div
                key={product.id}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => handleInspect(product)}
                className="group relative w-full rounded-[32px] overflow-hidden bg-[#0c0d10] border border-white/[0.09] shadow-xl hover:shadow-2xl hover:border-white/20 transition-all duration-300 cursor-pointer flex flex-col justify-between p-5 select-none text-left"
              >
                {/* 1. DOMINANT PRODUCT VISUAL (Apple Style "1 Big Element") */}
                <div className="relative w-full aspect-[16/11] rounded-[24px] overflow-hidden bg-[#16171c] border border-white/[0.06] mb-4">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={product.title || product.name || "Equipment"}
                      className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-106 pointer-events-none"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/40 p-6 text-center bg-[#15161a]">
                      <Package className="h-12 w-12 mb-2 opacity-30 text-neutral-400" />
                      <span className="text-xs font-semibold text-neutral-500">No image uploaded</span>
                    </div>
                  )}

                  {/* Subtle dark gradient overlay near bottom of image */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d10] via-transparent to-transparent opacity-80 pointer-events-none" />

                  {/* FLOATING TOP BADGES & ACTIONS */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 pointer-events-auto z-10">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Status badge */}
                      {getStatusBadge(product.verificationStatus, product.status)}

                      {/* Availability pill */}
                      {isPaused ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30 shadow-md">
                          <Clock className="h-3 w-3 text-amber-400" />
                          <span>Paused</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30 shadow-md">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Available</span>
                        </span>
                      )}

                      {/* Genuine rating badge (only if exists) */}
                      {product.rating && (
                        <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/15 shadow-sm">
                          <Sparkles className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span>{Number(product.rating).toFixed(1)}</span>
                        </div>
                      )}

                      {/* Inspection Video badge */}
                      {hasVideo && (
                        <div
                          className="flex items-center gap-1 bg-sky-500/25 backdrop-blur-md text-sky-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-400/40 shadow-sm"
                          title="10s Inspection Video Stored"
                        >
                          <Video className="h-3 w-3 text-sky-400" />
                          <span>Video</span>
                        </div>
                      )}

                      {/* Multiple Photos count badge */}
                      {galleryCount > 1 && (
                        <div
                          className="flex items-center gap-1 bg-black/60 backdrop-blur-md text-neutral-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/15 shadow-sm"
                          title={`${galleryCount} Photos Available`}
                        >
                          <Layers className="h-3 w-3 text-neutral-300" />
                          <span>{galleryCount}</span>
                        </div>
                      )}
                    </div>

                    {/* Isolated Delete Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setProductToDelete(product);
                      }}
                      className="h-8 w-8 rounded-full bg-black/60 hover:bg-destructive text-neutral-400 hover:text-white border border-white/15 flex items-center justify-center transition-all cursor-pointer shadow-md shrink-0 active:scale-95"
                      title="Delete Equipment Listing"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* 2. EDITORIAL TYPOGRAPHY & DETAILS (Apple Presentation Style) */}
                <div className="space-y-2.5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Eyebrow: Brand & Category + Location */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 font-sans truncate">
                        {brandLabel}
                      </span>
                      {locCity && (
                        <span
                          title={locCity}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/[0.07] text-neutral-300 text-[10px] font-medium border border-white/[0.08] truncate max-w-[140px]"
                        >
                          <MapPin className="h-2.5 w-2.5 text-sky-400 shrink-0" />
                          <span className="truncate">{locCity}</span>
                        </span>
                      )}
                    </div>

                    {/* Bold Title */}
                    <h3
                      className="font-extrabold text-xl sm:text-2xl text-white tracking-tight leading-tight line-clamp-1 font-display group-hover:text-sky-300 transition-colors mt-0.5"
                      title={product.title || product.name}
                    >
                      {product.title || product.name || "Untitled Equipment"}
                    </h3>

                    {/* Accent Daily Price */}
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-sky-400 font-mono font-black text-xl tracking-tight">
                        ₹{Number(dailyRate).toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs text-neutral-400 font-normal font-sans">
                        /day
                      </span>
                    </div>

                    {/* Editorial Description Paragraph */}
                    <p className="text-xs text-neutral-300/80 leading-relaxed line-clamp-2 mt-1.5 min-h-[2.25rem]">
                      {product.description ||
                        `Professional-grade ${product.title || "equipment"} prepared and maintained for high-performance rental handovers.`}
                    </p>
                  </div>

                  {/* 3. PROMINENT APPLE-STYLE ACTION CONTROLS */}
                  <div className="pt-3 border-t border-white/[0.08] flex items-center gap-2 mt-2 pointer-events-auto">
                    {/* Primary Button: Apple-style bold blue pill ("Add to Bag" equivalent) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleInspect(product);
                      }}
                      className="flex-1 bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold text-xs py-2.5 px-4 rounded-full shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Inspect full equipment details"
                    >
                      <Eye className="h-3.5 w-3.5 text-white" />
                      <span>Inspect Details</span>
                    </button>

                    {/* Secondary Button: Sleek frosted glass pill ("Edit") */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleEdit(product);
                      }}
                      className="bg-white/10 hover:bg-white/20 text-white font-semibold text-xs py-2.5 px-4 rounded-full border border-white/15 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      title="Edit equipment specifications"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-neutral-300" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* SAFE DELETE CONFIRMATION DIALOG */}
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
                    alt={productToDelete.title || "Equipment"}
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
