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
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { usePayernt } from "../context";
import { getOptimizedImageUrl } from "@/utils/images";
import type { PayerntProduct } from "../types";

export function LenderProductDetails({ productId: propId }: { productId?: string }) {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { id?: string; productId?: string };
  const productId = propId || params.id || params.productId || "";
  const { userProducts, toggleAvailability, deleteProduct, updateProduct } = usePayernt();

  const [product, setProduct] = useState<PayerntProduct | null>(null);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!productId) return;
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

  const handlePriceSave = () => {
    const val = Number(newPrice);
    if (isNaN(val) || val <= 0) {
      toast.error("Please enter a valid price amount.");
      return;
    }
    updateProduct(product.id, { pricePerDay: val, fairMarketPrice: val });
    setIsEditingPrice(false);
    toast.success(`Updated daily rental rate to ₹${val.toLocaleString("en-IN")}`);
  };

  const handleDelete = () => {
    deleteProduct(product.id);
    toast.success("Listing removed successfully.");
    navigate({ to: "/payernt/products" });
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
        <div className="lg:col-span-7 space-y-5">
          <div className="relative aspect-video sm:aspect-4/3 rounded-2xl overflow-hidden bg-muted border border-border">
            <img
              src={getOptimizedImageUrl(product.images?.[0] || product.image || "/brand/placeholder.png")}
              alt={product.title}
              className="w-full h-full object-cover"
            />
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
