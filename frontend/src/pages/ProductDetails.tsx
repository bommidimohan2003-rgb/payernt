import { useNavigate, useParams, Link } from "@tanstack/react-router";
import {
  Check,
  Truck,
  MessageSquare,
  MapPin,
  Star,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Info,
  Tag,
  ShoppingBag,
  Calendar,
  Clock,
  Heart,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  CalendarCheck,
  CalendarX,
  RotateCcw,
  User,
  Package,
  KeyRound,
  Video,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MainLayout } from "@/layouts/MainLayout";
import { Button } from "@/components/common/Button";
import { Rating } from "@/components/common/Rating";
import { useWishlist } from "@/hooks/useWishlist";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { JsonLd } from "@/components/common/JsonLd";
import { PhotoDetailViewer } from "@/components/common/PhotoDetailViewer";
import { ProductRotationViewer } from "@/components/common/ProductRotationViewer";
import { ProductAngleViewer } from "@/components/common/ProductAngleViewer";
import { RecommendationSection } from "@/components/recommendations/RecommendationSection";
import { tracker } from "@/utils/eventTracker";
import { api } from "@/utils/api";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { formatOwnerAddress } from "@/utils/formatters";
import type { Product, Order } from "@/types";
import { ProductMessageModal } from "@/components/browse/ProductMessageModal";

const KNOWN_BRANDS = [
  "Sony",
  "DJI",
  "Apple",
  "Canon",
  "Nikon",
  "Fujifilm",
  "Blackmagic",
  "RED",
  "RODE",
  "Sennheiser",
  "Shure",
  "Aputure",
  "Godox",
  "GoPro",
  "Royal Enfield",
];

function getProductBrand(product: Product): string | null {
  if ((product as unknown as { brand?: string }).brand) {
    return (product as unknown as { brand: string }).brand;
  }
  const text = `${product.title} ${product.description || ""}`.toLowerCase();
  for (const b of KNOWN_BRANDS) {
    if (text.includes(b.toLowerCase())) {
      return b;
    }
  }
  return null;
}

