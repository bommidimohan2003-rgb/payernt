import React, { useState } from "react";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { PayerntProduct, VerificationStatus } from "../types";

interface MyProductsProps {
  products: PayerntProduct[];
  onToggleAvailability: (productId: string) => void;
  onDeleteProduct: (productId: string) => void;
  onUpdateProduct: (productId: string, updates: Partial<PayerntProduct>) => void;
  onAddNewGear: () => void;
  onNavigateToRequests: () => void;
  onBack?: () => void;
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
  const [editingPriceProductId, setEditingPriceProductId] = useState<string | null>(null);
  const [newPriceValue, setNewPriceValue] = useState<string>("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const isApproved = p.verificationStatus === "approved" || p.verificationStatus === "verified" || p.status === "approved" || p.status === "active";
    const isUnderReview = p.verificationStatus === "under_review" || p.verificationStatus === "submitted" || p.status === "under_review" || p.status === "pending" || p.status === "pending_admin_review" || p.status === "pending_confirmation";
    if (filterTab === "all") return true;
    if (filterTab === "approved") return isApproved;
    if (filterTab === "under_review") return isUnderReview;
    if (filterTab === "draft") return p.verificationStatus === "draft" || p.status === "draft";
    if (filterTab === "paused") return p.availabilityStatus === "paused";
    return true;
  });

  const handleSavePriceEdit = (productId: string) => {
    const num = Number(newPriceValue);
    if (!num || num <= 0) {
      toast.error("Please enter a valid rental price.");
      return;
    }
    const current = products.find((p) => p.id === productId);
    if (current) {
      onUpdateProduct(productId, {
        pricing: { ...current.pricing, daily: num },
        price: num,
      });
      toast.success("Daily rental price updated!");
    }
    setEditingPriceProductId(null);
  };

  const getStatusBadge = (verificationStatus?: VerificationStatus, status?: string) => {
    const effStatus = verificationStatus || status;

    if (effStatus === "draft") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-muted-foreground border border-border">
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
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-500/10 text-neutral-700 dark:text-neutral-300 border border-neutral-500/20 flex items-center gap-1">
          <Clock className="h-3 w-3" /> PENDING REVIEW
        </span>
      );
    }
    if (effStatus === "needs_correction" || effStatus === "revision_required") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> NEEDS CORRECTION
        </span>
      );
    }
    if (effStatus === "rejected") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-1">
          <X className="h-3 w-3" /> REJECTED
        </span>
      );
    }
    if (effStatus === "approved" || effStatus === "verified" || effStatus === "active") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 border border-neutral-900 dark:border-white flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> APPROVED & LIVE
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 text-left pb-16">
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
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-display">
            My Listed Products
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage your rental inventory, pricing, availability, and Admin review statuses.
          </p>
        </div>

        <button
          onClick={onAddNewGear}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-foreground text-background text-xs font-bold shadow-md hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: "all", label: `All Products (${products.length})` },
          {
            id: "approved",
            label: `Approved & Live (${
              products.filter((p) => p.verificationStatus === "approved" || p.verificationStatus === "verified" || p.status === "approved" || p.status === "active").length
            })`,
          },
          {
            id: "under_review",
            label: `Under Review (${
              products.filter((p) => p.verificationStatus === "under_review" || p.verificationStatus === "submitted" || p.status === "under_review" || p.status === "pending" || p.status === "pending_admin_review" || p.status === "pending_confirmation").length
            })`,
          },
          {
            id: "draft",
            label: `Drafts (${
              products.filter((p) => p.verificationStatus === "draft" || p.status === "draft").length
            })`,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id as any)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border active:scale-[0.98] ${
              filterTab === tab.id
                ? "bg-foreground text-background border-foreground shadow-xs"
                : "bg-card hover:bg-secondary text-muted-foreground hover:text-foreground border-border"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-border bg-secondary/10 space-y-3">
          <div className="h-14 w-14 rounded-2xl bg-secondary text-muted-foreground flex items-center justify-center mx-auto">
            <Package className="h-7 w-7" />
          </div>
          <h3 className="text-sm font-bold text-foreground">No listings found in this filter</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            You haven't added any gear in this section yet or your search criteria returned no matches.
          </p>
          <button
            onClick={onAddNewGear}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-foreground text-background text-xs font-bold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer mt-2"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>List a Product</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((product) => {
            const isEditingPrice = editingPriceProductId === product.id;
            const imgUrl = product.primaryImage || product.photos?.[0]?.url || (product as any).images?.[0] || (product as any).image_url;

            return (
              <div
                key={product.id}
                className="rounded-3xl border border-border/80 bg-card p-5 space-y-4 hover:border-foreground/30 transition-all flex flex-col justify-between shadow-xs group"
              >
                <div className="space-y-3">
                  {/* Top image & status badge */}
                  <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-secondary border border-border/80 flex items-center justify-center">
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                        onError={(e) => {
                          // Hide broken image and fallback to placeholder
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                        <Package className="h-10 w-10 stroke-[1.2] mb-1 opacity-60" />
                        <span className="text-[11px] font-medium">{product.category || "Gear"}</span>
                      </div>
                    )}

                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      {getStatusBadge(product.verificationStatus, product.status)}
                    </div>

                    {(product.videoUrl || (product as any).video_url) && (
                      <div className="absolute top-2.5 right-2.5 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-bold text-white flex items-center gap-1 border border-white/20 shadow-xs">
                        <Video className="h-3 w-3 text-primary" />
                        <span>10s Video</span>
                      </div>
                    )}

                    <div className="absolute bottom-2.5 right-2.5 bg-background/90 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-mono font-bold text-foreground border border-border shadow-xs">
                      ₹{product.pricing?.daily ?? (product as any).daily_rate ?? (product as any).dailyRate ?? product.price ?? 500}/day
                    </div>
                  </div>

                  {/* Title & category */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {product.category}
                    </span>
                    <h3 className="text-sm font-extrabold text-foreground truncate mt-0.5" title={product.title}>
                      {product.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  </div>

                  {/* Details strip */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
                    <div>
                      <span className="text-[10px] text-muted-foreground/70 block">Condition</span>
                      <span className="font-semibold text-foreground">
                        {typeof product.condition === "object" ? product.condition?.grade || "Good" : product.condition || "Good"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground/70 block">Location</span>
                      <span className="font-semibold text-foreground truncate block">
                        {typeof product.location === "object" ? product.location?.city || product.location?.area || "Visakhapatnam" : product.location || "Visakhapatnam"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Controls */}
                <div className="space-y-2 pt-3 border-t border-border/60">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(product)}
                      className="px-3.5 py-2 rounded-xl border border-border hover:bg-secondary text-xs font-semibold text-foreground flex items-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Inspect</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (isEditingPrice) {
                            handleSavePriceEdit(product.id);
                          } else {
                            setEditingPriceProductId(product.id);
                            setNewPriceValue(String(product.pricing?.daily ?? (product as any).daily_rate ?? (product as any).dailyRate ?? product.price ?? 500));
                          }
                        }}
                        className="p-2 rounded-xl border border-border hover:bg-secondary text-xs font-semibold text-foreground active:scale-[0.98] transition-all cursor-pointer"
                        title="Edit Price"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirmDeleteId === product.id) {
                            onDeleteProduct(product.id);
                            setConfirmDeleteId(null);
                            toast.success("Listing deleted.");
                          } else {
                            setConfirmDeleteId(product.id);
                            setTimeout(() => setConfirmDeleteId(null), 3000);
                          }
                        }}
                        className={`p-2 rounded-xl border active:scale-[0.98] transition-all cursor-pointer ${
                          confirmDeleteId === product.id
                            ? "bg-destructive text-destructive-foreground border-destructive"
                            : "border-border hover:bg-destructive/10 text-destructive"
                        }`}
                        title={confirmDeleteId === product.id ? "Click again to confirm delete" : "Delete product"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quick price edit inline */}
                  {isEditingPrice && (
                    <div className="flex items-center gap-2 pt-2 animate-in fade-in duration-150">
                      <input
                        type="number"
                        value={newPriceValue}
                        onChange={(e) => setNewPriceValue(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs font-mono"
                        placeholder="New daily price"
                      />
                      <button
                        type="button"
                        onClick={() => handleSavePriceEdit(product.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-foreground text-background text-xs font-bold hover:opacity-90 active:scale-[0.98] cursor-pointer shrink-0"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPriceProductId(null)}
                        className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comprehensive Inspect Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 text-left">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/80 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-bold uppercase text-muted-foreground tracking-wider">
                  Equipment Inspection
                </span>
                {getStatusBadge(selectedProduct.verificationStatus, selectedProduct.status)}
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Media & Key Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Image Preview Column */}
              <div className="md:col-span-5 space-y-3">
                <div className="rounded-2xl overflow-hidden border border-border aspect-[4/3] bg-secondary relative">
                  <img
                    src={selectedProduct.primaryImage || selectedProduct.photos?.[0]?.url || (selectedProduct as any).image_url}
                    alt={selectedProduct.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-background/90 backdrop-blur-xs text-[11px] font-mono font-bold text-foreground border border-border shadow-xs">
                    ₹{selectedProduct.pricing?.daily ?? (selectedProduct as any).daily_rate ?? (selectedProduct as any).dailyRate ?? selectedProduct.price ?? 500}/day
                  </div>
                </div>

                {/* Additional photos if any */}
                {selectedProduct.photos && selectedProduct.photos.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {selectedProduct.photos.map((ph, idx) => (
                      <img
                        key={idx}
                        src={ph.url}
                        alt={`Photo ${idx + 1}`}
                        className="h-16 w-16 rounded-xl object-cover border border-border shrink-0"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Details Column */}
              <div className="md:col-span-7 space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                    {selectedProduct.category} {selectedProduct.specs?.brand ? `• ${selectedProduct.specs.brand}` : ""}
                  </span>
                  <h2 className="text-xl font-bold text-foreground font-display mt-0.5">
                    {selectedProduct.title}
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                    {selectedProduct.description}
                  </p>
                </div>

                {/* Rental Pricing Summary Grid */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-secondary/40 border border-border">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono block">Daily</span>
                    <span className="text-sm font-bold font-mono text-foreground">
                      ₹{selectedProduct.pricing?.daily ?? (selectedProduct as any).daily_rate ?? selectedProduct.price ?? 500}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono block">Weekly</span>
                    <span className="text-sm font-bold font-mono text-foreground">
                      ₹{selectedProduct.pricing?.weekly ?? Math.round(Number(selectedProduct.pricing?.daily || selectedProduct.price || 500) * 7 * 0.85)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono block">Deposit</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      ₹0 (Zero)
                    </span>
                  </div>
                </div>

                {/* Structured Metadata Breakdown */}
                <div className="space-y-2 border-t border-border/80 pt-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Condition Grade</span>
                    <span className="font-semibold text-foreground">
                      {typeof selectedProduct.condition === "object" ? selectedProduct.condition?.grade || "Good" : selectedProduct.condition || "Good"}
                    </span>
                  </div>

                  {typeof selectedProduct.condition === "object" && selectedProduct.condition?.notes && (
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Condition Notes</span>
                      <span className="font-medium text-foreground text-right max-w-xs truncate">
                        {selectedProduct.condition.notes}
                      </span>
                    </div>
                  )}

                  {typeof selectedProduct.condition === "object" && selectedProduct.condition?.visibleDamage && (
                    <div className="flex justify-between py-1 border-b border-border/40 text-amber-600 dark:text-amber-400">
                      <span>Disclosed Damage</span>
                      <span className="font-medium text-right max-w-xs truncate">
                        {selectedProduct.condition.damageDetails || "Damage noted"}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Pickup Location</span>
                    <span className="font-semibold text-foreground text-right">
                      {typeof selectedProduct.location === "object"
                        ? `${selectedProduct.location?.address ? selectedProduct.location.address + ", " : ""}${selectedProduct.location?.city || "Visakhapatnam"}`
                        : selectedProduct.location || "Visakhapatnam"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Listing ID</span>
                    <span className="font-mono text-muted-foreground text-[11px]">
                      {selectedProduct.id}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 10-Second Inspection Video Player */}
            {(selectedProduct.videoUrl || (selectedProduct as any).video_url) && (
              <div className="p-4 sm:p-5 rounded-2xl bg-secondary/40 border border-border space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <div className="flex items-center gap-1.5 text-foreground">
                    <Video className="h-4 w-4 text-primary" />
                    <span>Verified 10-Second Inspection Video</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                    <ShieldCheck className="h-3 w-3" /> Live Evidence
                  </span>
                </div>
                <div className="relative rounded-2xl overflow-hidden bg-black border border-border aspect-video max-h-[340px]">
                  <video
                    src={selectedProduct.videoUrl || (selectedProduct as any).video_url}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  Your 10-second inspection video recorded during listing to verify physical gear condition.
                </p>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Zero Security Deposit Platform Guarantee
              </span>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="px-6 py-2.5 rounded-xl bg-foreground text-background text-xs font-bold active:scale-[0.98] cursor-pointer shadow-sm hover:opacity-90 transition-all"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyProducts;
