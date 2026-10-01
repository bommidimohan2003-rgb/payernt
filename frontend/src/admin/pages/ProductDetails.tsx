import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate, useParams, useLocation } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  MapPin,
  Tag,
  AlertCircle,
  User,
  Phone,
  Mail,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Layers,
  Wrench,
  Info,
  Calendar,
  IndianRupee,
  Play,
  Film,
  RotateCcw,
  Check,
  AlertTriangle,
  History,
  FileCheck,
  Building2,
  Package,
} from "lucide-react";
import { productsService } from "../services/products";
import { usersService } from "../services/users";
import { AdminProduct, AdminUser } from "../services/api";
import { payerntApi } from "@/payernt/payerntApiService";
import { Loader } from "../components/layout/Loader";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PRICE_UNITS = [
  { value: "day", label: "PER DAY", display: "/ day" },
  { value: "hour", label: "PER HOUR", display: "/ hr" },
  { value: "week", label: "PER WEEK", display: "/ wk" },
  { value: "month", label: "PER MONTH", display: "/ mo" },
] as const;

type PriceUnitType = "day" | "hour" | "week" | "month";

export default function ProductDetails() {
  const location = useLocation();
  const params = useParams({ strict: false }) as { id?: string; productId?: string };
  const pathTokens = (location?.pathname || (typeof window !== "undefined" ? window.location.pathname : "")).split("/").filter(Boolean);
  
  let routeId = params?.id || params?.productId || "";
  if (!routeId && pathTokens.length >= 3 && pathTokens[0] === "admin" && pathTokens[1] === "products") {
    routeId = pathTokens[2] === "review" ? (pathTokens[3] || "") : pathTokens[2];
  }
  const id = routeId === "products" || routeId === "review" ? "" : routeId;

  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [activeNavSection, setActiveNavSection] = useState("product");

  // Price Management State (Fixed Single Price)
  const [priceInput, setPriceInput] = useState<string>("");
  const [priceUnit, setPriceUnit] = useState<PriceUnitType>("day");
  const [isSavingPrice, setIsSavingPrice] = useState(false);
  const [priceSavedSuccess, setPriceSavedSuccess] = useState(false);
  const [isPriceDirty, setIsPriceDirty] = useState(false);

  // Decision Modal States
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionReason, setRevisionReason] = useState("Information / media update required");
  const [revisionChanges, setRevisionChanges] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Owner Profile Modal
  const [ownerModalOpen, setOwnerModalOpen] = useState(false);
  const [ownerDetails, setOwnerDetails] = useState<AdminUser | null>(null);
  const [ownerLoading, setOwnerLoading] = useState(false);

  const navigate = useNavigate();

  // Fetch full product record
  const loadDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const prodData = await productsService.getProductById(id);
      setProduct(prodData);
      setActiveImageIndex(0);

      // Populate Price Inputs
      const existingPrice = prodData.price || prodData.approvedPriceRange?.minPrice || 1000;
      const existingUnit = (prodData.approvedPriceRange?.unit as PriceUnitType) || "day";

      setPriceInput(String(existingPrice));
      setPriceUnit(existingUnit);
      setIsPriceDirty(false);
    } catch (err) {
      console.error("Failed to load listing inspector:", err);
      toast.error("Failed to load product review record.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  // Price Validation
  const singleNum = parseFloat(priceInput);
  const isPriceValid = !isNaN(singleNum) && singleNum > 0;

  const validationMessage = useMemo(() => {
    if (!priceInput) {
      return { type: "info", text: "Enter the approved rental price for this product." };
    }
    if (isNaN(singleNum) || singleNum <= 0) {
      return { type: "error", text: "Rental price must be greater than ₹0." };
    }
    return { type: "success", text: `APPROVED PRICE: ₹${singleNum.toLocaleString("en-IN")} / ${priceUnit}` };
  }, [priceInput, singleNum, priceUnit]);

  // Handle Save Price
  const handleSavePrice = async () => {
    if (!product || !isPriceValid) {
      toast.error("Please provide a valid rental price before saving.");
      return;
    }
    try {
      setIsSavingPrice(true);
      const updated = await productsService.setPriceRange(product.id, {
        minPrice: singleNum,
        maxPrice: singleNum,
        unit: priceUnit,
      });
      setProduct(updated);
      setIsPriceDirty(false);
      setPriceSavedSuccess(true);
      setTimeout(() => setPriceSavedSuccess(false), 3000);
      toast.success(`Approved rental price saved: ₹${singleNum.toLocaleString("en-IN")} / ${priceUnit}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save price.");
    } finally {
      setIsSavingPrice(false);
    }
  };

  // Handle Approve Listing with Price
  const handleConfirmApprove = async () => {
    if (!product) return;
    if (!isPriceValid) {
      toast.error("A valid rental price is required to approve this product.");
      return;
    }
    try {
      setIsSubmittingAction(true);
      const pricePayload = {
        minPrice: singleNum,
        maxPrice: singleNum,
        unit: priceUnit,
      };

      const updated = await productsService.approveProduct(product.id, pricePayload);
      setProduct(updated);
      setApproveModalOpen(false);
      setIsPriceDirty(false);

      // Dispatch admin approval message to lender with price
      const recipientId = product.owner?.id || product.owner?.email || "bommidimohan2330@gmail.com";
      const priceDesc = `₹${singleNum.toLocaleString("en-IN")} / ${priceUnit}`;
      await payerntApi.sendAdminMessage({
        recipientAccountId: recipientId,
        productId: product.id,
        productName: product.title,
        productCategory: product.category,
        title: `Listing Approved: ${product.title}`,
        content: `Great news! Your listing "${product.title}" has been approved with an approved price of ${priceDesc}. Your gear is now live on the marketplace.`,
        messageType: "PRODUCT_APPROVED",
        senderAdminId: "admin_super",
        senderName: "paye₹nt Moderation Team",
      }).catch((err) => console.warn("Admin message dispatch note:", err));

      toast.success(`Listing approved with rental price ₹${singleNum.toLocaleString("en-IN")} / ${priceUnit}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to approve listing.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Handle Request Revision
  const handleConfirmRevision = async () => {
    if (!product) return;
    if (!revisionReason.trim() && !revisionChanges.trim()) {
      toast.error("Please explain what changes or corrections are required.");
      return;
    }
    try {
      setIsSubmittingAction(true);
      const combinedNotes = `${revisionReason.trim()}${revisionChanges.trim() ? `: ${revisionChanges.trim()}` : ""}`;
      const updated = await productsService.requestCorrection(product.id, combinedNotes);
      setProduct(updated);
      setRevisionModalOpen(false);

      const recipientId = product.owner?.id || product.owner?.email || "bommidimohan2330@gmail.com";
      await payerntApi.sendAdminMessage({
        recipientAccountId: recipientId,
        productId: product.id,
        productName: product.title,
        productCategory: product.category,
        title: `Revision Requested: ${product.title}`,
        content: `Your listing "${product.title}" requires modifications before approval: ${combinedNotes}`,
        messageType: "PRODUCT_REVISION",
        senderAdminId: "admin_super",
        senderName: "paye₹nt Moderation Team",
      }).catch((err) => console.warn("Admin message dispatch note:", err));

      toast.info("Revision request dispatched to lender.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit revision request.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Handle Reject Listing
  const handleConfirmReject = async () => {
    if (!product) return;
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejecting this listing.");
      return;
    }
    try {
      setIsSubmittingAction(true);
      const updated = await productsService.rejectProduct(product.id, rejectionReason.trim());
      setProduct(updated);
      setRejectModalOpen(false);

      const recipientId = product.owner?.id || product.owner?.email || "bommidimohan2330@gmail.com";
      await payerntApi.sendAdminMessage({
        recipientAccountId: recipientId,
        productId: product.id,
        productName: product.title,
        productCategory: product.category,
        title: `Listing Rejected: ${product.title}`,
        content: `Your listing "${product.title}" could not be approved for the marketplace. Reason: ${rejectionReason.trim()}`,
        messageType: "PRODUCT_REJECTED",
        senderAdminId: "admin_super",
        senderName: "paye₹nt Moderation Team",
      }).catch((err) => console.warn("Admin message dispatch note:", err));

      toast.error("Listing rejected.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to reject listing.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    setActiveNavSection(sectionId);
    const el = document.getElementById(`section-${sectionId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Open Owner KYC modal
  const handleOpenOwnerModal = async () => {
    if (!product?.owner?.email && !product?.owner?.id) return;
    const lookupId = product.owner.email || product.owner.id;
    try {
      setOwnerLoading(true);
      setOwnerModalOpen(true);
      const data = await usersService.getUserById(lookupId);
      setOwnerDetails(data);
    } catch (err) {
      console.warn("Could not fetch full owner details:", err);
    } finally {
      setOwnerLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <Loader message="Loading product review workspace..." size="lg" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-12 text-center space-y-4 max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
        <h2 className="text-lg font-semibold text-foreground">Product Record Not Found</h2>
        <p className="text-xs text-muted-foreground">The requested product could not be loaded from the datastore.</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => loadDetails()}
            className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-semibold cursor-pointer transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => navigate({ to: "/admin/products" })}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold cursor-pointer transition-opacity hover:opacity-90"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  const allImages = product.images && product.images.length > 0 ? product.images : [product.image].filter(Boolean);
  const currentImage = allImages[activeImageIndex] || product.image;
  const unitDisplay = PRICE_UNITS.find((u) => u.value === priceUnit)?.display || "/ day";
  const approvedRange = product.approvedPriceRange;

  const reviewNavItems = [
    { id: "product", label: "01 PRODUCT", done: Boolean(product.title && product.brand) },
    { id: "media", label: "02 PHOTOS & VIDEO", done: allImages.length > 0 },
    { id: "condition", label: "03 CONDITION", done: Boolean(product.conditionGrade) },
    { id: "availability", label: "04 AVAILABILITY", done: true },
    { id: "location", label: "05 LOCATION", done: Boolean(product.city || product.pincode) },
    { id: "pricing", label: "06 PRICING", done: isPriceValid },
    { id: "decision", label: "07 DECISION", done: product.status === "approved" },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16 px-4 sm:px-6">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & TOP BREADCRUMB
      ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/products"
            className="p-2 rounded-lg bg-card border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Back to Listings"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/80 font-bold">
                PRODUCT REVIEW
              </span>
              <span className="text-muted-foreground/50">•</span>
              <span className="text-[10px] font-mono text-muted-foreground">
                LISTING #{product.id}
              </span>
              <span
                className={cn(
                  "text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded-full border",
                  product.status === "approved" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                  (product.status === "pending" || product.status === "under_review") && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                  product.status === "rejected" && "bg-rose-500/10 text-rose-500 border-rose-500/20",
                  product.status === "needs_correction" && "bg-orange-500/10 text-orange-500 border-orange-500/20"
                )}
              >
                {product.status === "under_review" ? "Under Review" : product.status}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground font-display truncate max-w-xl mt-0.5">
              {product.title}
            </h1>
          </div>
        </div>

        {/* Quick Owner Header Tag */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenOwnerModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/80 bg-card hover:bg-muted/60 transition-colors text-xs text-foreground cursor-pointer shadow-2xs"
          >
            <div className="w-5 h-5 rounded-full overflow-hidden bg-muted">
              {product.owner?.avatar ? (
                <img src={product.owner.avatar} alt={product.owner.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-3.5 h-3.5 m-auto text-muted-foreground" />
              )}
            </div>
            <span className="font-medium truncate max-w-[140px]">{product.owner?.name || "Lender"}</span>
            <span className="text-[10px] font-mono uppercase px-1 rounded bg-primary/10 text-primary font-semibold">
              Lender
            </span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN 3-COLUMN REVIEW WORKSPACE
      ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT COLUMN (2 Cols): Review Flow Navigation ── */}
        <aside className="hidden lg:block lg:col-span-2 sticky top-20 space-y-3">
          <div className="p-4 rounded-xl border border-border/80 bg-card/60 backdrop-blur-xs space-y-3 shadow-2xs">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/80 font-bold px-1">
              REVIEW FLOW
            </div>
            <nav className="flex flex-col space-y-1">
              {reviewNavItems.map((item) => {
                const isActive = activeNavSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono transition-all text-left cursor-pointer",
                      isActive
                        ? "bg-primary/10 text-primary font-bold border-l-2 border-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                  >
                    <span>{item.label}</span>
                    {item.done && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* ── MAIN REVIEW COLUMN (10 Cols): Product Information, Media, Pricing & Decision ── */}
        <main className="lg:col-span-10 space-y-6">
          {/* SECTION 01: Product Header & Hero Media */}
          <section id="section-product" className="p-6 rounded-xl border border-border/80 bg-card space-y-6 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                  01 / PRODUCT OVERVIEW
                </span>
                <h2 className="text-base font-semibold text-foreground mt-0.5">{product.title}</h2>
              </div>
              <span className="text-xs font-mono text-muted-foreground uppercase px-2.5 py-0.5 rounded bg-muted">
                {product.category}
              </span>
            </div>

            {/* Large Interactive Image Viewer */}
            <div id="section-media" className="space-y-3">
              <div className="relative aspect-[16/10] bg-muted/40 rounded-xl overflow-hidden border border-border/80 group">
                {currentImage ? (
                  <img
                    src={currentImage}
                    alt={product.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40">
                    <Package className="w-12 h-12" />
                    <span className="text-xs mt-2">No photo available</span>
                  </div>
                )}

                {/* Counter & Lightbox */}
                <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-background/80 backdrop-blur-xs font-mono text-[10px] text-foreground font-semibold border border-border/60">
                  {allImages.length > 0 ? `0${activeImageIndex + 1} / 0${allImages.length}` : "01 / 01"}
                </div>

                <button
                  onClick={() => setLightboxOpen(true)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-background/80 hover:bg-background backdrop-blur-xs text-foreground transition-colors cursor-pointer border border-border/60"
                  title="Fullscreen image"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>

                {/* Prev / Next controls */}
                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/80 hover:bg-background text-foreground transition-all cursor-pointer border border-border/60"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/80 hover:bg-background text-foreground transition-all cursor-pointer border border-border/60"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails Row */}
              {allImages.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {allImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={cn(
                        "w-16 h-12 rounded-lg overflow-hidden border shrink-0 transition-all cursor-pointer relative",
                        activeImageIndex === idx ? "border-primary ring-2 ring-primary/20" : "border-border/70 opacity-70 hover:opacity-100"
                      )}
                    >
                      <img src={imgUrl} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* 10-Second Condition Video Trigger */}
              <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Film className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-foreground">10-Second Inspection Video</span>
                    <span className="text-[11px] text-muted-foreground">
                      {product.videoUrl ? "Lender uploaded physical equipment condition video" : "No separate video uploaded; verified via multi-angle photos"}
                    </span>
                  </div>
                </div>

                {product.videoUrl ? (
                  <button
                    onClick={() => setVideoModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>PLAY VIDEO</span>
                  </button>
                ) : (
                  <span className="text-[10px] font-mono uppercase text-muted-foreground px-2 py-1 rounded bg-muted">
                    N/A
                  </span>
                )}
              </div>
            </div>

            {/* Structured Specifications Grid */}
            <div className="space-y-3 pt-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold block">
                PRODUCT SPECIFICATIONS
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg border border-border/70 bg-card/60">
                  <span className="text-[10px] uppercase text-muted-foreground block">BRAND</span>
                  <span className="font-semibold text-foreground mt-0.5 block">{product.brand || "—"}</span>
                </div>
                <div className="p-3 rounded-lg border border-border/70 bg-card/60">
                  <span className="text-[10px] uppercase text-muted-foreground block">MODEL</span>
                  <span className="font-semibold text-foreground mt-0.5 block">{product.model || "—"}</span>
                </div>
                <div className="p-3 rounded-lg border border-border/70 bg-card/60">
                  <span className="text-[10px] uppercase text-muted-foreground block">YEAR / AGE</span>
                  <span className="font-semibold text-foreground mt-0.5 block">{product.year || "—"}</span>
                </div>
                <div className="p-3 rounded-lg border border-border/70 bg-card/60">
                  <span className="text-[10px] uppercase text-muted-foreground block">CATEGORY</span>
                  <span className="font-semibold text-foreground mt-0.5 block">{product.category}</span>
                </div>
                <div className="p-3 rounded-lg border border-border/70 bg-card/60">
                  <span className="text-[10px] uppercase text-muted-foreground block">SUBMISSION DATE</span>
                  <span className="font-semibold text-foreground mt-0.5 block">
                    {new Date(product.createdAt).toLocaleDateString("en-IN")}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-border/70 bg-card/60">
                  <span className="text-[10px] uppercase text-muted-foreground block">PRODUCT ID</span>
                  <span className="font-semibold text-foreground mt-0.5 block truncate">{product.id}</span>
                </div>
              </div>

              {/* Description */}
              <div className="p-4 rounded-lg border border-border/70 bg-muted/20 space-y-1">
                <span className="text-[10px] font-mono uppercase text-muted-foreground font-semibold">DESCRIPTION</span>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {product.description || "No description provided by lender."}
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 03: Condition & Accessories */}
          <section id="section-condition" className="p-6 rounded-xl border border-border/80 bg-card space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                03 / PHYSICAL CONDITION &amp; ACCESSORIES
              </span>
              <span className="text-xs font-mono font-bold text-emerald-500 uppercase px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                Grade: {product.conditionGrade || "Excellent"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3.5 rounded-lg border border-border/70 bg-card/60 space-y-1">
                <span className="text-[10px] uppercase text-muted-foreground">REPORTED DAMAGE</span>
                <span className="text-foreground font-semibold block">
                  {product.conditionDetails?.damageDescription || "No visible or mechanical damage reported."}
                </span>
              </div>
              <div className="p-3.5 rounded-lg border border-border/70 bg-card/60 space-y-1">
                <span className="text-[10px] uppercase text-muted-foreground">INCLUDED ACCESSORIES</span>
                <span className="text-foreground font-semibold block">
                  {product.accessories || "Standard manufacturer accessories included."}
                </span>
              </div>
            </div>

            {/* Verification Documents */}
            {product.documents && product.documents.length > 0 && (
              <div className="pt-2">
                <span className="text-[10px] font-mono uppercase text-muted-foreground font-semibold block mb-2">
                  VERIFICATION PROOFS
                </span>
                <div className="flex flex-wrap gap-2">
                  {product.documents.map((doc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/80 bg-muted/40 text-xs font-mono text-foreground"
                    >
                      <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{doc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 04: Availability & Schedule */}
          <section id="section-availability" className="p-6 rounded-xl border border-border/80 bg-card space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                04 / AVAILABILITY &amp; LOGISTICS
              </span>
              <span className="text-xs font-mono text-muted-foreground uppercase">
                Status: {product.available ? "Ready for Rental" : "Pending Verification"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg border border-border/70 bg-card/60">
                <span className="text-[10px] uppercase text-muted-foreground block">SCHEDULE TYPE</span>
                <span className="font-semibold text-foreground mt-0.5 block">Always Available</span>
              </div>
              <div className="p-3 rounded-lg border border-border/70 bg-card/60">
                <span className="text-[10px] uppercase text-muted-foreground block">MIN RENTAL DURATION</span>
                <span className="font-semibold text-foreground mt-0.5 block">{product.minRentalDays || 1} Day(s)</span>
              </div>
              <div className="p-3 rounded-lg border border-border/70 bg-card/60">
                <span className="text-[10px] uppercase text-muted-foreground block">MAX RENTAL DURATION</span>
                <span className="font-semibold text-foreground mt-0.5 block">{product.maxRentalDays || 30} Day(s)</span>
              </div>
            </div>
          </section>

          {/* SECTION 05: Location Details */}
          <section id="section-location" className="p-6 rounded-xl border border-border/80 bg-card space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                05 / LISTING LOCATION
              </span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>{product.city || "Bangalore"}, {product.pincode || "560001"}</span>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border/70 bg-muted/20 text-xs font-mono space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">LOCALITY / AREA:</span>
                <span className="font-semibold text-foreground">{product.area || "Central Hub"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CITY &amp; PINCODE:</span>
                <span className="font-semibold text-foreground">{product.city || "Bangalore"} &bull; {product.pincode || "560001"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">PICKUP INSTRUCTIONS:</span>
                <span className="font-semibold text-foreground">{product.pickupInstructions || "Secure lender handover upon OTP / PIN validation."}</span>
              </div>
            </div>
          </section>

          {/* SECTION 06: Admin Price Setting (Bottom Full-Width Placement) */}
          <section id="section-pricing" className="p-6 rounded-xl border border-border/80 bg-card space-y-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                  06 / RENTAL PRICE CONFIGURATION
                </span>
                <h2 className="text-base font-semibold text-foreground mt-0.5">Approved Rental Price</h2>
              </div>
              {isPriceDirty && (
                <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                  Unsaved Changes
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
              {/* Rental Price Field */}
              <div className="md:col-span-6 space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center justify-between">
                  <span>RENTAL PRICE</span>
                  <span className="text-[10px] text-muted-foreground/60 font-normal">Fixed Rate</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-base font-bold font-mono text-muted-foreground select-none">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="10"
                    value={priceInput}
                    onChange={(e) => {
                      setPriceInput(e.target.value);
                      setIsPriceDirty(true);
                    }}
                    placeholder="1000"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border/80 bg-background font-mono text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">The fixed rental rate for customers on the marketplace.</p>
              </div>

              {/* Price Unit */}
              <div className="md:col-span-3 space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                  PRICE UNIT
                </label>
                <select
                  value={priceUnit}
                  onChange={(e) => {
                    setPriceUnit(e.target.value as PriceUnitType);
                    setIsPriceDirty(true);
                  }}
                  className="w-full px-3 py-2.5 rounded-lg border border-border/80 bg-background font-mono text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-all"
                >
                  {PRICE_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">Billing interval</p>
              </div>

              {/* Save Price Button */}
              <div className="md:col-span-3">
                <button
                  onClick={handleSavePrice}
                  disabled={!isPriceValid || isSavingPrice}
                  className={cn(
                    "w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer",
                    isPriceValid && !isSavingPrice
                      ? "bg-foreground text-background hover:opacity-90"
                      : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                  )}
                >
                  {isSavingPrice ? (
                    <>
                      <Loader size="sm" />
                      <span>Saving...</span>
                    </>
                  ) : priceSavedSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span>PRICE SAVED</span>
                    </>
                  ) : (
                    <span>SAVE PRICE</span>
                  )}
                </button>
                <div className="hidden md:block h-[18px]" />
              </div>
            </div>

            {/* Validation Banner / Live Preview */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div
                className={cn(
                  "p-2.5 rounded-lg border text-xs font-mono flex items-center gap-2 flex-1",
                  validationMessage.type === "error" && "bg-rose-500/10 border-rose-500/20 text-rose-500",
                  validationMessage.type === "success" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                  validationMessage.type === "info" && "bg-muted/40 border-border/70 text-muted-foreground"
                )}
              >
                {validationMessage.type === "error" ? (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                ) : validationMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <Info className="w-4 h-4 shrink-0" />
                )}
                <span className="text-[11px] leading-tight">{validationMessage.text}</span>
              </div>

              {isPriceValid && (
                <div className="px-4 py-2 rounded-lg border border-border/80 bg-muted/20 flex items-center gap-2 font-mono text-xs shrink-0">
                  <span className="text-muted-foreground">APPROVED RATE:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{singleNum.toLocaleString("en-IN")} {unitDisplay}
                  </span>
                </div>
              )}
            </div>

            {/* Price History Record */}
            {product.priceHistory && product.priceHistory.length > 0 && (
              <div className="pt-3 border-t border-border/70 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                  <History className="w-3 h-3" /> Price History
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {product.priceHistory.map((item, i) => (
                    <div key={item.id || i} className="p-2.5 rounded-lg bg-muted/40 border border-border/60 text-[10px] font-mono space-y-0.5">
                      <div className="flex justify-between font-semibold text-foreground">
                        <span>₹{item.minPrice === item.maxPrice ? item.minPrice : `${item.minPrice} — ${item.maxPrice}`} /{item.unit}</span>
                        <span className="text-muted-foreground/70">{new Date(item.updatedAt).toLocaleDateString("en-IN")}</span>
                      </div>
                      <span className="text-muted-foreground block text-[9px]">by {item.updatedBy}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 07: Admin Moderation Decision Actions (Bottom Action Bar) */}
          <section id="section-decision" className="p-6 rounded-xl border border-border/80 bg-card space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                  07 / MODERATION DECISION
                </span>
                <h2 className="text-base font-semibold text-foreground mt-0.5">Final Decision Actions</h2>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                Listing #{product.id}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Primary: Approve Listing */}
              <button
                onClick={() => setApproveModalOpen(true)}
                disabled={!isPriceValid || isSubmittingAction}
                className={cn(
                  "py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer",
                  isPriceValid && !isSubmittingAction
                    ? "bg-emerald-500 hover:bg-emerald-600 text-black shadow-emerald-500/20"
                    : "bg-muted text-muted-foreground opacity-60 cursor-not-allowed"
                )}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>APPROVE PRODUCT</span>
              </button>

              {/* Secondary: Request Revision */}
              <button
                onClick={() => setRevisionModalOpen(true)}
                disabled={isSubmittingAction}
                className="py-3 px-4 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>REQUEST REVISION</span>
              </button>

              {/* Danger: Reject Listing */}
              <button
                onClick={() => setRejectModalOpen(true)}
                disabled={isSubmittingAction}
                className="py-3 px-4 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>REJECT PRODUCT</span>
              </button>
            </div>
          </section>
        </main>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. APPROVAL CONFIRMATION MODAL
      ────────────────────────────────────────────────────────────── */}
      {approveModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border/80 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-emerald-500">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground font-display">Approve Listing?</h3>
                <p className="text-xs text-muted-foreground truncate max-w-xs">{product.title}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/40 border border-border/70 space-y-2 font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">APPROVED RENTAL PRICE:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{singleNum.toLocaleString("en-IN")} {unitDisplay}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-sans pt-1 leading-relaxed">
                Once approved, this listing will be published to the catalog at this approved rental price.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setApproveModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-border/80 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApprove}
                disabled={isSubmittingAction}
                className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                {isSubmittingAction ? "Approving..." : "Approve Listing"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. REQUEST REVISION MODAL
      ────────────────────────────────────────────────────────────── */}
      {revisionModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border/80 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-500">
                <RotateCcw className="w-5 h-5" />
                <h3 className="text-base font-bold text-foreground">Request Product Revision</h3>
              </div>
              <button
                onClick={() => setRevisionModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Provide specific guidance on what photos, specifications, or details the lender needs to update.
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-muted-foreground font-semibold">REVISION TOPIC</label>
                <input
                  type="text"
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  placeholder="e.g. Serial photo unclear"
                  className="w-full px-3 py-2 rounded-lg border border-border/80 bg-background text-foreground text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase text-muted-foreground font-semibold">REQUIRED CHANGES</label>
                <textarea
                  rows={3}
                  value={revisionChanges}
                  onChange={(e) => setRevisionChanges(e.target.value)}
                  placeholder="Please re-upload a clear photo of the bottom serial number sticker and clarify included accessories."
                  className="w-full px-3 py-2 rounded-lg border border-border/80 bg-background text-foreground text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRevisionModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-border/80 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRevision}
                disabled={isSubmittingAction}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold transition-all cursor-pointer"
              >
                {isSubmittingAction ? "Sending..." : "Send Revision Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. REJECT LISTING MODAL
      ────────────────────────────────────────────────────────────── */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border/80 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-500">
                <XCircle className="w-5 h-5" />
                <h3 className="text-base font-bold text-foreground">Reject Listing?</h3>
              </div>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Explain why this listing cannot be approved on the paye₹nt platform.
            </p>

            <div className="space-y-1 font-mono text-xs">
              <label className="text-[10px] uppercase text-muted-foreground font-semibold">REASON FOR REJECTION</label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Product does not meet marketplace authenticity or safety standards."
                className="w-full px-3 py-2 rounded-lg border border-border/80 bg-background text-foreground text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-border/80 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isSubmittingAction}
                className="px-5 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all cursor-pointer"
              >
                {isSubmittingAction ? "Rejecting..." : "Reject Listing"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. LIGHTBOX MODAL
      ────────────────────────────────────────────────────────────── */}
      {lightboxOpen && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center">
            <img
              src={currentImage}
              alt="Fullscreen Inspection"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-2 right-2 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. VIDEO INSPECTION MODAL
      ────────────────────────────────────────────────────────────── */}
      {videoModalOpen && product.videoUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border/80 rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Film className="w-5 h-5 text-primary" />
                <span>10-Second Equipment Condition Video</span>
              </div>
              <button
                onClick={() => setVideoModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video bg-black rounded-xl overflow-hidden">
              <video src={product.videoUrl} controls autoPlay className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          8. OWNER KYC / PROFILE MODAL
      ────────────────────────────────────────────────────────────── */}
      {ownerModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border/80 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-muted border border-border">
                  {product.owner?.avatar ? (
                    <img src={product.owner.avatar} alt={product.owner.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 m-auto text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground font-display">{product.owner?.name || "Lender Profile"}</h3>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">{product.owner?.email}</span>
                </div>
              </div>
              <button
                onClick={() => setOwnerModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {ownerLoading ? (
              <div className="py-8 flex justify-center">
                <Loader size="md" message="Loading KYC data..." />
              </div>
            ) : (
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PHONE:</span>
                    <span className="font-semibold text-foreground">{product.owner?.phone || "+91 98765 43210"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">LOCATION:</span>
                    <span className="font-semibold text-foreground">{product.city || "Bangalore"}, {product.pincode || "560001"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AADHAAR KYC:</span>
                    <span className="text-emerald-500 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> VERIFIED
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border/70 bg-card/60">
                  <span className="text-muted-foreground">LENDER RATING:</span>
                  <span className="font-bold text-foreground">★ {product.owner?.rating || "5.0"}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setOwnerModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-muted text-xs font-semibold text-foreground hover:bg-muted/80 cursor-pointer"
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