// Helper to format ISO YYYY-MM-DD
function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Calculate inclusive days between two YYYY-MM-DD dates
function calculateInclusiveDays(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 0;
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diffTime = end.getTime() - start.getTime();
  if (diffTime < 0) return 0;
  return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

import { rentalSecurityService } from "@/services/rentalSecurityService";
import type { RentalSecurity } from "@/types";

export default function ProductDetails() {
  const params = useParams({ strict: false }) as { id?: string };
  const routeParamId = params?.id || (typeof window !== "undefined" ? window.location.pathname.split("/").filter(Boolean).pop() || "" : "");
  const id = String(routeParamId || "");
  const navigate = useNavigate();
  const { has, toggle } = useWishlist();
  const { user } = useAuth();
  const { addToCart, cartItems } = useCart();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [justAddedToCart, setJustAddedToCart] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [securityRecord, setSecurityRecord] = useState<RentalSecurity | null>(null);

  // Instant cache lookup for zero-latency initial render
  const initialCachedProduct = id ? api.getCachedProduct(id) : null;
  const [product, setProduct] = useState<Product | null>(initialCachedProduct);
  const [productLoading, setProductLoading] = useState<boolean>(!initialCachedProduct);

  // Date Selection & Availability States
  const todayStr = useMemo(() => toDateInputValue(new Date()), []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toDateInputValue(d);
  }, []);

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [availabilityChecked, setAvailabilityChecked] = useState<boolean>(false);
  const [isAvailableForDates, setIsAvailableForDates] = useState<boolean | null>(null);
  const [availabilityMessage, setAvailabilityMessage] = useState<string>("");
  const [isCreatingBooking, setIsCreatingBooking] = useState<boolean>(false);

  // Auth Protection: If unauthenticated, redirect to login while preserving target product
  useEffect(() => {
    if (!user) {
      const redirectTarget = `/product/${id}`;
      try {
        localStorage.setItem("pay₹ent_pending_product_redirect", redirectTarget);
        localStorage.setItem("pendingProductId", String(id));
      } catch (e) {}
      navigate({ to: "/login", search: { redirect: redirectTarget } as any });
    }
  }, [user, id, navigate]);

  // Stale-While-Revalidate: load latest product details in background
  useEffect(() => {
    let isMounted = true;
    const cached = api.getCachedProduct(id);
    if (cached && isMounted) {
      setProduct(cached);
      setProductLoading(false);
    } else {
      setProductLoading(true);
    }

    async function loadTargetProduct() {
      let found: Product | null = cached || null;
      try {
        const live = await api.getProductById(id);
        if (live) found = live;
      } catch {
        /* ignore */
      }

      if (!found) {
        try {
          const items = await api.getPublicProducts();
          if (Array.isArray(items)) {
            const targetKey = String(id).toLowerCase();
            found =
              items.find(
                (p: Product) =>
                  String(p.id).toLowerCase() === targetKey ||
                  String(p.id) === String(id)
              ) || null;
          }
        } catch {
          /* ignore */
        }
      }

      if (!found) {
        try {
          const localItems = storage.get<Product[]>("payent_server_products", []);
          if (Array.isArray(localItems)) {
            const targetKey = String(id).toLowerCase();
            found =
              localItems.find(
                (p: Product) =>
                  String(p.id).toLowerCase() === targetKey ||
                  String(p.id) === String(id)
              ) || null;
          }
        } catch {
          /* ignore */
        }
      }

      if (isMounted) {
        if (found) {
          setProduct(found);
          api.cacheProduct(found);
        } else if (!cached) {
          setProduct(null);
        }
        setProductLoading(false);
      }
    }

    loadTargetProduct();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [frequentlyTogether, setFrequentlyTogether] = useState<Product[]>([]);

  // Existing Bookings lookup for Date Overlap Detection
  const existingProductBookings = useMemo(() => {
    if (!product) return [];
    const allOrders = storage.get<Order[]>(STORAGE_KEYS.orders, []);
    return allOrders.filter(
      (o) =>
        (o.productId === product.id || (o as any).product_id === product.id) &&
        o.status !== "cancelled"
    );
  }, [product]);

  const currentUserId = user?.id || user?.email || "";
  const ownerId =
    (product as any)?.ownerId ||
    (product as any)?.owner_id ||
    (product as any)?.user_id ||
    product?.owner?.email ||
    "";
  const ownerEmail = product?.owner?.email?.toLowerCase().trim() || "";
  const userEmail = user?.email?.toLowerCase().trim() || "";
  const ownerName = (
    product?.owner?.name ||
    (product as Product & { owner_name?: string })?.owner_name ||
    ""
  ).toLowerCase().trim();
  const userFullName = (user?.fullName || "").toLowerCase().trim();

  const isOwner = Boolean(
    user &&
    product &&
    !product.isReference &&
    ((ownerId && currentUserId && ownerId === currentUserId) ||
      (ownerEmail && userEmail && ownerEmail === userEmail) ||
      (ownerName && userFullName && ownerName === userFullName))
  );

  const isInCart = Boolean(
    product && cartItems.some((item) => item.product_id === product.id),
  );

  // Rental Calculation
  const rentalDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return calculateInclusiveDays(startDate, endDate);
  }, [startDate, endDate]);

  const estimatedTotal = useMemo(() => {
    if (!product || rentalDays <= 0) return 0;
    return rentalDays * (Number(product.price) || 0);
  }, [product, rentalDays]);

  // Handle Date Changes (resets check state)
  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setAvailabilityChecked(false);
    setIsAvailableForDates(null);
    setAvailabilityMessage("");
    // If end date is earlier than new start date, reset or bump end date
    if (endDate && val && new Date(endDate) < new Date(val)) {
      setEndDate(val);
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setAvailabilityChecked(false);
    setIsAvailableForDates(null);
    setAvailabilityMessage("");
  };

  // CHECK AVAILABILITY LOGIC
  const handleCheckAvailability = () => {
    if (!startDate || !endDate) {
      toast.error("Please select both a Start Date and End Date.");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date(todayStr);

    if (start < today) {
      setIsAvailableForDates(false);
      setAvailabilityMessage("Start date cannot be in the past.");
      setAvailabilityChecked(true);
      toast.error("Start date cannot be in the past.");
      return;
    }

    if (end < start) {
      setIsAvailableForDates(false);
      setAvailabilityMessage("End date must be on or after the start date.");
      setAvailabilityChecked(true);
      toast.error("End date cannot be earlier than start date.");
      return;
    }

    if (product && !product.available) {
      setIsAvailableForDates(false);
      setAvailabilityMessage("This gear is currently marked as unavailable by the owner.");
      setAvailabilityChecked(true);
      return;
    }

    // Check overlap with existing confirmed bookings
    // Overlap formula: newStart <= existingEnd && newEnd >= existingStart
    const hasOverlap = existingProductBookings.some((booking) => {
      const bStart = booking.startDate || (booking as any).start_date;
      const bEnd = booking.endDate || (booking as any).end_date;
      if (!bStart || !bEnd) return false;

      const existingStart = new Date(bStart);
      const existingEnd = new Date(bEnd);

      return start <= existingEnd && end >= existingStart;
    });

    if (hasOverlap) {
      setIsAvailableForDates(false);
      setAvailabilityMessage(
        "Product is not available for the selected dates (overlaps with an existing booking). Please pick alternative dates."
      );
      setAvailabilityChecked(true);
      toast.error("Gear is booked for one or more selected dates.");
    } else {
      setIsAvailableForDates(true);
      setAvailabilityMessage("✓ Product available for selected dates!");
      setAvailabilityChecked(true);
      toast.success("Gear is available! Review booking summary below.");
    }
  };

  // CONFIRM BOOKING LOGIC
  const handleConfirmBooking = async () => {
    if (!product) return;

    if (!user) {
      toast.info("Please log in to confirm your rental booking.");
      navigate({ to: "/login", search: { redirect: `/product/${id}` } as any });
      return;
    }

    if (isOwner) {
      toast.error("You cannot rent your own product.");
      return;
    }

    if (!isAvailableForDates || rentalDays <= 0) {
      toast.error("Please check and confirm date availability before booking.");
      return;
    }

    setIsCreatingBooking(true);

    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    const renterId = user.accountId || user.id || user.email;
    const bookingId = `ord_${Date.now()}`;
    const newOrder: Order = {
      id: bookingId,
      productId: product.id,
      product_id: product.id,
      productTitle: product.title,
      product_title: product.title,
      productImage: product.image,
      product_image: product.image,
      startDate: startDate,
      start_date: startDate,
      endDate: endDate,
      end_date: endDate,
      total: estimatedTotal,
      status: "pending", // Booking requested
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      user_email: user.email,
      userEmail: user.email,
      ...({
        renterId,
        ownerId: ownerId || product.owner?.email || "PAYERNT_USER_001",
        rentalDuration: rentalDays,
        rentalRate: Number(product.price) || 0,
        estimatedAmount: estimatedTotal,
      } as any),
    };

    try {
      if (token) {
        await api.createOrder(token, newOrder);
      } else {
        const allOrders = storage.get<Order[]>(STORAGE_KEYS.orders, []);
        storage.set(STORAGE_KEYS.orders, [newOrder, ...allOrders]);
      }

      api.invalidateCache("user_orders");
      window.dispatchEvent(new CustomEvent("payent_orders_updated"));

      toast.success("Rental booking confirmed successfully!");
      setIsCreatingBooking(false);
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      console.warn("Booking creation notice:", err);
      // Fallback local save to guarantee optimistic state
      const allOrders = storage.get<Order[]>(STORAGE_KEYS.orders, []);
      if (!allOrders.some((o) => o.id === newOrder.id)) {
        storage.set(STORAGE_KEYS.orders, [newOrder, ...allOrders]);
      }
      api.invalidateCache("user_orders");
      window.dispatchEvent(new CustomEvent("payent_orders_updated"));

      toast.success("Rental booking request placed!");
      setIsCreatingBooking(false);
      navigate({ to: "/dashboard" });
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    if (!user) {
      toast.info("Please log in to add items to your rental cart.");
      navigate({ to: "/login", search: { redirect: `/product/${id}` } as any });
      return;
    }
    if (!product.available) {
      toast.error("This gear item is currently unavailable.");
      return;
    }
    setIsAddingToCart(true);
    const success = await addToCart(product.id);
    setIsAddingToCart(false);
    if (success) {
      setJustAddedToCart(true);
      setTimeout(() => setJustAddedToCart(false), 3000);
    }
  };

  useEffect(() => {
    if (!product) return;
    const currentId = product.id;
    tracker.viewProduct(currentId, product.category);

    let isMounted = true;
    async function loadRecommendations() {
      const [similar, together] = await Promise.all([
        api.getSimilarRecommendations(currentId),
        api.getFrequentlyTogetherRecommendations(currentId),
      ]);
      if (isMounted) {
        if (similar && similar.length > 0) setSimilarProducts(similar);
        if (together && together.length > 0) setFrequentlyTogether(together);
      }
    }
    loadRecommendations();
    return () => {
      isMounted = false;
    };
  }, [product]);

  if (productLoading && !product) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-6 space-y-6">
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-3">
              <div className="aspect-[4/3] w-full rounded-3xl bg-secondary/50 animate-pulse border border-border/80" />
            </div>
            <div className="lg:col-span-5 space-y-4">
              <div className="h-96 w-full rounded-2xl bg-secondary/50 animate-pulse border border-border/80 p-5 space-y-4" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!product) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-3xl px-4 md:px-6 py-24 text-center">
          <h1 className="text-2xl font-bold">Product not found</h1>
          <Button
            className="mt-6"
            onClick={() => navigate({ to: "/browse" })}
          >
            Browse marketplace
          </Button>
        </div>
      </MainLayout>
    );
  }

  const productSchema = {
    "@type": "Product",
    name: product.title,
    image: product.image,
    description: product.description,
    category: product.category,
    brand: {
      "@type": "Brand",
      name: "Payent",
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.price,
      priceValidUntil: "2027-12-31",
      availability: product.available
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `https://payent.com/product/${product.id}`,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.rating != null ? Number(product.rating) : 5,
      reviewCount: product.reviews || 0,
    },
  };

  const breadcrumbSchema = {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://payent.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Explore",
        item: "https://payent.com/browse",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.title,
        item: `https://payent.com/product/${product.id}`,
      },
    ],
  };

  const gallery = useMemo(() => {
    if (!product) return [];
    let imgs = product.images;
    if (typeof imgs === "string") {
      try {
        const parsed = JSON.parse(imgs);
        if (Array.isArray(parsed)) imgs = parsed;
      } catch {
        imgs = [imgs];
      }
    }
    if (!Array.isArray(imgs)) imgs = [];
    imgs = imgs.filter(Boolean);
    const prim = product.image || (product as any).primary_image;
    if (prim && !imgs.includes(prim)) {
      imgs = [prim, ...imgs];
    } else if (!imgs.length && prim) {
      imgs = [prim];
    }
    if (imgs.length === 0 && Array.isArray(product.rotationFrames) && product.rotationFrames.length > 0) {
      imgs = product.rotationFrames.filter(Boolean);
    }
    return imgs.length > 0 ? imgs : [product.image || "/placeholder.png"];
  }, [product]);

  const brand = getProductBrand(product);
  const isWishlisted = has(product.id);

  return (
    <MainLayout>
      <JsonLd schema={productSchema} />
      <JsonLd schema={breadcrumbSchema} />
      <section className="mx-auto max-w-7xl px-4 md:px-6 py-5 space-y-6">
        {/* Navigation Breadcrumb / Back to Explore */}
        <div className="flex items-center justify-between pb-1">
          <button
            type="button"
            onClick={() => navigate({ to: "/browse" })}
            id="product-details-back-to-browse-btn"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <span>← Back to Explore</span>
          </button>

          <div className="flex items-center gap-3">
            {/* Wishlist Header Action */}
            <button
              type="button"
              onClick={() => {
                toggle(product.id);
                toast.success(
                  isWishlisted ? "Removed from wishlist" : "Saved to wishlist!"
                );
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card hover:bg-secondary text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Heart
                className={cn(
                  "h-3.5 w-3.5",
                  isWishlisted ? "fill-red-500 text-red-500" : "text-muted-foreground"
                )}
              />
              <span>{isWishlisted ? "Saved" : "Save"}</span>
            </button>

            <span className="text-xs text-muted-foreground font-mono hidden sm:inline-block">
              ID: #{product.id}
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Image Viewer */}
          <div className="lg:col-span-7 space-y-4 sticky top-20">
            {product.angleImages && product.angleImages.length >= 2 ? (
              <ProductAngleViewer
                angles={product.angleImages}
                productTitle={product.title}
                onWishlistToggle={() => toggle(product.id)}
                isWishlisted={has(product.id)}
              />
            ) : product.rotationFrames && product.rotationFrames.length >= 2 ? (
              <ProductRotationViewer
                frames={product.rotationFrames}
                productTitle={product.title}
              />
            ) : (
              <PhotoDetailViewer
                primaryImage={product.image}
                productTitle={product.title}
                angles={gallery}
                videoUrl={product.videoUrl || (product as any).video_url}
                onWishlistToggle={() => toggle(product.id)}
                isWishlisted={has(product.id)}
              />
            )}

            {/* 10-Second Equipment Inspection Video from TiDB/Cloudinary */}
            {(product.videoUrl || (product as any).video_url) && (
              <div className="rounded-3xl bg-card border border-border/80 p-5 space-y-3.5 shadow-xs text-left">
                <div className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Video className="h-4 w-4 text-primary" />
                    <span>Verified 10s Inspection Video</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] text-primary font-bold bg-primary/10 px-2.5 py-0.5 rounded-full">
                    <Sparkles className="h-3 w-3" /> 100% Physical Check
                  </span>
                </div>

                <div className="relative rounded-2xl overflow-hidden bg-black border border-border/80 aspect-video group">
                  <video
                    src={product.videoUrl || (product as any).video_url}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  Live inspection video recorded by the lender prior to listing to verify pristine condition.
                </p>
              </div>
            )}

            {/* Specifications & Verified Gear Details */}
            <div className="rounded-3xl bg-card border border-border/80 p-5 space-y-3.5 shadow-xs text-left">
              <div className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-foreground" />
                  <span>Gear Specifications & Verification</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                  <ShieldCheck className="h-3 w-3" /> Insured & Calibrated
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-secondary/40 border border-border/60">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Category</span>
                  <span className="font-extrabold text-foreground truncate block capitalize mt-0.5">{product.category}</span>
                </div>
                <div className="p-3 rounded-2xl bg-secondary/40 border border-border/60">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Brand / Model</span>
                  <span className="font-extrabold text-foreground truncate block mt-0.5">{brand || "Pro Spec"}</span>
                </div>
                <div className="p-3 rounded-2xl bg-secondary/40 border border-border/60">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Condition</span>
                  <span className="font-extrabold text-foreground truncate block mt-0.5">{(product as unknown as { condition?: string }).condition || "Pristine / Mint"}</span>
                </div>
                <div className="p-3 rounded-2xl bg-secondary/40 border border-border/60">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Pickup Hub</span>
                  <span className="font-extrabold text-foreground truncate block mt-0.5">{formatOwnerAddress(product) || "Direct Handover"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Details, Availability & Rental Booking Section */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-3xl bg-card border border-border/80 p-5 md:p-6 space-y-5 shadow-lg text-left">
              {/* Category & Status Header */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-extrabold tracking-wider text-foreground px-3 py-1 rounded-xl bg-secondary border border-border">
                    {product.category}
                  </span>
                  {brand && (
                    <span className="text-xs font-bold text-foreground px-2.5 py-1 rounded-xl bg-secondary/80 border border-border">
                      {brand}
                    </span>
                  )}
                </div>

                {product.available ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-extrabold px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Available for Rent
                  </span>
                ) : (
                  <span className="text-xs text-destructive font-extrabold px-3 py-1 rounded-full bg-destructive/10 border border-destructive/20">
                    Currently Booked
                  </span>
                )}
              </div>

              {/* Title & Rating */}
              <div className="space-y-1.5">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight text-foreground font-display">
                  {product.title}
                </h1>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <div className="flex items-center gap-1 text-foreground bg-secondary px-2.5 py-0.5 rounded-full border border-border">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span>{(product.rating != null ? Number(product.rating) : 5.0).toFixed(1)}</span>
                  </div>
                  {(product.reviews || 0) > 0 && (
                    <span className="text-muted-foreground">
                      ({product.reviews} verified renter reviews)
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {product.description || `Professional ${product.title} in excellent working condition. Insured and calibrated for creative shoots.`}
              </p>

              {/* Owner Info Tile with Direct Message Action */}
              {!product.isReference && (
                <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-secondary/40 border border-border/80">
                  <img
                    src={product.owner?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(product.owner?.name || "Owner")}&background=10b981&color=ffffff`}
                    alt={product.owner?.name || "Owner"}
                    className="h-11 w-11 rounded-full object-cover border-2 border-border"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-extrabold text-foreground truncate">
                      {product.owner?.name || "Verified Gear Host"}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
                      <ShieldCheck className="h-3 w-3 text-emerald-500 shrink-0" />
                      <span>Verified Host</span>
                      <span>·</span>
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span>{product.owner?.rating || "5.0"}</span>
                    </div>
                  </div>

                  {!isOwner && (
                    <button
                      type="button"
                      onClick={() => setShowMessageModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-secondary text-foreground text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-sky-500" />
                      <span>Message</span>
                    </button>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* RENTAL AVAILABILITY & BOOKING SECTION                     */}
              {/* ========================================================= */}
              <div className="pt-2 border-t border-border/80 space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider">
                    Rental Daily Rate
                  </span>
                  <div>
                    <span className="text-3xl font-black text-foreground font-display font-mono">
                      ₹{(Number(product.price) || 0).toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold"> / day</span>
                  </div>
                </div>

                {isOwner ? (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-1">
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      You are the owner of this listing.
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      You cannot rent or create bookings on your own equipment.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 sm:p-5 rounded-2xl bg-secondary/30 border border-border space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-extrabold text-foreground uppercase tracking-wider">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span>Select Rental Dates</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        Min. 1 Day Rental
                      </span>
                    </div>

                    {/* Date Inputs Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground block">
                          Start Date
                        </label>
                        <input
                          type="date"
                          min={todayStr}
                          value={startDate}
                          onChange={(e) => handleStartDateChange(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground block">
                          End Date (Return)
                        </label>
                        <input
                          type="date"
                          min={startDate || todayStr}
                          value={endDate}
                          onChange={(e) => handleEndDateChange(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Existing Booked Dates Warning if any */}
                    {existingProductBookings.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 space-y-1">
                        <span className="font-bold block">Currently Booked Periods:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {existingProductBookings.map((b) => (
                            <span
                              key={b.id}
                              className="px-2 py-0.5 rounded-md bg-card/80 border border-amber-500/20 font-mono text-[10px]"
                            >
                              {b.startDate} → {b.endDate}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Step 1: Check Availability Action */}
                    {!availabilityChecked || isAvailableForDates === false ? (
                      <div className="space-y-2 pt-1">
                        <button
                          type="button"
                          onClick={handleCheckAvailability}
                          className="w-full py-3 px-4 rounded-xl bg-foreground text-background font-extrabold text-xs shadow-md hover:opacity-95 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <CalendarCheck className="h-4 w-4" />
                          <span>Check Date Availability</span>
                        </button>

                        {availabilityChecked && isAvailableForDates === false && (
                          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center gap-2">
                            <CalendarX className="h-4 w-4 shrink-0" />
                            <span>{availabilityMessage}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Step 2: Available Summary Matrix & Confirm Booking */
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3.5 pt-1"
                      >
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span>{availabilityMessage}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setAvailabilityChecked(false);
                              setIsAvailableForDates(null);
                            }}
                            className="text-[11px] underline hover:opacity-80 cursor-pointer"
                          >
                            Change Dates
                          </button>
                        </div>

                        {/* Booking Summary Box */}
                        <div className="p-3.5 rounded-xl border border-border bg-card space-y-2 text-xs">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Rental Duration:</span>
                            <span className="font-extrabold text-foreground">{rentalDays} Days</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Daily Rate:</span>
                            <span className="font-semibold text-foreground">₹{product.price} / day</span>
                          </div>
                          <div className="pt-2 border-t border-border flex justify-between items-baseline">
                            <span className="font-bold text-foreground">Estimated Total:</span>
                            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-display font-mono">
                              ₹{estimatedTotal.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>

                        {/* Confirm Booking Button */}
                        <button
                          type="button"
                          disabled={isCreatingBooking}
                          onClick={handleConfirmBooking}
                          id="confirm-booking-btn"
                          className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          {isCreatingBooking ? (
                            <span>Creating Booking Request...</span>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Confirm Booking Request (₹{estimatedTotal.toLocaleString("en-IN")})</span>
                            </>
                          )}
                        </button>
                      </motion.div>
                    )}

                    {/* Secondary Action: Add to Cart */}
                    <div className="pt-1 border-t border-border/60 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">Prefer to rent later?</span>
                      <button
                        type="button"
                        onClick={handleAddToCart}
                        disabled={isAddingToCart}
                        className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <ShoppingBag className="h-3 w-3" />
                        <span>{justAddedToCart ? "Added to Cart!" : "Add to Rental Cart"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Insurance & Protection Guarantee */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-secondary/40 border border-border/60">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-extrabold text-foreground">
                      ₹50,000 Insured
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Full damage protection
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-secondary/40 border border-border/60">
                  <Truck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-extrabold text-foreground">
                      Verified Handover
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Direct pickup & return
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>



        {/* ========================================================= */}
        {/* PRODUCT-SPECIFIC MESSAGING MODAL                          */}
        {/* ========================================================= */}
        {showMessageModal && (
          <ProductMessageModal
            isOpen={showMessageModal}
            onClose={() => setShowMessageModal(false)}
            product={product}
          />
        )}

        {/* Frequently Booked Together Section */}
        {frequentlyTogether.length > 0 && (
          <RecommendationSection
            title="Frequently Booked Together"
            subtitle="Popular gear combinations rented in single projects"
            products={frequentlyTogether}
            type="frequently_together"
            badge="Bundle Pick"
            layout="compact"
            className="pt-10"
          />
        )}

        {/* Similar Items Section */}
        {similarProducts.length > 0 && (
          <RecommendationSection
            title="Similar Tech Gear"
            subtitle={`Explore items similar to ${product.title} in ${product.category}`}
            products={similarProducts}
            type="similar"
            badge="Category Match"
            className="pt-6"
          />
        )}
      </section>
    </MainLayout>
  );
}
