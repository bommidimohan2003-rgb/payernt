import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  FileText,
  Star,
  Eye,
  EyeOff,
  Package,
  Calendar,
  IndianRupee,
  ShieldCheck,
  Clock,
  Sparkles,
  MapPin,
  Tag,
  AlertCircle,
  User,
  Phone,
  Mail,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  ExternalLink,
  Layers,
  Wrench,
  Info,
  MessageSquare,
  Send,
} from "lucide-react";
import { productsService } from "../services/products";
import { usersService } from "../services/users";
import { AdminProduct, AdminBooking, AdminUser } from "../services/api";
import { payerntApi } from "@/payernt/payerntApiService";
import { Loader } from "../components/layout/Loader";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AdminProductImage } from "../components/common/AdminProductImage";

export default function ProductDetails() {
  const params = useParams({ strict: false }) as { id?: string };
  const routeId = params?.id || window.location.pathname.split("/").filter(Boolean).pop() || "";
  const id = routeId === "products" ? "" : routeId;
  
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  
  // Rejection Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Owner Profile Modal State
  const [ownerModalOpen, setOwnerModalOpen] = useState(false);
  const [ownerDetails, setOwnerDetails] = useState<AdminUser | null>(null);
  const [ownerLoading, setOwnerLoading] = useState(false);

  // Admin Product Message Modal State
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageType, setMessageType] = useState<string>("PRODUCT_REVIEW");
  const [messageTitle, setMessageTitle] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const navigate = useNavigate();

  const loadDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const prodData = await productsService.getProductById(id);
      setProduct(prodData);
      setActiveImageIndex(0);

      if (prodData.bookings) {
        setBookings(prodData.bookings as any);
      }
    } catch (err) {
      console.error("Failed to load listing inspector:", err);
      toast.error("Failed to load listing inspector.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const handleApprove = async () => {
    if (!product) return;
    try {
      setIsSubmittingAction(true);
      const updated = await productsService.approveProduct(product.id);
      setProduct(updated);
      
      // Dispatch admin product approval message to owner
      const recipientId = product.owner?.id || product.owner?.email || "user_001";
      await payerntApi.sendAdminMessage({
        recipientAccountId: recipientId,
        productId: product.id,
        productName: product.title,
        productCategory: product.category,
        title: `Listing Approved: ${product.title}`,
        content: `Great news! Your listing "${product.title}" has been reviewed, approved by Admin, and is now live on the marketplace.`,
        messageType: "PRODUCT_APPROVED",
        senderAdminId: "admin_super",
        senderName: "paye₹nt Moderation Team",
      }).catch((err) => console.warn("Admin message dispatch note:", err));

      toast.success("Listing approved and published to marketplace.");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to approve listing.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleOpenRejectModal = () => {
    setRejectionReason("");
    setRejectModalOpen(true);
  };

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

      // Dispatch admin product rejection message to owner
      const recipientId = product.owner?.id || product.owner?.email || "user_001";
      await payerntApi.sendAdminMessage({
        recipientAccountId: recipientId,
        productId: product.id,
        productName: product.title,
        productCategory: product.category,
        title: `Listing Rejected: ${product.title}`,
        content: `Your listing "${product.title}" was not approved. Feedback: ${rejectionReason.trim()}`,
        messageType: "PRODUCT_REJECTED",
        senderAdminId: "admin_super",
        senderName: "paye₹nt Moderation Team",
      }).catch((err) => console.warn("Admin message dispatch note:", err));

      toast.warning("Listing has been rejected with feedback sent to owner.");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to reject listing.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleRequestCorrection = async () => {
    if (!product) return;
    const notes = prompt("Enter specific correction notes for the vendor (e.g. upload higher resolution invoice):");
    if (notes === null) return;
    try {
      setIsSubmittingAction(true);
      const updated = await productsService.requestCorrection(product.id, notes);
      setProduct(updated);

      // Dispatch admin revision required message to owner
      const recipientId = product.owner?.id || product.owner?.email || "user_001";
      await payerntApi.sendAdminMessage({
        recipientAccountId: recipientId,
        productId: product.id,
        productName: product.title,
        productCategory: product.category,
        title: `Revision Required: ${product.title}`,
        content: `Admin review requested modifications for "${product.title}": ${notes}`,
        messageType: "PRODUCT_REVISION_REQUIRED",
        senderAdminId: "admin_super",
        senderName: "paye₹nt Moderation Team",
      }).catch((err) => console.warn("Admin message dispatch note:", err));

      toast.info("Correction request dispatched to product owner.");
    } catch (e: any) {
      toast.error("Failed to request correction.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleOpenMessageModal = (defaultType?: string, defaultTitle?: string) => {
    if (!product) return;
    setMessageType(defaultType || "PRODUCT_REVIEW");
    setMessageTitle(defaultTitle || `Review Note: ${product.title}`);
    setMessageContent("");
    setMessageModalOpen(true);
  };

  const handleSendMessageToOwner = async () => {
    if (!product) return;
    const recipientId = product.owner?.id || product.owner?.email || "user_001";
    if (!messageTitle.trim() || !messageContent.trim()) {
      toast.error("Please provide both a message title and content.");
      return;
    }
    try {
      setIsSendingMessage(true);
      const res = await payerntApi.sendAdminMessage({
        recipientAccountId: recipientId,
        productId: product.id,
        productName: product.title,
        productCategory: product.category,
        title: messageTitle.trim(),
        content: messageContent.trim(),
        messageType: messageType,
        senderAdminId: "admin_super",
        senderName: "paye₹nt Admin Team",
      });

      if (res.success) {
        toast.success(`Admin message dispatched to ${product.owner?.name || "owner"}.`);
        setMessageModalOpen(false);
        setMessageTitle("");
        setMessageContent("");
      } else {
        toast.error(res.error || "Failed to dispatch message.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send message.");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleToggleHide = async () => {
    if (!product) return;
    try {
      const updated = await productsService.toggleHideProduct(product.id);
      setProduct(updated);
      toast.info(updated.hidden ? "Listing hidden from marketplace." : "Listing unhidden.");
    } catch {
      toast.error("Failed to toggle visibility.");
    }
  };

  const handleToggleFeature = async () => {
    if (!product) return;
    try {
      const updated = await productsService.toggleFeatureProduct(product.id);
      setProduct(updated);
      toast.success(updated.featured ? "Listing marked as featured." : "Removed from featured listings.");
    } catch {
      toast.error("Failed to toggle featured status.");
    }
  };

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
        <Loader message="Loading complete product record from database..." size="lg" />
      </div>
    );
  }

  if (!product) return null;

  const allImages = product.images && product.images.length > 0 ? product.images : [product.image].filter(Boolean);
  const currentImage = allImages[activeImageIndex] || product.image;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. TOP ACTION & STATUS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/products"
            className="p-2 rounded-lg bg-card border border-border/70 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-foreground font-display truncate max-w-sm sm:max-w-md">
                {product.title}
              </h1>
              <span
                className={cn(
                  "text-[10px] font-mono font-semibold uppercase px-2.5 py-0.5 rounded-full select-none border",
                  product.status === "approved" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                  (product.status === "pending" || product.status === "under_review") && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                  product.status === "rejected" && "bg-[#FF1744]/10 text-[#FF1744] border-[#FF1744]/20",
                  product.status === "needs_correction" && "bg-orange-500/10 text-orange-500 border-orange-500/20"
                )}
              >
                {product.status === "under_review" ? "Under Review" : product.status}
              </span>
              {product.featured && (
                <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5" /> Featured
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
              ID: <span className="text-foreground font-semibold">{product.id}</span> • Category: <span className="text-foreground capitalize">{product.category}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {product.status !== "approved" && (
            <button
              onClick={handleApprove}
              disabled={isSubmittingAction}
              className="bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Approve Listing</span>
            </button>
          )}

          <button
            onClick={handleRequestCorrection}
            disabled={isSubmittingAction}
            className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Request Correction</span>
          </button>

          {product.status !== "rejected" && (
            <button
              onClick={handleOpenRejectModal}
              disabled={isSubmittingAction}
              className="bg-[#FF1744]/10 hover:bg-[#FF1744]/20 text-[#FF1744] border border-[#FF1744]/30 text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <XCircle className="h-3.5 w-3.5" />
              <span>Reject Listing</span>
            </button>
          )}

          <button
            onClick={() => handleOpenMessageModal()}
            className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Message Owner</span>
          </button>

          <button
            onClick={handleToggleFeature}
            className={cn(
              "text-xs font-semibold px-3 py-2 rounded-lg border transition-colors cursor-pointer",
              product.featured
                ? "bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20"
                : "bg-card hover:bg-secondary text-foreground border-border/70"
            )}
          >
            {product.featured ? "Featured" : "Mark Featured"}
          </button>

          <button
            onClick={handleToggleHide}
            className={cn(
              "text-xs font-semibold px-3 py-2 rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer",
              product.hidden
                ? "bg-secondary border-border/70 text-muted-foreground hover:text-foreground"
                : "bg-card hover:bg-secondary text-foreground border-border/70"
            )}
          >
            {product.hidden ? (
              <>
                <Eye className="h-3.5 w-3.5 text-emerald-500" />
                <span>Unhide</span>
              </>
            ) : (
              <>
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Hide</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. MAIN 2-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT 2 COLUMNS: Media, Specs, Condition, Location, Rental History */}
        <div className="lg:col-span-2 space-y-6">
          {/* A. PRODUCT IMAGES VIEWER WITH LIGHTBOX & CAROUSEL */}
          <div className="p-5 rounded-xl bg-card border border-border/70 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span>Product Image Gallery ({allImages.length} uploaded)</span>
              </h3>
              <button
                onClick={() => setLightboxOpen(true)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2.5 py-1 rounded bg-secondary/60 border border-border/60 transition-colors cursor-pointer"
              >
                <Maximize2 className="h-3 w-3" />
                <span>Fullscreen Inspect</span>
              </button>
            </div>

            {/* Main Image Frame */}
            <div className="relative h-80 sm:h-96 w-full rounded-lg overflow-hidden bg-secondary flex items-center justify-center border border-border/50 group">
              <AdminProductImage
                src={currentImage}
                alt={product.title}
                className="h-full w-full object-contain bg-black/5 dark:bg-black/40"
                iconClassName="h-16 w-16"
              />

              {allImages.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setActiveImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails Row */}
            {allImages.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={cn(
                      "h-16 w-20 rounded-md overflow-hidden border transition-all shrink-0 cursor-pointer",
                      activeImageIndex === idx
                        ? "border-emerald-500 ring-2 ring-emerald-500/40"
                        : "border-border/70 opacity-60 hover:opacity-100"
                    )}
                  >
                    <AdminProductImage
                      src={img}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* B. PRODUCT BASIC INFORMATION & DESCRIPTION */}
          <div className="p-5 rounded-xl bg-card border border-border/70 shadow-2xs space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b border-border/50 pb-2 flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              <span>Product Basic Information</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Brand</span>
                <span className="font-semibold text-foreground text-sm">{product.brand || "Not provided"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Model</span>
                <span className="font-semibold text-foreground text-sm">{product.model || "Not provided"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Mfg. Year</span>
                <span className="font-semibold text-foreground text-sm">{product.year || "Not provided"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Category</span>
                <span className="font-semibold text-foreground text-sm capitalize">{product.category}</span>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-muted-foreground block text-[11px] mb-1 font-semibold">Description</span>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line bg-secondary/30 p-3 rounded-lg border border-border/40">
                {product.description || "No description provided by the lender."}
              </p>
            </div>

            {/* Features Tags */}
            {product.features && (Array.isArray(product.features) ? product.features.length > 0 : Object.keys(product.features).length > 0) && (
              <div className="pt-2">
                <span className="text-muted-foreground block text-[11px] mb-1.5 font-semibold">Key Features</span>
                <div className="flex flex-wrap gap-1.5">
                  {Array.isArray(product.features) ? (
                    product.features.map((feat, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-secondary border border-border/60 text-[11px] text-foreground font-medium">
                        ✓ {feat}
                      </span>
                    ))
                  ) : (
                    Object.entries(product.features).map(([k, v], i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-secondary border border-border/60 text-[11px] text-foreground font-medium">
                        {k}: {String(v)}
                      </span>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Specifications */}
            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <div className="pt-2">
                <span className="text-muted-foreground block text-[11px] mb-1.5 font-semibold">Technical Specifications</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-secondary/20 p-3 rounded-lg border border-border/40">
                  {Object.entries(product.specifications).map(([key, val], idx) => (
                    <div key={idx} className="flex justify-between py-1 border-b border-border/30 last:border-0">
                      <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span>
                      <span className="font-semibold text-foreground text-right">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accessories */}
            <div className="pt-2">
              <span className="text-muted-foreground block text-[11px] mb-1 font-semibold">Included Accessories</span>
              <p className="text-xs text-foreground bg-secondary/30 p-2.5 rounded-lg border border-border/40 font-medium">
                {product.accessories || "Standard accessories / case included as per listing."}
              </p>
            </div>
          </div>

          {/* C. PRODUCT CONDITION & QUALITY */}
          <div className="p-5 rounded-xl bg-card border border-border/70 shadow-2xs space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b border-border/50 pb-2 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" />
              <span>Product Condition & Quality Report</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-secondary/30 border border-border/40">
                <span className="text-muted-foreground block text-[11px]">Condition Grade</span>
                <span className="font-bold text-foreground text-sm uppercase text-emerald-500">
                  {product.conditionGrade || "Good / Fully Functional"}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30 border border-border/40 sm:col-span-2">
                <span className="text-muted-foreground block text-[11px]">Wear & Tear Details</span>
                <span className="font-medium text-foreground">
                  {typeof product.conditionDetails === "object" && product.conditionDetails !== null
                    ? JSON.stringify(product.conditionDetails)
                    : product.conditionDetails || "No reported structural damages or functional defects."}
                </span>
              </div>
            </div>
          </div>

          {/* D. PRODUCT LOCATION */}
          <div className="p-5 rounded-xl bg-card border border-border/70 shadow-2xs space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b border-border/50 pb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span>Pickup & Handover Location</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">City</span>
                <span className="font-semibold text-foreground text-sm">{product.city || "Not provided"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Area / Locality</span>
                <span className="font-semibold text-foreground text-sm">{product.area || "Not provided"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Pincode</span>
                <span className="font-mono font-semibold text-foreground text-sm">{product.pincode || "Not provided"}</span>
              </div>
            </div>

            <div className="pt-1">
              <span className="text-muted-foreground block text-[11px] mb-1 font-semibold">Pickup & Handover Instructions</span>
              <p className="text-xs text-muted-foreground bg-secondary/30 p-2.5 rounded-lg border border-border/40">
                {product.pickupInstructions || "Standard physical verification required during equipment pickup."}
              </p>
            </div>
          </div>

          {/* E. RENTAL BOOKING & ORDER HISTORY */}
          <div className="p-5 rounded-xl bg-card border border-border/70 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Rental Booking History</span>
              </h3>
              <span className="text-[11px] font-mono text-muted-foreground">{bookings.length} total orders</span>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-2 px-3">Order ID</th>
                    <th className="py-2 px-3">Renter</th>
                    <th className="py-2 px-3">Schedule</th>
                    <th className="py-2 px-3">Amount</th>
                    <th className="py-2 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-foreground">
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground text-xs">
                        This gear has not been rented out yet.
                      </td>
                    </tr>
                  ) : (
                    bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-medium text-foreground">{b.id}</td>
                        <td className="py-2.5 px-3 font-medium text-foreground">{(b as any).customerName || (b as any).customerEmail || "Customer"}</td>
                        <td className="py-2.5 px-3 text-muted-foreground font-mono text-[11px]">
                          {b.startDate} → {b.endDate}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-foreground">
                          ₹{b.amount?.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={cn(
                              "inline-flex items-center text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded border",
                              b.status === "completed" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                              b.status === "active" && "bg-blue-500/10 text-blue-500 border-blue-500/20",
                              b.status === "pending" && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                              b.status === "cancelled" && "bg-[#FF1744]/10 text-[#FF1744] border-[#FF1744]/20"
                            )}
                          >
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT 1 COLUMN: Pricing, Availability, Owner Profile, Compliance */}
        <div className="space-y-6">
          {/* A. PRICING BREAKDOWN */}
          <div className="p-5 rounded-xl bg-card border border-border/70 shadow-2xs space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b border-border/50 pb-2 flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-primary" />
              <span>Rental Pricing & Rates</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">Daily Rental Rate</span>
                <span className="font-mono font-bold text-foreground text-base">
                  ₹{(product.dailyRate || product.price || 0).toLocaleString()}/day
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Weekly Rate</span>
                <span className="font-mono font-semibold text-foreground">
                  {product.weeklyRate ? `₹${product.weeklyRate.toLocaleString()}/wk` : "Not provided"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Monthly Rate</span>
                <span className="font-mono font-semibold text-foreground">
                  {product.monthlyRate ? `₹${product.monthlyRate.toLocaleString()}/mo` : "Not provided"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Security Deposit</span>
                <span className="font-mono font-semibold text-foreground">
                  {product.securityDeposit ? `₹${product.securityDeposit.toLocaleString()}` : "₹0 (No deposit required)"}
                </span>
              </div>
            </div>
          </div>

          {/* B. AVAILABILITY & RENTAL TERMS */}
          <div className="p-5 rounded-xl bg-card border border-border/70 shadow-2xs space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b border-border/50 pb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span>Availability & Terms</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="flex items-center gap-1.5 font-semibold">
                  <span className={cn("h-2 w-2 rounded-full", product.available ? "bg-emerald-500" : "bg-[#FF1744]")} />
                  {product.available ? "Active & Available" : "Paused / Under Review"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Min Rental Days</span>
                <span className="font-mono font-semibold text-foreground">{product.minRentalDays || 1} day(s)</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Max Rental Days</span>
                <span className="font-mono font-semibold text-foreground">{product.maxRentalDays || 30} day(s)</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Listing Submitted</span>
                <span className="font-mono text-muted-foreground">
                  {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* C. PRODUCT OWNER INFORMATION CARD WITH [ VIEW COMPLETE OWNER PROFILE ] */}
          <div className="p-5 rounded-xl bg-card border border-border/70 shadow-2xs space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b border-border/50 pb-2 flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <span>Product Owner (paye₹nt)</span>
            </h3>

            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-secondary border border-border/70 flex items-center justify-center font-bold text-foreground overflow-hidden shrink-0">
                {product.owner.avatar ? (
                  <img
                    src={product.owner.avatar}
                    alt={product.owner.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{product.owner.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-foreground truncate">
                  {product.owner.name}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground truncate">
                  {product.owner.email}
                </span>
                {product.owner.phone && (
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {product.owner.phone}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2 text-xs pt-1 border-t border-border/40">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Account Status</span>
                <span className="font-semibold text-foreground uppercase text-[10px] px-2 py-0.5 rounded bg-secondary">
                  {product.owner.accountStatus || "ACTIVE"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Verification</span>
                <span className="font-semibold text-emerald-500 flex items-center gap-1 text-[11px]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {product.owner.verificationStatus || "VERIFIED"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Active Listings</span>
                <span className="font-mono font-bold text-foreground">
                  {product.owner.productsCount || 1} product(s)
                </span>
              </div>
            </div>

            {/* Prominent VIEW COMPLETE OWNER PROFILE button & Send Message */}
            <div className="pt-2 space-y-2">
              <button
                onClick={handleOpenOwnerModal}
                className="w-full py-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <User className="h-4 w-4" />
                <span>VIEW COMPLETE OWNER PROFILE</span>
              </button>
              <button
                onClick={() => handleOpenMessageModal()}
                className="w-full py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border/70 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                <span>MESSAGE OWNER</span>
              </button>
            </div>
          </div>

          {/* D. VERIFICATION & COMPLIANCE DOCUMENTS */}
          {product.documents && product.documents.length > 0 && (
            <div className="p-5 rounded-xl bg-card border border-border/70 shadow-2xs space-y-3">
              <h3 className="text-sm font-semibold text-foreground border-b border-border/50 pb-2 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Compliance & Invoices</span>
              </h3>
              <div className="space-y-2">
                {product.documents.map((doc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg bg-secondary/40 border border-border/50 text-xs"
                  >
                    <FileText className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="font-medium text-foreground truncate">{doc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LIGHTBOX FULLSCREEN PREVIEW MODAL */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="max-w-4xl max-h-[85vh] flex items-center justify-center">
            <img
              src={currentImage}
              alt=""
              className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2 text-destructive font-bold text-sm">
                <ShieldAlert className="h-5 w-5" />
                <span>Reject Product Listing</span>
              </div>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Please provide a clear rejection reason for <strong className="text-foreground">{product.title}</strong>. This feedback will be recorded in the audit log and sent to the owner.
            </p>

            <div>
              <label className="text-[11px] font-semibold text-foreground block mb-1">
                Rejection Reason (Required)
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Inadequate serial number visibility, blurry photos, or missing invoice..."
                className="w-full bg-secondary/50 text-foreground text-xs rounded-lg p-3 border border-border/70 focus:outline-none focus:border-foreground/50"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isSubmittingAction || !rejectionReason.trim()}
                className="px-4 py-2 rounded-lg bg-destructive hover:bg-destructive/90 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OWNER FULL PROFILE MODAL */}
      {ownerModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-border/60 flex items-center justify-between bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-secondary border border-border flex items-center justify-center font-bold text-sm text-foreground overflow-hidden">
                  {product.owner.avatar ? (
                    <img src={product.owner.avatar} alt={product.owner.name} className="h-full w-full object-cover" />
                  ) : (
                    <span>{product.owner.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {ownerDetails?.fullName || product.owner.name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {product.owner.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOwnerModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {ownerLoading ? (
                <div className="py-12 flex justify-center">
                  <Loader message="Fetching verified owner profile..." size="md" />
                </div>
              ) : (
                <>
                  {/* Payernt (Vendor / Lender) Section */}
                  <div className="p-4 rounded-xl bg-secondary/30 border border-border/60 space-y-3">
                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                      <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                        <Package className="h-4 w-4 text-emerald-500" />
                        <span>paye₹nt Lender Information</span>
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        Account ID: {ownerDetails?.payerntAccount?.accountId || product.owner.id}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Phone</span>
                        <span className="font-mono font-medium text-foreground">
                          {ownerDetails?.payerntAccount?.phone || product.owner.phone || "Not provided"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Location / City</span>
                        <span className="font-medium text-foreground">
                          {ownerDetails?.payerntAccount?.city || ownerDetails?.city || "Not provided"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Aadhaar Verification</span>
                        <span className="font-mono font-medium text-emerald-500">
                          {ownerDetails?.payerntAccount?.aadhaarMasked || "XXXX-XXXX-3677"} ({ownerDetails?.payerntAccount?.aadhaarStatus || "VERIFIED"})
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Payout Bank Account</span>
                        <span className="font-mono font-medium text-foreground">
                          {ownerDetails?.payerntAccount?.bankAccountMasked || "XXXXXX4589"} (IFSC: {ownerDetails?.payerntAccount?.bankIfsc || "HDFC0001234"})
                        </span>
                      </div>
                    </div>

                    {/* Wallet snapshot */}
                    {ownerDetails?.wallet && (
                      <div className="p-3 rounded-lg bg-card border border-border/40 flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Available Wallet Balance:</span>
                        <span className="font-mono font-bold text-emerald-500">
                          ₹{ownerDetails.wallet.availableBalance.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* List of Products Owned */}
                  <div className="space-y-2">
                    <h4 className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                      Equipment Portfolio ({ownerDetails?.products?.length || 1} active listings)
                    </h4>
                    <div className="space-y-2">
                      {(ownerDetails?.products || [{ id: product.id, title: product.title, category: product.category, price: product.price, status: product.status }]).map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border/60">
                          <div>
                            <span className="font-bold text-foreground block">{p.title}</span>
                            <span className="text-[11px] font-mono text-muted-foreground">{p.id} • {p.category}</span>
                          </div>
                          <div className="text-right font-mono">
                            <span className="font-bold text-foreground">₹{p.price}/day</span>
                            <span className="block text-[10px] uppercase text-emerald-500 font-semibold">{p.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border/60 bg-secondary/20 flex justify-end">
              <button
                onClick={() => setOwnerModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. ADMIN PRODUCT MESSAGE MODAL */}
      {messageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border/70 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border/60 flex items-center justify-between bg-secondary/20">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground font-display">Dispatch Admin Message</h3>
                  <p className="text-[11px] text-muted-foreground font-mono">Linked to Listing ID: {product.id}</p>
                </div>
              </div>
              <button
                onClick={() => setMessageModalOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 text-xs">
              {/* Recipient & Product Context Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Recipient</span>
                  <p className="font-semibold text-foreground truncate">{product.owner?.name || "Product Owner"}</p>
                  <p className="text-[10px] font-mono text-muted-foreground truncate">{product.owner?.email || product.owner?.id}</p>
                </div>
                <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Product Listing</span>
                  <p className="font-semibold text-foreground truncate">{product.title}</p>
                  <span className="inline-block text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    {product.category}
                  </span>
                </div>
              </div>

              {/* Message Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Message Type</label>
                <select
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border/80 text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/40 transition-all font-medium"
                >
                  <option value="PRODUCT_REVIEW">PRODUCT_REVIEW — General Review</option>
                  <option value="PRODUCT_REVISION_REQUIRED">PRODUCT_REVISION_REQUIRED — Revisions Needed</option>
                  <option value="PRODUCT_APPROVED">PRODUCT_APPROVED — Listing Live</option>
                  <option value="PRODUCT_REJECTED">PRODUCT_REJECTED — Rejected</option>
                  <option value="PRICE_UPDATE">PRICE_UPDATE — Rate Adjustment</option>
                  <option value="AVAILABILITY_UPDATE">AVAILABILITY_UPDATE — Calendar/Inventory</option>
                  <option value="ACCOUNT_REVIEW">ACCOUNT_REVIEW — KYC/Account Note</option>
                  <option value="ADMIN_NOTICE">ADMIN_NOTICE — Official Moderation Notice</option>
                  <option value="SYSTEM_NOTICE">SYSTEM_NOTICE — System Notice</option>
                </select>
              </div>

              {/* Title Field */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Message Subject / Title</label>
                <input
                  type="text"
                  value={messageTitle}
                  onChange={(e) => setMessageTitle(e.target.value)}
                  placeholder="e.g. Specification update needed for Vivobook"
                  className="w-full h-10 px-3.5 rounded-xl bg-background border border-border/80 text-foreground text-xs placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 transition-all font-medium"
                />
              </div>

              {/* Message Body Field */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Message Content</label>
                <textarea
                  rows={4}
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Type official admin instructions or feedback for the owner here..."
                  className="w-full p-3 rounded-xl bg-background border border-border/80 text-foreground text-xs placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 transition-all resize-none font-sans"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border/60 bg-secondary/20 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setMessageModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessageToOwner}
                disabled={isSendingMessage || !messageTitle.trim() || !messageContent.trim()}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isSendingMessage ? (
                  <span>Sending...</span>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Send Message</span>
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
