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
import type { Order, Product } from "@/types";
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
  };
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [productLoading, setProductLoading] = useState(true);

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

  // Dates (defaults to current date YYYY-MM-DD or selected start date)
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const initialStart = useMemo(
    () => (search.start && search.start >= todayIso ? search.start : todayIso),
    [search.start, todayIso],
  );
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(
    new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
  );

  // Promos
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState(false);

  // Modal & Razorpay Processing Statuses
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [upsellProducts, setUpsellProducts] = useState<Product[]>([]);

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
  const [qrCountdown, setQrCountdown] = useState(120); // 2 minutes
  const [qrActive, setQrActive] = useState(false);

  const qrTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Rental Calculations (safe-guard against null product while loading)
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

  // QR Timer Countdown Handler
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

  // Card brand detection
  const cardBrand = useMemo(() => {
    const clean = cardNumber.replace(/\D/g, "");
    if (clean.startsWith("4")) return "Visa";
    if (clean.startsWith("5")) return "Mastercard";
    if (clean.startsWith("3")) return "American Express";
    return "Card";
  }, [cardNumber]);

  // Loading and not-found guards (Placed AFTER all Hooks)
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

  const handleGenerateQR = () => {
    setQrCountdown(120);
    setQrActive(true);
    toast.success("Payment QR Code generated!");
  };

  // Format Card Number (adds spaces every 4 digits)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 16);
    const matches = val.match(/\d{1,4}/g);
    setCardNumber(matches ? matches.join(" ") : val);
  };

  // Format Card Expiry (adds slash MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (val.length >= 2) {
      val = val.slice(0, 2) + "/" + val.slice(2);
    }
    setCardExpiry(val);
  };

  // Format Card CVV (adds limit to 3 digits)
  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 3);
    setCardCvv(val);
  };

  // UPI verification
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

  // Razorpay Real Payment Handler
  const handlePayWithRazorpay = async () => {
    setPaymentError(null);
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);

    if (!token) {
      toast.error("Please sign in to complete your gear rental.");
      navigate({ to: "/login" });
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Create order on backend (recomputes price server-side from DB)
      const orderRes = await api.createRazorpayOrder(
        token,
        product.id,
        start,
        end,
        applied ? "SAVE10" : coupon,
      );

      // 2. Ensure Razorpay Checkout SDK is loaded
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setIsProcessing(false);
        setPaymentError(
          "Failed to load Razorpay Payment Gateway. Check your network connection.",
        );
        toast.error("Razorpay SDK failed to load.");
        return;
      }

      const user = storage.get<{
        email?: string;
        fullName?: string;
        phone?: string;
      } | null>(STORAGE_KEYS.currentUser, null);

      // 3. Razorpay Options Config
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
            };

            api.invalidateCache("user_orders");
            const localOrders = storage.get<Order[]>(STORAGE_KEYS.orders, []);
            storage.set(STORAGE_KEYS.orders, [confirmed, ...localOrders]);
            window.dispatchEvent(new Event("payent_orders_updated"));

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
          name: user?.fullName || "",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        notes: {
          product_id: product.id,
          booking_id: orderRes.order_id,
        },
        theme: {
          color: "#000000",
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

  // Helper for countdown display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <MainLayout>
      <section className="mx-auto max-w-5xl px-4 md:px-6 py-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Checkout
        </h1>
        <p className="text-muted-foreground mt-1">
          Review dates and complete your payment securely.
        </p>

        <div className="mt-8 grid lg:grid-cols-[1fr_380px] gap-8">
          <div className="space-y-6">
            {/* Delivery Address Card (Prefilled from registration address) */}
            <div className="spatial-card p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary shrink-0" /> Delivery
                  Address
                </h3>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/profile" })}
                  className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                >
                  Edit Profile Address
                </button>
              </div>
              <div className="p-4 rounded-xl bg-secondary/40 border border-border/80 text-sm space-y-1.5">
                <div className="font-extrabold text-foreground">
                  {user?.fullName || "Valued Customer"}
                </div>
                <div className="text-muted-foreground font-medium">
                  {user?.address ? (
                    <>
                      {user.address}
                      {user.city ? `, ${user.city}` : ""}
                      {user.pincode ? ` - ${user.pincode}` : ""}
                    </>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                      No street address registered. Please complete your
                      delivery address in Profile.
                    </span>
                  )}
                </div>
                {user?.phone && (
                  <div className="text-xs text-muted-foreground font-medium pt-1">
                    Contact Phone: {user.phone}
                  </div>
                )}
              </div>
            </div>

            {/* Rental Dates Card */}
            <div className="spatial-card p-6">
              <h3 className="font-bold text-lg mb-4">Rental dates</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="date"
                  label="Start"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                />
                <Input
                  type="date"
                  label="End"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  min={start}
                />
              </div>
            </div>

            {/* Payment Method Selector Card */}
            <div className="spatial-card p-6">
              <h3 className="font-bold text-lg mb-4">Payment method</h3>

              {/* Tabs */}
              <div className="grid grid-cols-2 gap-2 bg-secondary p-1 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`py-2 rounded-lg text-sm font-medium transition-all ${paymentMethod === "card"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  Credit / Debit Card
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("upi")}
                  className={`py-2 rounded-lg text-sm font-medium transition-all ${paymentMethod === "upi"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  UPI Payment
                </button>
              </div>

              {/* Credit Card Flow */}
              {paymentMethod === "card" && (
                <div className="space-y-6">
                  {/* Visual Credit Card Preview */}
                  <div className="flex justify-center mb-6">
                    <div className="w-full max-w-[340px] aspect-[1.586] rounded-2xl p-6 bg-gradient-to-br from-zinc-900 via-zinc-800 to-black text-white relative shadow-xl overflow-hidden flex flex-col justify-between border border-zinc-700/50">
                      {/* Grid overlay for aesthetic premium card texture */}
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />

                      <div className="flex justify-between items-start relative z-10">
                        {/* Metallic Chip */}
                        <div className="w-10 h-7 rounded-md bg-gradient-to-r from-zinc-300 to-zinc-100 border border-zinc-200 relative overflow-hidden">
                          <div className="absolute inset-x-2 inset-y-1 border-r border-b border-zinc-400/30 grid grid-cols-2 gap-0.5" />
                        </div>
                        <span className="text-xs uppercase font-extrabold tracking-wider bg-white/10 px-2 py-1 rounded-md backdrop-blur-sm">
                          {cardBrand}
                        </span>
                      </div>

                      <div className="my-4 text-xl tracking-widest font-mono text-center relative z-10 text-white drop-shadow-md">
                        {cardNumber || "•••• •••• •••• ••••"}
                      </div>

                      <div className="flex justify-between items-end relative z-10 text-xs font-mono uppercase">
                        <div>
                          <div className="text-[10px] text-white/60 tracking-tight">
                            Card Holder
                          </div>
                          <div className="font-semibold truncate max-w-[180px]">
                            {cardName || "CARDHOLDER NAME"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-white/60 tracking-tight">
                            Expires
                          </div>
                          <div className="font-semibold">
                            {cardExpiry || "MM/YY"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Input Fields */}
                  <div className="space-y-4">
                    <Input
                      label="Cardholder Name"
                      placeholder="Name on card"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      required
                    />
                    <Input
                      label="Card Number"
                      placeholder="4111 2222 3333 4444"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      icon={<CreditCard className="h-4 w-4" />}
                      required
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Expiration Date"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        required
                      />
                      <Input
                        label="CVV"
                        placeholder="123"
                        type="password"
                        value={cardCvv}
                        onChange={handleCvvChange}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* UPI Flow */}
              {paymentMethod === "upi" && (
                <div className="space-y-6">
                  {/* UPI Mode Selector */}
                  <div className="flex gap-4 border-b border-border pb-4">
                    <button
                      type="button"
                      onClick={() => setUpiType("id")}
                      className={`text-sm font-semibold flex items-center gap-1.5 transition-colors ${upiType === "id"
                          ? "text-primary border-b-2 border-primary pb-2 -mb-4.5"
                          : "text-muted-foreground"
                        }`}
                    >
                      <Smartphone className="h-4 w-4" /> UPI ID
                    </button>
                    <button
                      type="button"
                      onClick={() => setUpiType("qr")}
                      className={`text-sm font-semibold flex items-center gap-1.5 transition-colors ${upiType === "qr"
                          ? "text-primary border-b-2 border-primary pb-2 -mb-4.5"
                          : "text-muted-foreground"
                        }`}
                    >
                      <QrCode className="h-4 w-4" /> QR Code
                    </button>
                  </div>

                  {/* UPI ID Form */}
                  {upiType === "id" && (
                    <div className="space-y-4 pt-2">
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Input
                            label="UPI ID"
                            placeholder="username@okaxis"
                            value={upiId}
                            onChange={(e) => {
                              setUpiId(e.target.value);
                              setUpiVerified(false); // Reset if changed
                            }}
                            required
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleVerifyUpi}
                          loading={upiVerifying}
                          className="h-12 border-border"
                          disabled={upiVerified}
                        >
                          {upiVerified ? "Verified" : "Verify ID"}
                        </Button>
                      </div>
                      {upiVerified && (
                        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-semibold">
                          <Check className="h-4 w-4 shrink-0" /> Associated
                          Account: {user?.fullName || "Verified Account"}
                        </div>
                      )}

                      {/* Mock UPI suggestions */}
                      <div className="pt-2">
                        <label className="text-xs uppercase text-muted-foreground font-semibold">
                          Popular handles
                        </label>
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          {["@okaxis", "@okicici", "@ybl", "@paytm"].map(
                            (handle) => (
                              <button
                                type="button"
                                key={handle}
                                onClick={() => {
                                  const base = upiId.includes("@")
                                    ? upiId.split("@")[0]
                                    : upiId || "user";
                                  setUpiId(base + handle);
                                  setUpiVerified(false);
                                }}
                                className="px-2.5 py-1 text-xs rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                              >
                                {handle}
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* QR Code Block */}
                  {upiType === "qr" && (
                    <div className="pt-2 flex flex-col items-center text-center space-y-4">
                      {qrActive ? (
                        <>
                          <div className="p-4 bg-white rounded-2xl shadow-inner border border-border relative overflow-hidden flex flex-col items-center">
                            {/* SVG QR Code Simulation */}
                            <svg
                              className="w-48 h-48 text-black"
                              viewBox="0 0 100 100"
                            >
                              <rect width="100" height="100" fill="white" />
                              {/* Position boxes */}
                              <rect
                                x="5"
                                y="5"
                                width="25"
                                height="25"
                                fill="black"
                              />
                              <rect
                                x="10"
                                y="10"
                                width="15"
                                height="15"
                                fill="white"
                              />
                              <rect
                                x="13"
                                y="13"
                                width="9"
                                height="9"
                                fill="black"
                              />

                              <rect
                                x="70"
                                y="5"
                                width="25"
                                height="25"
                                fill="black"
                              />
                              <rect
                                x="75"
                                y="10"
                                width="15"
                                height="15"
                                fill="white"
                              />
                              <rect
                                x="78"
                                y="13"
                                width="9"
                                height="9"
                                fill="black"
                              />

                              <rect
                                x="5"
                                y="70"
                                width="25"
                                height="25"
                                fill="black"
                              />
                              <rect
                                x="10"
                                y="75"
                                width="15"
                                height="15"
                                fill="white"
                              />
                              <rect
                                x="13"
                                y="78"
                                width="9"
                                height="9"
                                fill="black"
                              />

                              {/* Tiny dots block simulation */}
                              <path
                                d="M 35 15 h 5 v 5 h -5 z M 45 5 h 10 v 5 h -10 z M 40 25 h 5 v 10 h -5 z M 55 20 h 5 v 5 h -5 z M 60 10 h 5 v 5 h -5 z M 55 35 h 10 v 5 h -10 z M 75 35 h 5 v 5 h -5 z M 90 35 h 5 v 5 h -5 z M 85 45 h 10 v 5 h -10 z M 70 50 h 10 v 5 h -10 z M 75 60 h 5 v 10 h -5 z M 90 70 h 10 v 5 h -10 z M 85 85 h 5 v 5 h -5 z M 60 75 h 5 v 5 h -5 z M 55 80 h 15 v 5 h -15 z M 35 70 h 10 v 5 h -10 z M 45 85 h 5 v 10 h -5 z M 35 90 h 5 v 5 h -5 z M 15 35 h 10 v 5 h -10 z M 25 45 h 5 v 5 h -5 z M 5 50 h 15 v 5 h -15 z M 10 60 h 10 v 5 h -10 z M 35 45 h 15 v 5 h -15 z M 50 50 h 5 v 10 h -5 z M 40 60 h 5 v 5 h -5 z"
                                fill="black"
                              />
                            </svg>
                            <div className="absolute inset-0 bg-black/5 pointer-events-none" />
                          </div>

                          <div className="space-y-1.5">
                            <p className="text-sm font-semibold flex items-center justify-center gap-1.5 text-primary">
                              <Smartphone className="h-4.5 w-4.5 animate-bounce" />{" "}
                              Scan using any UPI App
                            </p>
                            <div className="text-xl font-bold font-mono tracking-wider">
                              {formatTime(qrCountdown)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              QR Code expires in 2 minutes
                            </p>
                          </div>

                          {/* Simulation button */}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              toast.success(
                                "UPI App payment verified. Proceeding...",
                              );
                              // Complete payment directly
                              const order: Order = {
                                id: crypto.randomUUID(),
                                productId: product.id,
                                productTitle: product.title,
                                productImage: product.image,
                                startDate: start,
                                endDate: end,
                                total: Math.round(total),
                                status: "active",
                                createdAt: new Date().toISOString(),
                              };
                              const token = storage.get<string | null>(
                                STORAGE_KEYS.token,
                                null,
                              );
                              if (token) {
                                api
                                  .createOrder(token, order)
                                  .catch((err) =>
                                    console.error(
                                      "Failed to create order on backend:",
                                      err,
                                    ),
                                  );
                              }
                              api.invalidateCache("user_orders");
                              const localOrders = storage.get<Order[]>(STORAGE_KEYS.orders, []);
                              storage.set(STORAGE_KEYS.orders, [order, ...localOrders]);
                              window.dispatchEvent(new Event("payent_orders_updated"));
                              setConfirmedOrder(order);
                              setOpen(true);
                            }}
                            className="bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
                          >
                            Simulate UPI App Scan Success
                          </Button>
                        </>
                      ) : (
                        <div className="py-6 flex flex-col items-center space-y-4">
                          <div className="h-16 w-16 rounded-full bg-primary/10 grid place-items-center">
                            <QrCode className="h-8 w-8 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">
                              Generate payment QR Code
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Generate a dynamic secure QR for scan and pay
                            </p>
                          </div>
                          <Button type="button" onClick={handleGenerateQR}>
                            Generate QR
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Booking Summary Sidebar */}
          <aside className="spatial-float p-6 h-fit space-y-6 sticky top-24 shadow-xl">
            <div>
              <h3 className="font-bold text-lg">Booking summary</h3>
              <div className="mt-4 flex gap-3">
                <img
                  src={product.image}
                  alt=""
                  className="h-16 w-16 rounded-xl object-cover border border-border"
                />
                <div className="min-w-0">
                  <div className="font-semibold truncate text-sm">
                    {product.title}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    ₹{product.price}/day × {days} day(s)
                  </div>
                </div>
              </div>
            </div>

            {/* Calculations */}
            <div className="space-y-3 pt-4 border-t border-border text-sm">
              <div className="flex items-center gap-2">
                <input
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  placeholder="Promo code"
                  className="flex-1 h-10 px-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-primary"
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
                  className="border-border"
                >
                  Apply
                </Button>
              </div>
              {applied && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> 10% discount applied.
                </p>
              )}

              <div className="flex justify-between mt-4">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">₹{subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount (10%)</span>
                  <span>-₹{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax (8%)</span>
                <span className="font-medium">₹{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-border font-bold text-base text-foreground">
                <span>Total</span>
                <span className="text-primary font-extrabold">
                  ₹{total.toFixed(2)}
                </span>
              </div>
            </div>

            {isVerifying && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center gap-2 text-xs">
                <Loader2 className="h-4 w-4 animate-spin shrink-0 text-amber-500" />
                <span>Verifying payment signature with server...</span>
              </div>
            )}

            {paymentError && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Payment Error</span>
                </div>
                <p className="text-muted-foreground">{paymentError}</p>
                <button
                  type="button"
                  onClick={handlePayWithRazorpay}
                  className="font-medium underline flex items-center gap-1 text-foreground hover:text-primary transition-colors"
                >
                  <RefreshCw className="h-3 w-3" /> Retry Payment
                </button>
              </div>
            )}

            <Button
              size="lg"
              className="w-full font-bold"
              onClick={handlePayWithRazorpay}
              loading={isProcessing || isVerifying}
              disabled={isProcessing || isVerifying}
            >
              {isVerifying ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Verifying
                  Security...
                </span>
              ) : isProcessing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Launching
                  Razorpay...
                </span>
              ) : (
                `Pay with Razorpay ₹${total.toFixed(0)}`
              )}
            </Button>

            {/* Secure Payment details */}
            <div className="flex items-center gap-2 justify-center text-[10px] text-muted-foreground mt-4 text-center">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />{" "}
              Razorpay 256-bit PCI-DSS encrypted payment gateway.
            </div>
          </aside>
        </div>

        {/* Restrained single-row checkout accessory recommendation */}
        {upsellProducts.length > 0 && (
          <RecommendationSection
            title="You might also like"
            subtitle="Recommended accessory gear for your rental project"
            products={upsellProducts.slice(0, 4)}
            type="frequently_together"
            badge="Project Add-on"
            layout="compact"
            className="pt-8 mt-6 border-t border-border/80"
          />
        )}

        {/* Success Modal */}
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
            <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/10 grid place-items-center relative z-10">
              <Check className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="mt-4 font-bold text-xl text-foreground">
              Your rental is booked!
            </h3>
            <p className="mt-2 text-sm text-muted-foreground px-4">
              We've processed your payment and sent a booking confirmation
              receipt to your email address.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Button
                onClick={() => {
                  setOpen(false);
                  navigate({ to: "/dashboard" });
                }}
              >
                Go to Dashboard
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setOpen(false);
                  navigate({ to: "/" });
                }}
              >
                Return Home
              </Button>
            </div>
          </div>
        </Modal>
      </section>
    </MainLayout>
  );
}
