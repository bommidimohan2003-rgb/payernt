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
  Sparkles,
  Star,
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
import { resolveProductImageUrl } from "../productUtils";

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
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-md text-neutral-300 border border-white/15 shadow-sm">
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
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/25 backdrop-blur-md text-amber-300 border border-amber-400/40 flex items-center gap-1 shadow-sm">
          <Clock className="h-3 w-3" /> PENDING REVIEW
        </span>
      );
    }
    if (effStatus === "needs_correction" || effStatus === "revision_required") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/25 backdrop-blur-md text-orange-300 border border-orange-400/40 flex items-center gap-1 shadow-sm">
          <AlertCircle className="h-3 w-3" /> NEEDS CORRECTION
        </span>
      );
    }
    if (effStatus === "rejected") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/30 backdrop-blur-md text-red-300 border border-destructive/40 flex items-center gap-1 shadow-sm">
          <X className="h-3 w-3" /> REJECTED
        </span>
      );
    }
    if (effStatus === "approved" || effStatus === "verified" || effStatus === "active") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/25 backdrop-blur-md text-emerald-300 border border-emerald-400/40 flex items-center gap-1 shadow-sm">
          <CheckCircle2 className="h-3 w-3" /> APPROVED & LIVE
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-md text-neutral-300 border border-white/15 shadow-sm">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
            const hasVideo = Boolean(product.videoUrl || (product as any).video_url);
            const imgUrl = resolveProductImageUrl(product);
            const isPaused = product.availabilityStatus === "paused";

            return (
              <motion.div
                key={product.id}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                onClick={() => handleInspect(product)}
                className="group relative w-full aspect-[4/5] sm:aspect-[3/4] min-h-[380px] sm:min-h-[400px] flex flex-col justify-between rounded-[24px] overflow-hidden bg-neutral-950 border border-black/10 dark:border-white/15 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer p-4 select-none"
              >
                {/* 1. LARGE PRODUCT PHOTO COVERING MOST OF THE CARD */}
                <div className="absolute inset-0 w-full h-full overflow-hidden bg-neutral-900 pointer-events-none">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={product.title || product.name || "Equipment"}
                      className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-104 pointer-events-none"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/40 p-6 text-center bg-neutral-900">
                      <Package className="h-10 w-10 mb-2 opacity-40 text-neutral-400" />
                      <span className="text-xs font-semibold text-neutral-400">No image uploaded</span>
                    </div>
                  )}

                  {/* Dark gradient overlay near the bottom of the image for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 via-45% to-transparent pointer-events-none" />
                </div>

                {/* 2. TOP METADATA & ACTIONS */}
                <div className="relative z-10 flex items-start justify-between gap-2 pointer-events-auto">
                  <div className="flex flex-col gap-1.5">
                    {/* Top-left row: Availability + Rating + Video */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Availability badge at top-left */}
                      {isPaused ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30 shadow-sm">
                          <Clock className="h-3 w-3 text-amber-400" />
                          <span>Paused</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30 shadow-sm">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Available</span>
                        </span>
                      )}

                      {/* Genuine rating badge beside availability (only if genuine rating exists) */}
                      {product.rating && Number(product.rating) > 0 && (
                        <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/15 shadow-sm">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span>{Number(product.rating).toFixed(1)}</span>
                        </div>
                      )}

                      {/* Inspection Video badge */}
                      {hasVideo && (
                        <div
                          className="flex items-center gap-1 bg-sky-500/25 backdrop-blur-md text-sky-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-400/40 shadow-sm"
                          title="10s Inspection Video Available"
                        >
                          <Video className="h-3 w-3 text-sky-400" />
                          <span>Video</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top-right vendor management buttons (Edit & Delete) */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleEdit(product);
                      }}
                      className="h-8 w-8 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md text-white/90 hover:text-white transition-all shadow-md border border-white/15 flex items-center justify-center cursor-pointer active:scale-95"
                      title="Edit Equipment Listing"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setProductToDelete(product);
                      }}
                      className="h-8 w-8 rounded-full bg-black/60 hover:bg-destructive text-neutral-300 hover:text-white backdrop-blur-md transition-all shadow-md border border-white/15 flex items-center justify-center cursor-pointer active:scale-95"
                      title="Delete Equipment Listing"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* 3. BOTTOM OVERLAY: CATEGORY, LOCATION, TITLE, DESCRIPTION, PRICE & ACTION */}
                <div className="relative z-10 space-y-1.5 mt-auto text-left pointer-events-auto">
                  {/* Category badge and location badge near bottom of image */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider border border-white/15">
                      <Tag className="h-2.5 w-2.5 text-emerald-400" />
                      <span>{product.category || "Gear"}</span>
                    </span>
                    {locCity && (
                      <span
                        title={locCity}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-white text-[11px] font-medium border border-white/15 truncate max-w-[150px]"
                      >
                        <MapPin className="h-2.5 w-2.5 text-sky-400 shrink-0" />
                        <span className="truncate">{locCity}</span>
                      </span>
                    )}
                  </div>

                  {/* Product title immediately below category/location row */}
                  <h3
                    className="font-bold text-base sm:text-lg leading-snug line-clamp-1 text-white drop-shadow-sm font-display group-hover:text-primary transition-colors mt-1"
                    title={product.title || product.name}
                  >
                    {product.title || product.name || "Untitled Equipment"}
                  </h3>

                  {/* Short description below title (max 2 lines) */}
                  <p className="text-xs text-white/75 line-clamp-2 leading-relaxed">
                    {product.description || `High-performance ${product.title || "gear"} available for peer-to-peer rental.`}
                  </p>

                  {/* Daily rental price and action button in a clearly organized bottom row */}
                  <div className="pt-2.5 border-t border-white/15 flex items-center justify-between gap-3 mt-1">
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-white/60 block">
                        Daily Rate
                      </span>
                      <div className="text-base sm:text-lg font-black tracking-tight font-mono text-white leading-none mt-0.5">
                        ₹{Number(dailyRate).toLocaleString("en-IN")}
                        <span className="text-[11px] font-normal text-white/70 ml-0.5 font-sans">/day</span>
                      </div>
                    </div>

                    {/* Single, well-aligned primary action button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleInspect(product);
                      }}
                      className="rounded-full py-1.5 px-4 text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-md backdrop-blur-md bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/30 transition-all cursor-pointer active:scale-95 shrink-0"
                      title="Inspect full equipment details"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Inspect</span>
                      <ArrowRight className="h-3 w-3 text-white/70" />
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
