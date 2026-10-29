import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  Check,
  ShieldCheck,
  Lock,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Smartphone,
  CreditCard,
  Building2,
  Wallet,
  QrCode,
  MapPin,
  Truck,
  Navigation,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Home,
  Plus,
  Edit3,
  Trash2,
  FileText,
  Calendar,
} from "lucide-react";
import { useMemo, useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/layouts/MainLayout";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Modal } from "@/components/common/Modal";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { api } from "@/utils/api";
import { tracker } from "@/utils/eventTracker";
import { RecommendationSection } from "@/components/recommendations/RecommendationSection";
import type { Order, Product, UserAddress } from "@/types";
import { toast } from "sonner";
import { CelebrationFlourish } from "@/components/common/CelebrationFlourish";

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (
      typeof window !== "undefined" &&
      (window as unknown as { Razorpay?: unknown }).Razorpay
    ) {
      return resolve(true);
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function Checkout() {
  const search = useSearch({ from: "/checkout" }) as {
    id?: string;
    start?: string;
    end?: string;
    slot?: string;
    mode?: string;
  };
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [productLoading, setProductLoading] = useState(true);

  // Stepper state: "address" (Step A) -> "review" (Step B)
  const [activeStep, setActiveStep] = useState<"address" | "review">("address");

  // Load product from live API catalog
  useEffect(() => {
    let isMounted = true;
    setProductLoading(true);

    async function loadTargetProduct() {
      let found: Product | null = null;
      if (search.id) {
        try {
          found = await api.getProductById(search.id);
        } catch {
          /* ignore */
        }
      }

      if (!found && search.id) {
        try {
          const items = await api.getPublicProducts();
          if (Array.isArray(items)) {
            found = items.find((p: Product) => p.id === search.id) || null;
          }
        } catch {
          /* ignore */
        }
      }

      if (isMounted) {
        setProduct(found || null);
        setProductLoading(false);
      }
    }

    loadTargetProduct();
    return () => {
      isMounted = false;
    };
  }, [search.id]);

  // Dates (defaults to query params, or today Iso)
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const initialStart = useMemo(
    () => (search.start && search.start >= todayIso ? search.start : todayIso),
    [search.start, todayIso],
  );
  const initialEnd = useMemo(() => {
    if (search.end && search.end >= initialStart) return search.end;
    return new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);
  }, [search.end, initialStart]);

  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);

  // Address State & Form
  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [flatHouse, setFlatHouse] = useState("");
  const [streetArea, setStreetArea] = useState(user?.address || "");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState(user?.city || "");
  const [stateName, setStateName] = useState(user?.state || "");
  const [pincode, setPincode] = useState(user?.pincode || "");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});

  // Fetch saved delivery addresses
  useEffect(() => {
    let isMounted = true;
    const fetchAddresses = async () => {
      setLoadingAddresses(true);
      try {
        const list = await api.getUserAddresses();
        if (isMounted) {
          setSavedAddresses(list);
          if (list.length > 0) {
            const def = list.find((a) => a.is_default || a.isDefault) || list[0];
            setSelectedAddressId(def.id);
            setActiveStep("review");
            setShowAddressForm(false);
          } else {
            setActiveStep("address");
            setShowAddressForm(true);
          }
        }
      } catch (e) {
        if (isMounted) {
          setActiveStep("address");
          setShowAddressForm(true);
        }
      } finally {
        if (isMounted) setLoadingAddresses(false);
      }
    };

    fetchAddresses();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute selected address
  const selectedAddress = useMemo(() => {
    if (!selectedAddressId) return savedAddresses[0] || null;
    return savedAddresses.find((a) => a.id === selectedAddressId) || savedAddresses[0] || null;
  }, [savedAddresses, selectedAddressId]);

  // Promos
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState(false);

  // Modal & Processing Statuses
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [upsellProducts, setUpsellProducts] = useState<Product[]>([]);
  const [categoryRestriction, setCategoryRestriction] = useState<{
    restricted: boolean;
    message: string;
  } | null>(null);
  const [kycStatus, setKycStatus] = useState<string | null>(null);

  useEffect(() => {
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) return;
    let isMounted = true;
    api.getKycStatus(token).then((res) => {
      if (isMounted && res) {
        setKycStatus(res.status || "NOT_STARTED");
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Fulfillment Method & Location State
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"delivery" | "pickup" | "custom">("delivery");
  const [customLocation, setCustomLocation] = useState("");
  const [locationDirections, setLocationDirections] = useState("");

  useEffect(() => {
    let isMounted = true;
    if (product) {
      api.getFrequentlyTogetherRecommendations(product.id).then((items) => {
        if (isMounted && items && items.length > 0) {
          setUpsellProducts(items);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [product]);

  // Check Category Restriction
  useEffect(() => {
    if (!product?.category) {
      setCategoryRestriction(null);
      return;
    }
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) return;

    let isMounted = true;
    const evaluate = async () => {
      try {
        const res = await api.checkCategoryRestriction(token, product.category, product.id);
        if (isMounted) {
          if (res.restricted) {
            setCategoryRestriction({
              restricted: true,
              message:
                res.message ||
                "You already have a product in this category awaiting delivery. You can book another product in this category once your current order is delivered.",
            });
          } else {
            setCategoryRestriction(null);
          }
        }
      } catch {
        if (isMounted) setCategoryRestriction(null);
      }
    };

    evaluate();
    const handleSync = () => evaluate();
    window.addEventListener("payent_orders_updated", handleSync);
    window.addEventListener("payent_queue_updated", handleSync);
    return () => {
      isMounted = false;
      window.removeEventListener("payent_orders_updated", handleSync);
      window.removeEventListener("payent_queue_updated", handleSync);
    };
  }, [product?.id, product?.category]);

  // Payment Method: "card" | "upi"
  const [paymentMethod, setPaymentMethod] = useState<"card" | "upi">("card");

  // Card details
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  // UPI details
  const [upiType, setUpiType] = useState<"id" | "qr">("id");
  const [upiId, setUpiId] = useState("");
  const [upiVerified, setUpiVerified] = useState(false);
  const [upiVerifying, setUpiVerifying] = useState(false);
  const [qrCountdown, setQrCountdown] = useState(120);
  const [qrActive, setQrActive] = useState(false);

  const qrTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Rental Calculations
  const days = Math.max(
    1,
    Math.ceil((+new Date(end) - +new Date(start)) / 86400000),
  );
  const subtotal = (product?.price ?? 0) * days;
  const discount = applied ? subtotal * 0.1 : 0;
  const tax = (subtotal - discount) * 0.08;
  const total = useMemo(
    () => subtotal - discount + tax,
    [subtotal, discount, tax],
  );

  // Formatted delivery address string for snapshots
  const formattedDeliveryAddress = useMemo(() => {
    if (fulfillmentMethod === "pickup") {
      return "Payent Verified Equipment Hub, Indiranagar, Bengaluru, Karnataka 560038";
    }
    if (fulfillmentMethod === "custom") {
      return customLocation.trim() || "Selected Custom Meetup Location";
    }
    if (selectedAddress) {
      const landmarkPart = selectedAddress.landmark ? `, Near ${selectedAddress.landmark}` : "";
      return `${selectedAddress.full_name || selectedAddress.fullName}, ${selectedAddress.flat_house || selectedAddress.flatHouse}, ${selectedAddress.street_area || selectedAddress.streetArea}${landmarkPart}, ${selectedAddress.city}, ${selectedAddress.state} - ${selectedAddress.pincode || selectedAddress.pinCode} (Phone: ${selectedAddress.phone})`;
    }
    return user?.address ? `${user.address}${user.city ? `, ${user.city}` : ""}` : "";
  }, [fulfillmentMethod, selectedAddress, customLocation, user]);

  // Address validation (Full Name and Mobile Number are automatically taken from user account)
  const validateAddressForm = () => {
    const errs: Record<string, string> = {};
    if (!flatHouse.trim()) {
      errs.flatHouse = "House / Flat / Block number is required.";
    }
    if (!streetArea.trim()) {
      errs.streetArea = "Street / Area is required.";
    }
    if (!city.trim()) {
      errs.city = "City is required.";
    }
    if (!stateName.trim()) {
      errs.stateName = "State is required.";
    }
    const cleanPin = pincode.replace(/\s/g, "");
    if (!cleanPin || cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
      errs.pincode = "Valid 6-digit PIN code is required.";
    }
    setAddressErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step A: Save Address (Must NOT create order or confirm booking)
  const handleSaveAddress = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateAddressForm()) {
      toast.error("Please fill in all required address fields correctly.");
      return;
    }
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) {
      toast.error("Please sign in to save your delivery address.");
      navigate({ to: "/login" });
      return;
    }

    const effectiveFullName = (fullName.trim() || user?.fullName || (user as any)?.name || "Valued Customer").trim();
    const rawPhone = (phone || user?.phone || (user as any)?.phoneNumber || "").replace(/\D/g, "");
    const effectivePhone = (rawPhone.length === 12 && rawPhone.startsWith("91"))
      ? rawPhone.slice(2)
      : (rawPhone.slice(-10) || "9876543210");

    setIsSavingAddress(true);
    try {
      const saved = await api.saveUserAddress({
        fullName: effectiveFullName,
        phone: effectivePhone,
        flatHouse: flatHouse.trim(),
        streetArea: streetArea.trim(),
        landmark: landmark.trim(),
        city: city.trim(),
        state: stateName.trim(),
        pincode: pincode.trim(),
        deliveryInstructions: deliveryInstructions.trim(),
        isDefault: true,
      });

      toast.success("Delivery address saved successfully!");
      setSavedAddresses((prev) => {
        const withoutCurrent = prev.filter((a) => a.id !== saved.id);
        return [saved, ...withoutCurrent];
      });
      setSelectedAddressId(saved.id);
      setShowAddressForm(false);
      // Advance to Step B: Review Order
      setActiveStep("review");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save delivery address.");
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Step B: Edit Address option
  const handleEditAddress = (addrToEdit?: UserAddress) => {
    const target = addrToEdit || selectedAddress;
    if (target) {
      setFullName(target.full_name || target.fullName || "");
      setPhone(target.phone || "");
      setFlatHouse(target.flat_house || target.flatHouse || "");
      setStreetArea(target.street_area || target.streetArea || "");
      setLandmark(target.landmark || "");
      setCity(target.city || "");
      setStateName(target.state || "");
      setPincode(target.pincode || target.pinCode || "");
      setDeliveryInstructions(target.delivery_instructions || target.deliveryInstructions || "");
    }
    setShowAddressForm(true);
    setActiveStep("address");
  };

  // Step C: Confirm Order (Explicit submission action)
  const handleConfirmOrder = async () => {
    if (!product) return;
    setPaymentError(null);
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);

    if (!token) {
      toast.error("Please sign in to confirm your gear rental.");
      navigate({ to: "/login" });
      return;
    }

    if (categoryRestriction?.restricted) {
      const msg =
        categoryRestriction.message ||
        "You already have a product in this category awaiting delivery. You can book another product in this category once your current order is delivered.";
      toast.error(msg);
      setPaymentError(msg);
      return;
    }

    if (kycStatus && kycStatus !== "APPROVED") {
      const msg = "Admin-approved KYC verification is required before initiating or submitting bookings. Please complete your identity verification.";
      toast.error(msg);
      setPaymentError(msg);
      navigate({ to: "/kyc" });
      return;
    }

    if (fulfillmentMethod === "delivery" && !selectedAddress) {
      toast.error("Please add and save a delivery address before confirming your order.");
      setActiveStep("address");
      setShowAddressForm(true);
      return;
    }

    // Prevent duplicate clicks
    if (isProcessing || isVerifying) return;
    setIsProcessing(true);

    const bookingId = `ord_${Date.now()}`;
    const orderPayload: Order = {
      id: bookingId,
      productId: product.id,
      productTitle: product.title,
      productImage: product.image,
      startDate: start,
      endDate: end,
      total: Math.round(total),
      status: "pending",
      category: product.category || "",
      createdAt: new Date().toISOString(),
      deliveryMethod: fulfillmentMethod,
      deliveryAddress: formattedDeliveryAddress,
      deliveryAddressId: selectedAddress?.id || undefined,
      deliveryAddressSnapshot: selectedAddress || undefined,
      pickupLocation:
        fulfillmentMethod === "pickup"
          ? "Payent Verified Equipment Hub, Indiranagar, Bengaluru"
          : "",
      customLocation:
        fulfillmentMethod === "custom" ? customLocation.trim() : "",
      locationDirections: locationDirections.trim(),
    };

    try {
      await api.createOrder(token, orderPayload);
      api.invalidateCache("user_orders");
      const localOrders = storage.get<Order[]>(STORAGE_KEYS.orders, []);
      storage.set(STORAGE_KEYS.orders, [orderPayload, ...localOrders]);
      window.dispatchEvent(new CustomEvent("payent_orders_updated"));

      setConfirmedOrder(orderPayload);
      tracker.bookingCompleted(product.id, product.category);
      setIsProcessing(false);
      setOpen(true);
      toast.success("Order confirmed successfully! Delivery is now scheduled.");
    } catch (err: any) {
      setIsProcessing(false);
      const msg = err?.message || "Failed to confirm order. Please try again.";
      setPaymentError(msg);
      toast.error(msg);
    }
  };

  // Razorpay Gateway Handler
  const handlePayWithRazorpay = async () => {
    setPaymentError(null);
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);

    if (!token) {
      toast.error("Please sign in to complete your gear rental.");
      navigate({ to: "/login" });
      return;
    }

    if (categoryRestriction?.restricted) {
      const msg =
        categoryRestriction.message ||
        "You already have a product in this category awaiting delivery. You can book another product in this category once your current order is delivered.";
      toast.error(msg);
      setPaymentError(msg);
      return;
    }

    if (fulfillmentMethod === "delivery" && !selectedAddress) {
      toast.error("Please save your delivery address before proceeding to payment.");
      setActiveStep("address");
      return;
    }

    setIsProcessing(true);

    try {
      const orderRes = await api.createRazorpayOrder(
        token,
        product.id,
        start,
        end,
        applied ? "SAVE10" : coupon,
        {
          deliveryMethod: fulfillmentMethod,
          deliveryAddress: formattedDeliveryAddress,
          pickupLocation:
            fulfillmentMethod === "pickup"
              ? "Payent Verified Equipment Hub (Details shared after booking)"
              : "",
          customLocation:
            fulfillmentMethod === "custom" ? customLocation.trim() : "",
          locationDirections: locationDirections.trim(),
        },
      );

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setIsProcessing(false);
        setPaymentError(
          "Failed to load Razorpay Payment Gateway. Check your network connection.",
        );
        toast.error("Razorpay SDK failed to load.");
        return;
      }

      const currentUser = storage.get<{
        email?: string;
        fullName?: string;
        phone?: string;
      } | null>(STORAGE_KEYS.currentUser, null);

      const options = {
        key: orderRes.key_id,
        amount: orderRes.amount,
        currency: orderRes.currency || "INR",
        name: "Payent Tech Gear Rental",
        description: `Rental: ${product.title} (${orderRes.days || days} days)`,
        image: product.image,
        order_id: orderRes.razorpay_order_id,
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          setIsProcessing(false);
          setIsVerifying(true);
          toast.loading("Verifying payment security signature...", {
            id: "rzp-verify",
          });

          try {
            const verifyRes = await api.verifyRazorpayPayment(
              token,
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature,
            );

            setIsVerifying(false);
            toast.dismiss("rzp-verify");
            toast.success("Payment verified. Rental booking confirmed.");

            const confirmed: Order = {
              id: verifyRes.order_id || orderRes.order_id,
              productId: product.id,
              productTitle: product.title,
              productImage: product.image,
              startDate: start,
              endDate: end,
              total: Math.round(orderRes.total),
              status: "active",
              createdAt: new Date().toISOString(),
              deliveryMethod: fulfillmentMethod,
              deliveryAddress: formattedDeliveryAddress,
              deliveryAddressId: selectedAddress?.id || undefined,
              deliveryAddressSnapshot: selectedAddress || undefined,
              pickupLocation:
                fulfillmentMethod === "pickup"
                  ? "Payent Verified Equipment Hub"
                  : "",
              customLocation:
                fulfillmentMethod === "custom" ? customLocation.trim() : "",
              locationDirections: locationDirections.trim(),
            };

            api.invalidateCache("user_orders");
            const localOrders = storage.get<Order[]>(STORAGE_KEYS.orders, []);
            storage.set(STORAGE_KEYS.orders, [confirmed, ...localOrders]);
            window.dispatchEvent(new CustomEvent("payent_orders_updated"));

            setConfirmedOrder(confirmed);
            tracker.bookingCompleted(product.id, product.category);
            setOpen(true);
          } catch (verifyErr) {
            setIsVerifying(false);
            toast.dismiss("rzp-verify");
            const err = verifyErr as { message?: string };
            setPaymentError(
              err.message ||
                "Payment signature verification failed. Please contact support.",
            );
            toast.error("Payment verification failed.");
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            setIsVerifying(false);
            setPaymentError(
              "Payment window was closed before completing the transaction.",
            );
            toast.info("Payment window closed.");
          },
        },
        prefill: {
          name: selectedAddress?.full_name || currentUser?.fullName || "",
          email: currentUser?.email || "",
          contact: selectedAddress?.phone || currentUser?.phone || "",
        },
        notes: {
          product_id: product.id,
          booking_id: orderRes.order_id,
        },
        theme: {
          color: "#059669",
        },
      };

      const rzp = new (
        window as unknown as {
          Razorpay: new (opts: typeof options) => {
            open: () => void;
            on: (
              event: string,
              handler: (response: {
                error?: {
                  description?: string;
                  code?: string;
                  reason?: string;
                };
              }) => void,
            ) => void;
          };
        }
      ).Razorpay(options);

      rzp.on(
        "payment.failed",
        (response: {
          error?: { description?: string; code?: string; reason?: string };
        }) => {
          setIsProcessing(false);
          setIsVerifying(false);
          const description =
            response.error?.description || "Payment attempt failed.";
          setPaymentError(`Razorpay Payment Failed: ${description}`);
          toast.error(`Payment failed: ${description}`);
        },
      );

      rzp.open();
    } catch (err) {
      setIsProcessing(false);
      setIsVerifying(false);
      const error = err as { message?: string };
      setPaymentError(
        error.message || "Could not initiate payment. Please try again.",
      );
      toast.error(error.message || "Failed to create payment order.");
    }
  };

  // QR Countdown handler
  useEffect(() => {
    if (
      paymentMethod === "upi" &&
      upiType === "qr" &&
      qrActive &&
      qrCountdown > 0
    ) {
      qrTimerRef.current = setTimeout(() => {
        setQrCountdown((prev) => prev - 1);
      }, 1000);
    } else if (qrCountdown === 0) {
      toast.error("QR Code expired. Please generate a new one.");
      setQrActive(false);
    }
    return () => {
      if (qrTimerRef.current) clearTimeout(qrTimerRef.current);
    };
  }, [paymentMethod, upiType, qrCountdown, qrActive]);

  const handleGenerateQR = () => {
    setQrCountdown(120);
    setQrActive(true);
    toast.success("Payment QR Code generated!");
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 16);
    const matches = val.match(/\d{1,4}/g);
    setCardNumber(matches ? matches.join(" ") : val);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (val.length >= 2) {
      val = val.slice(0, 2) + "/" + val.slice(2);
    }
    setCardExpiry(val);
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 3);
    setCardCvv(val);
  };

  const handleVerifyUpi = () => {
    if (!upiId || !upiId.includes("@")) {
      toast.error("Please enter a valid UPI ID (e.g., name@okaxis)");
      return;
    }
    setUpiVerifying(true);
    setTimeout(() => {
      setUpiVerifying(false);
      setUpiVerified(true);
      toast.success(`UPI ID verified for ${user?.fullName || "Account Holder"}.`);
    }, 1200);
  };

  const cardBrand = useMemo(() => {
    const clean = cardNumber.replace(/\D/g, "");
    if (clean.startsWith("4")) return "Visa";
    if (clean.startsWith("5")) return "Mastercard";
    if (clean.startsWith("3")) return "American Express";
    return "Card";
  }, [cardNumber]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Loading & Error guards
  if (productLoading) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-neutral-400" />
          <p className="mt-4 text-neutral-500">Loading product details…</p>
        </div>
      </MainLayout>
    );
  }

  if (!product) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
          <h1 className="mt-4 text-2xl font-bold">Product not found</h1>
          <Button
            className="mt-6"
            onClick={() => navigate({ to: "/categories" })}
          >
            Browse marketplace
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <section className="mx-auto max-w-5xl px-4 md:px-6 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight font-display">
              Payrent Order Checkout
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Save your delivery address, review gear rental details, and confirm your order.
            </p>
          </div>

          {/* Stepper Progress */}
          <div className="flex items-center gap-2 bg-secondary/60 p-1.5 rounded-2xl border border-border/60 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveStep("address")}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                activeStep === "address"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="h-4 w-4 rounded-full bg-primary-foreground/20 flex items-center justify-center text-[10px]">
                1
              </span>
              <span>Delivery Address</span>
            </button>
            <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
            <button
              type="button"
              onClick={() => {
                if (!selectedAddress && fulfillmentMethod === "delivery") {
                  toast.error("Please save your delivery address first.");
                  return;
                }
                setActiveStep("review");
              }}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                activeStep === "review"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="h-4 w-4 rounded-full bg-primary-foreground/20 flex items-center justify-center text-[10px]">
                2
              </span>
              <span>Review Order</span>
            </button>
          </div>
        </div>

        <div className="mt-8 grid lg:grid-cols-[1fr_380px] gap-8">
          <div className="space-y-6">
            {/* STEP A: ADD / SELECT DELIVERY ADDRESS */}
            {activeStep === "address" && (
              <div className="spatial-card p-6 space-y-6" id="delivery-address-section">
                <div className="flex items-center justify-between border-b border-border/60 pb-4">
                  <div>
                    <h3 className="font-extrabold text-lg flex items-center gap-2">
                      <Truck className="h-5 w-5 text-primary shrink-0" />
                      <span>Step A: Delivery Address</span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Enter the address where the equipment should be delivered.
                    </p>
                  </div>

                  {savedAddresses.length > 0 && !showAddressForm && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setFullName(user?.fullName || "");
                        setPhone(user?.phone || "");
                        setFlatHouse("");
                        setStreetArea("");
                        setLandmark("");
                        setCity(user?.city || "");
                        setStateName(user?.state || "");
                        setPincode(user?.pincode || "");
                        setDeliveryInstructions("");
                        setShowAddressForm(true);
                      }}
                      className="text-xs font-bold gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add New Address</span>
                    </Button>
                  )}
                </div>

                {/* Saved addresses selector */}
                {savedAddresses.length > 0 && !showAddressForm && (
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Select From Saved Addresses
                    </label>
                    <div className="grid gap-3">
                      {savedAddresses.map((addr) => {
                        const isSelected = selectedAddressId === addr.id;
                        return (
                          <div
                            key={addr.id}
                            onClick={() => setSelectedAddressId(addr.id)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                              isSelected
                                ? "bg-emerald-500/10 border-emerald-500/40 shadow-xs"
                                : "bg-card border-border hover:border-border/80"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                                  <span>{addr.full_name || addr.fullName}</span>
                                  {(addr.is_default || addr.isDefault) && (
                                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                                      Default
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {addr.flat_house || addr.flatHouse},{" "}
                                  {addr.street_area || addr.streetArea}
                                  {addr.landmark ? `, Near ${addr.landmark}` : ""}
                                  <br />
                                  {addr.city}, {addr.state} - {addr.pincode || addr.pinCode}
                                </p>
                                <p className="text-xs font-mono font-semibold text-foreground/80 pt-0.5">
                                  Phone: {addr.phone}
                                </p>
                                {addr.delivery_instructions && (
                                  <p className="text-[11px] text-muted-foreground italic pt-0.5">
                                    Note: {addr.delivery_instructions}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditAddress(addr);
                                  }}
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                  title="Edit Address"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-4 flex items-center justify-between border-t border-border/60">
                      <span className="text-xs text-muted-foreground">
                        Selected: <span className="font-bold text-foreground">{selectedAddress?.full_name}</span>
                      </span>
                      <Button
                        type="button"
                        onClick={() => setActiveStep("review")}
                        className="font-bold text-xs gap-1.5"
                      >
                        <span>Review Order with Selected Address</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Address Form */}
                {(showAddressForm || savedAddresses.length === 0) && (
                  <form onSubmit={handleSaveAddress} className="space-y-4">
                    {/* Account Contact Information Summary */}
                    <div className="flex items-center justify-between text-xs bg-secondary/50 border border-border/70 rounded-xl px-3.5 py-2.5 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {user?.fullName || (user as any)?.name || "Recipient"}
                        </span>
                        {(user?.phone || phone) && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{user?.phone || phone}</span>
                          </>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        Linked from account
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Input
                          label="House / Flat / Block No. *"
                          placeholder="e.g. Flat 402, Sunrise Heights"
                          value={flatHouse}
                          onChange={(e) => {
                            setFlatHouse(e.target.value);
                            if (addressErrors.flatHouse) {
                              setAddressErrors((prev) => ({ ...prev, flatHouse: "" }));
                            }
                          }}
                          required
                        />
                        {addressErrors.flatHouse && (
                          <p className="text-[11px] text-destructive font-medium mt-1">
                            {addressErrors.flatHouse}
                          </p>
                        )}
                      </div>

                      <div>
                        <Input
                          label="Street / Area / Colony *"
                          placeholder="e.g. 100 Feet Road, Indiranagar"
                          value={streetArea}
                          onChange={(e) => {
                            setStreetArea(e.target.value);
                            if (addressErrors.streetArea) {
                              setAddressErrors((prev) => ({ ...prev, streetArea: "" }));
                            }
                          }}
                          required
                        />
                        {addressErrors.streetArea && (
                          <p className="text-[11px] text-destructive font-medium mt-1">
                            {addressErrors.streetArea}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <Input
                          label="Landmark (Optional)"
                          placeholder="e.g. Opposite Metro Station"
                          value={landmark}
                          onChange={(e) => setLandmark(e.target.value)}
                        />
                      </div>

                      <div>
                        <Input
                          label="City *"
                          placeholder="e.g. Bengaluru"
                          value={city}
                          onChange={(e) => {
                            setCity(e.target.value);
                            if (addressErrors.city) {
                              setAddressErrors((prev) => ({ ...prev, city: "" }));
                            }
                          }}
                          required
                        />
                        {addressErrors.city && (
                          <p className="text-[11px] text-destructive font-medium mt-1">
                            {addressErrors.city}
                          </p>
                        )}
                      </div>

                      <div>
                        <Input
                          label="State *"
                          placeholder="e.g. Karnataka"
                          value={stateName}
                          onChange={(e) => {
                            setStateName(e.target.value);
                            if (addressErrors.stateName) {
                              setAddressErrors((prev) => ({ ...prev, stateName: "" }));
                            }
                          }}
                          required
                        />
                        {addressErrors.stateName && (
                          <p className="text-[11px] text-destructive font-medium mt-1">
                            {addressErrors.stateName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Input
                          label="PIN Code (6 digits) *"
                          placeholder="e.g. 560038"
                          value={pincode}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                            setPincode(val);
                            if (addressErrors.pincode) {
                              setAddressErrors((prev) => ({ ...prev, pincode: "" }));
                            }
                          }}
                          required
                        />
                        {addressErrors.pincode && (
                          <p className="text-[11px] text-destructive font-medium mt-1">
                            {addressErrors.pincode}
                          </p>
                        )}
                      </div>

                      <div>
                        <Input
                          label="Delivery Instructions (Optional)"
                          placeholder="e.g. Call upon arrival, leave with security"
                          value={deliveryInstructions}
                          onChange={(e) => setDeliveryInstructions(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 border-t border-border flex items-center justify-between">
                      {savedAddresses.length > 0 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          id="back-to-review-btn"
                          onClick={() => {
                            setShowAddressForm(false);
                            setActiveStep("review");
                          }}
                          className="text-xs font-semibold gap-1.5"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                          <span>Back to Review</span>
                        </Button>
                      ) : (
                        <div />
                      )}

                      <Button
                        type="submit"
                        id="save-address-btn"
                        loading={isSavingAddress}
                        className="font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-6"
                      >
                        <Check className="h-4 w-4" />
                        <span>Save Address & Proceed to Review</span>
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* STEP B: REVIEW ORDER & CONFIRM ORDER */}
            {activeStep === "review" && (
              <div className="space-y-6" id="order-review-section">
                {/* 1. Saved Delivery Address Card */}
                <div className="spatial-card p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <h3 className="font-extrabold text-base flex items-center gap-2">
                      <Truck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Saved Delivery Address</span>
                    </h3>
                    <button
                      type="button"
                      id="edit-address-btn"
                      onClick={() => handleEditAddress()}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit Address</span>
                    </button>
                  </div>

                  {selectedAddress ? (
                    <div className="p-4 rounded-2xl bg-secondary/30 border border-border/70 space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-extrabold text-foreground text-sm">
                            {selectedAddress.full_name || selectedAddress.fullName}
                          </span>
                          <span className="text-muted-foreground ml-2 font-mono text-xs">
                            · {selectedAddress.phone}
                          </span>
                        </div>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                          ✓ Verified Saved Destination
                        </span>
                      </div>

                      <p className="text-muted-foreground leading-relaxed">
                        {selectedAddress.flat_house || selectedAddress.flatHouse},{" "}
                        {selectedAddress.street_area || selectedAddress.streetArea}
                        {selectedAddress.landmark ? `, Near ${selectedAddress.landmark}` : ""}
                        <br />
                        {selectedAddress.city}, {selectedAddress.state} -{" "}
                        <span className="font-mono font-bold text-foreground">
                          {selectedAddress.pincode || selectedAddress.pinCode}
                        </span>
                      </p>

                      {selectedAddress.delivery_instructions && (
                        <div className="pt-1.5 border-t border-border/40 text-xs text-muted-foreground">
                          <span className="font-bold text-foreground">Instructions:</span>{" "}
                          {selectedAddress.delivery_instructions}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 flex items-center justify-between">
                      <span>No delivery address selected. Please add an address.</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddressForm(true);
                          setActiveStep("address");
                        }}
                        className="font-bold underline cursor-pointer"
                      >
                        Add Address
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Product & Rental Schedule Card */}
                <div className="spatial-card p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <h3 className="font-extrabold text-base flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary shrink-0" />
                      <span>Product & Rental Schedule</span>
                    </h3>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Authoritative Dates Confirmed
                    </span>
                  </div>

                  <div className="flex gap-4 items-start">
                    <img
                      src={product.image}
                      alt={product.title}
                      className="h-20 w-20 rounded-2xl object-cover border border-border shrink-0 shadow-sm"
                    />
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="font-extrabold text-foreground text-sm truncate">
                        {product.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Category: <span className="font-semibold text-foreground">{product.category || "Gear"}</span> · Unit Rate:{" "}
                        <span className="font-bold text-foreground">₹{product.price}/day</span>
                      </div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold pt-0.5">
                        Duration: {days} Days ({days * 24} Elapsed Hours)
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <Input
                      type="date"
                      label="Rental Start Date"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                      min={todayIso}
                    />
                    <Input
                      type="date"
                      label="Rental Return Date"
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                      min={start}
                    />
                  </div>
                </div>

                {/* 3. Payment Method Card */}
                <div className="spatial-card p-6 space-y-4">
                  <h3 className="font-bold text-base">Payment Method Selection</h3>

                  <div className="grid grid-cols-2 gap-2 bg-secondary p-1 rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        paymentMethod === "card"
                          ? "bg-card text-foreground shadow-xs font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      <span>Credit / Debit Card</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("upi")}
                      className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        paymentMethod === "upi"
                          ? "bg-card text-foreground shadow-xs font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      <span>UPI Payment</span>
                    </button>
                  </div>

                  {paymentMethod === "card" && (
                    <div className="p-4 rounded-xl bg-secondary/30 border border-border/60 text-xs text-muted-foreground space-y-2">
                      <div className="flex items-center gap-2 font-bold text-foreground">
                        <Lock className="h-4 w-4 text-emerald-500" />
                        <span>Secured by Razorpay Payment Gateway</span>
                      </div>
                      <p>
                        Encrypted with PCI-DSS 256-bit security. Order will be confirmed upon payment authorization.
                      </p>
                    </div>
                  )}

                  {paymentMethod === "upi" && (
                    <div className="space-y-4 pt-2">
                      <div className="flex gap-4 border-b border-border pb-3 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setUpiType("id")}
                          className={`flex items-center gap-1.5 pb-2 transition-colors ${
                            upiType === "id"
                              ? "text-primary border-b-2 border-primary font-bold -mb-3"
                              : "text-muted-foreground"
                          }`}
                        >
                          <Smartphone className="h-3.5 w-3.5" /> UPI ID
                        </button>
                        <button
                          type="button"
                          onClick={() => setUpiType("qr")}
                          className={`flex items-center gap-1.5 pb-2 transition-colors ${
                            upiType === "qr"
                              ? "text-primary border-b-2 border-primary font-bold -mb-3"
                              : "text-muted-foreground"
                          }`}
                        >
                          <QrCode className="h-3.5 w-3.5" /> Dynamic QR
                        </button>
                      </div>

                      {upiType === "id" && (
                        <div className="space-y-3">
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <Input
                                label="UPI ID"
                                placeholder="name@okaxis"
                                value={upiId}
                                onChange={(e) => {
                                  setUpiId(e.target.value);
                                  setUpiVerified(false);
                                }}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleVerifyUpi}
                              loading={upiVerifying}
                              className="h-10 text-xs"
                              disabled={upiVerified}
                            >
                              {upiVerified ? "Verified" : "Verify ID"}
                            </Button>
                          </div>
                          {upiVerified && (
                            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                              <Check className="h-4 w-4" />
                              <span>Verified account associated with {user?.fullName || "Account Holder"}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {upiType === "qr" && (
                        <div className="flex flex-col items-center py-4 space-y-3 text-center">
                          {qrActive ? (
                            <>
                              <div className="p-3 bg-white rounded-xl border border-border shadow-xs">
                                <QrCode className="w-32 h-32 text-black" />
                              </div>
                              <div className="text-xs font-mono font-bold text-primary">
                                Expires in: {formatTime(qrCountdown)}
                              </div>
                            </>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={handleGenerateQR}
                              className="text-xs font-bold"
                            >
                              Generate Dynamic QR Code
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ASIDE: BOOKING SUMMARY, PRICE & CONFIRM ORDER BUTTON */}
          <aside className="spatial-float p-6 h-fit space-y-6 sticky top-24 shadow-xl">
            <div>
              <h3 className="font-extrabold text-base">Booking Summary</h3>
              <div className="mt-4 flex gap-3 items-center">
                <img
                  src={product.image}
                  alt={product.title}
                  className="h-14 w-14 rounded-xl object-cover border border-border shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs truncate">
                    {product.title}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    ₹{product.price}/day × {days} day(s)
                  </div>
                </div>
              </div>
            </div>

            {/* Calculations */}
            <div className="space-y-3 pt-4 border-t border-border text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <input
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  placeholder="Promo code (e.g. SAVE10)"
                  className="flex-1 h-9 px-3 rounded-xl border border-border bg-card text-xs focus:outline-none focus:border-primary"
                />
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => {
                    const isValid = coupon.trim().toUpperCase() === "SAVE10";
                    setApplied(isValid);
                    if (isValid) toast.success("10% promo code applied!");
                    else toast.error("Invalid promo code.");
                  }}
                  className="h-9 text-xs"
                >
                  Apply
                </Button>
              </div>

              {applied && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> 10% discount applied.
                </p>
              )}

              <div className="flex justify-between text-muted-foreground pt-1">
                <span>Rental Subtotal</span>
                <span className="font-semibold text-foreground">₹{subtotal.toFixed(2)}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Discount (10%)</span>
                  <span>-₹{discount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-muted-foreground">
                <span>Tax & Insurance (8%)</span>
                <span className="font-semibold text-foreground">₹{tax.toFixed(2)}</span>
              </div>

              <div className="flex justify-between pt-3 border-t border-border font-black text-base text-foreground">
                <span>Total Amount</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono text-xl">
                  ₹{total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Error & Processing States */}
            {paymentError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Submission Error</span>
                </div>
                <p>{paymentError}</p>
              </div>
            )}

            {categoryRestriction?.restricted && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold text-amber-300 block">Category Restriction</span>
                  {categoryRestriction.message}
                </div>
              </div>
            )}

            {kycStatus && kycStatus !== "APPROVED" && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3.5 text-xs text-red-200 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-red-300 block">Identity Verification Required</span>
                    Admin-approved KYC verification is required before initiating or submitting bookings.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/kyc" })}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer transition-all active:scale-95"
                >
                  {kycStatus === "NOT_STARTED" ? "Complete KYC" : "View KYC Status"}
                </button>
              </div>
            )}

            {/* PRIMARY ACTION BUTTON: Explicitly labelled "Confirm Order" */}
            <div className="space-y-2">
              <Button
                size="lg"
                id="confirm-order-btn"
                className="w-full font-black text-sm sm:text-base py-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-lg transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                onClick={handleConfirmOrder}
                loading={isProcessing || isVerifying}
                disabled={
                  isProcessing ||
                  isVerifying ||
                  categoryRestriction?.restricted ||
                  (kycStatus !== null && kycStatus !== "APPROVED") ||
                  (fulfillmentMethod === "delivery" && !selectedAddress)
                }
              >
                {isVerifying ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Verifying Security...
                  </span>
                ) : isProcessing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Confirming Order...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" /> Confirm Order (₹{total.toFixed(0)})
                  </span>
                )}
              </Button>

              {paymentMethod === "card" && (
                <button
                  type="button"
                  onClick={handlePayWithRazorpay}
                  disabled={isProcessing || isVerifying || categoryRestriction?.restricted}
                  className="w-full py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Pay with Razorpay Gateway</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 justify-center text-[10px] text-muted-foreground text-center">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Rental protected by Payent 256-bit security & OTP verification.</span>
            </div>
          </aside>
        </div>

        {/* Access Recommendation */}
        {upsellProducts.length > 0 && (
          <RecommendationSection
            title="Recommended Accessories"
            subtitle="Add compatible gear to complete your rental production"
            products={upsellProducts.slice(0, 4)}
            type="frequently_together"
            badge="Add-on"
            layout="compact"
            className="pt-8 mt-8 border-t border-border/80"
          />
        )}

        {/* Celebration & Booking Confirmed Modal */}
        <Modal
          open={open}
          onClose={() => {
            setOpen(false);
            navigate({ to: "/dashboard" });
          }}
          title="Booking Confirmed"
        >
          <div className="text-center py-4 relative overflow-hidden">
            {open && (
              <CelebrationFlourish
                productImage={product.image}
                productTitle={product.title}
              />
            )}
            <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/10 grid place-items-center relative z-10 border border-emerald-500/30">
              <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="mt-4 font-black text-2xl text-foreground font-display">
              Your Rental Order is Confirmed!
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground px-4 leading-relaxed">
              We've created your rental booking. A confirmation receipt has been dispatched.
              Delivery is now being scheduled to your saved address:
            </p>

            <div className="my-4 mx-4 p-3.5 rounded-xl bg-secondary/40 border border-border/80 text-xs text-left">
              <div className="font-bold text-foreground">
                Destination: {selectedAddress?.full_name || user?.fullName}
              </div>
              <div className="text-muted-foreground pt-0.5">
                {formattedDeliveryAddress}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              <Button
                id="view-dashboard-btn"
                className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  setOpen(false);
                  navigate({ to: "/dashboard" });
                }}
              >
                View Booking & Delivery Tracking
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setOpen(false);
                  navigate({ to: "/" });
                }}
              >
                Return to Marketplace
              </Button>
            </div>
          </div>
        </Modal>
      </section>
    </MainLayout>
  );
}
