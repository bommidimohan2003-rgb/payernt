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
}

export function MyProducts({
  products,
  onToggleAvailability,
  onDeleteProduct,
  onUpdateProduct,
  onAddNewGear,
  onNavigateToRequests,
}: MyProductsProps) {
  const [filterTab, setFilterTab] = useState<"all" | "approved" | "under_review" | "draft" | "paused">("all");
  const [selectedProduct, setSelectedProduct] = useState<PayerntProduct | null>(null);
  const [editingPriceProductId, setEditingPriceProductId] = useState<string | null>(null);
  const [newPriceValue, setNewPriceValue] = useState<string>("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const isApproved = p.verificationStatus === "approved" || p.verificationStatus === "verified" || p.status === "approved";
    const isUnderReview = p.verificationStatus === "under_review" || p.verificationStatus === "submitted" || p.status === "under_review";
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
    if (effStatus === "under_review" || effStatus === "submitted") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
          <Clock className="h-3 w-3" /> UNDER ADMIN REVIEW
        </span>
      );
    }
    if (effStatus === "needs_correction") {
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
    if (effStatus === "approved" || effStatus === "verified") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> APPROVED & LIVE
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 text-left pb-16">
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
              products.filter((p) => p.verificationStatus === "approved" || p.verificationStatus === "verified" || p.status === "approved").length
            })`,
          },
          {
            id: "under_review",
            label: `Under Review (${
              products.filter((p) => p.verificationStatus === "under_review" || p.verificationStatus === "submitted" || p.status === "under_review").length
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

            return (
              <div
                key={product.id}
                className="rounded-3xl border border-border/80 bg-card p-5 space-y-4 hover:border-foreground/30 transition-all flex flex-col justify-between shadow-xs group"
              >
                <div className="space-y-3">
                  {/* Top image & status badge */}
                  <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-secondary border border-border/80">
                    <img
                      src={product.primaryImage || product.photos[0]?.url}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                    />

                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      {getStatusBadge(product.verificationStatus, product.status)}
                    </div>

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
                      <span className="font-semibold text-foreground">{product.condition.grade}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground/70 block">Location</span>
                      <span className="font-semibold text-foreground truncate block">
                        {product.location.city}
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

      {/* Inspect Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 text-left">
            <div className="flex items-center justify-between border-b border-border/80 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase text-muted-foreground">
                  Listing Details
                </span>
                {getStatusBadge(selectedProduct.verificationStatus, selectedProduct.status)}
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="rounded-2xl overflow-hidden border border-border aspect-[4/3]">
                <img
                  src={selectedProduct.primaryImage}
                  alt={selectedProduct.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {selectedProduct.category}
                </span>
                <h2 className="text-lg font-bold text-foreground font-display">
                  {selectedProduct.title}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {selectedProduct.description}
                </p>

                <div className="pt-2 border-t border-border space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Daily Rental:</span>
                    <span className="font-bold font-mono text-foreground">
                      ₹{selectedProduct.pricing?.daily ?? (selectedProduct as any).daily_rate ?? (selectedProduct as any).dailyRate ?? selectedProduct.price ?? 500}/day
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Condition Grade:</span>
                    <span className="font-semibold text-foreground">
                      {selectedProduct.condition.grade}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-semibold text-foreground">
                      {selectedProduct.location.city}, {selectedProduct.location.area}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Owner:</span>
                    <span className="font-semibold text-foreground">
                      {selectedProduct.verificationDocs.ownerFullName}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="px-6 py-2.5 rounded-2xl bg-foreground text-background text-xs font-bold active:scale-[0.98] cursor-pointer shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyProducts;
