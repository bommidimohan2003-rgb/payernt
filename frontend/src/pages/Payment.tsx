import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  ShieldCheck,
  Lock,
  Clock,
  Smartphone,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Info,
  CreditCard,
  Building,
} from "lucide-react";
import { MainLayout } from "@/layouts/MainLayout";
import { BackButton } from "@/components/common/BackButton";
import { Button } from "@/components/common/Button";
import { STORAGE_KEYS, storage } from "@/utils/storage";
import { api } from "@/utils/api";
import type { Order, Product } from "@/types";
import { toast } from "sonner";

interface PaymentSearch {
  id?: string;
  total?: number | string;
  start?: string;
  end?: string;
}

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

export default function Payment() {
  const search = useSearch({ from: "/payment" }) as PaymentSearch;
  const navigate = useNavigate();

  const productId = search.id || "";
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!productId) return;
    api
      .getProductById(productId)
      .then((found) => {
        if (isMounted && found) setProduct(found);
      })
      .catch(() => {
        api.getPublicProducts().then((all: Product[] | null) => {
          if (!isMounted || !all) return;
          const found = all.find((p: Product) => p.id === productId);
          if (found) setProduct(found);
        });
      });
    return () => {
      isMounted = false;
    };
  }, [productId]);

  const totalAmount = Number(search.total) || 0;
  const start = search.start || new Date().toISOString().slice(0, 10);
  const end =
    search.end ||
    new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);

  // States
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Timer Countdown Effect
  useEffect(() => {
    if (timeLeft <= 0) {
      toast.error("Transaction session expired. Please restart checkout.");
      navigate({ to: "/categories" });
      return;
    }
    const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, navigate]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleRazorpayCheckout = async (_appName?: string) => {
    if (!product) return;
    setPaymentError(null);
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);

    if (!token) {
      toast.error("Please log in to complete your payment.");
      navigate({ to: "/login" });
      return;
    }

    setIsProcessing(true);

    try {
      const orderRes = await api.createRazorpayOrder(
        token,
        product.id,
        start,
        end,
      );
      const loaded = await loadRazorpayScript();

      if (!loaded) {
        setIsProcessing(false);
        setPaymentError("Could not load Razorpay Payment Gateway script.");
        toast.error("Razorpay SDK failed to load.");
        return;
      }

      const user = storage.get<{
        email?: string;
        fullName?: string;
        phone?: string;
      } | null>(STORAGE_KEYS.currentUser, null);

      const options = {
        key: orderRes.key_id,
        amount: orderRes.amount,
        currency: orderRes.currency || "INR",
        name: "Payent Tech Gear Rental",
        description: `Rental: ${product.title}`,
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
            id: "pay-verify",
          });

          try {
            await api.verifyRazorpayPayment(
              token,
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature,
            );
            setIsVerifying(false);
            toast.dismiss("pay-verify");
            setPaySuccess(true);
            toast.success("Payment completed successfully.");

            setTimeout(() => {
              navigate({ to: "/orders" });
            }, 2000);
          } catch (err) {
            setIsVerifying(false);
            toast.dismiss("pay-verify");
            const error = err as { message?: string };
            setPaymentError(
              error.message || "Razorpay payment verification failed.",
            );
            toast.error("Verification failed.");
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            setIsVerifying(false);
            setPaymentError("Payment process was cancelled by user.");
            toast.info("Payment window closed.");
          },
        },
        prefill: {
          name: user?.fullName || "",
          email: user?.email || "",
          contact: user?.phone || "",
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
              handler: (resp: { error?: { description?: string } }) => void,
            ) => void;
          };
        }
      ).Razorpay(options);

      rzp.on("payment.failed", (resp: { error?: { description?: string } }) => {
        setIsProcessing(false);
        setIsVerifying(false);
        const desc = resp.error?.description || "Payment failed.";
        setPaymentError(`Payment failed: ${desc}`);
        toast.error(`Payment failed: ${desc}`);
      });

      rzp.open();
    } catch (err) {
      setIsProcessing(false);
      setIsVerifying(false);
      const error = err as { message?: string };
      setPaymentError(
        error.message || "Failed to initialize Razorpay checkout.",
      );
      toast.error("Failed to start payment.");
    }
  };

  const upiApps = [
    {
      id: "phonepe",
      name: "PhonePe",
      color: "bg-secondary hover:bg-secondary/80 border-border text-foreground",
      iconColor: "text-foreground",
      accentBg: "bg-primary text-primary-foreground",
      tagline: "Pay using saved cards or bank account on PhonePe",
    },
    {
      id: "gpay",
      name: "Google Pay",
      color: "bg-secondary hover:bg-secondary/80 border-border text-foreground",
      iconColor: "text-foreground",
      accentBg: "bg-primary text-primary-foreground",
      tagline: "Direct bank transfer using Google Pay secure account",
    },
    {
      id: "bhim",
      name: "BHIM UPI",
      color: "bg-secondary hover:bg-secondary/80 border-border text-foreground",
      iconColor: "text-foreground",
      accentBg: "bg-primary text-primary-foreground",
      tagline: "Unified Payments Interface of India official app",
    },
    {
      id: "paytm",
      name: "Paytm Wallet / UPI",
      color: "bg-secondary hover:bg-secondary/80 border-border text-foreground",
      iconColor: "text-foreground",
      accentBg: "bg-primary text-primary-foreground",
      tagline: "Fast Checkout using Paytm Balance or linked accounts",
    },
  ];

  if (!product) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <h2 className="mt-4 text-xl font-bold">Loading payment details...</h2>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <section className="mx-auto max-w-4xl px-4 md:px-6 py-10">
        <BackButton fallback={`/checkout`} label="Back to Checkout" className="mb-6" />

        <div className="grid lg:grid-cols-[1fr_340px] gap-8">
          {/* Left: Payment Gateway options */}
          <div className="space-y-6">
            <div className="card-premium p-6 border-primary/20 bg-gradient-to-b from-primary/5 via-card to-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">
                      Secure Payment Portal
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Powered by Payent Encrypted Gateways
                    </p>
                  </div>
                </div>
                {/* Timer */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 w-fit self-start sm:self-center">
                  <Clock className="h-4 w-4 animate-pulse" />
                  <span className="text-xs font-mono font-bold">
                    {formatTimer(timeLeft)}
                  </span>
                </div>
              </div>

              {/* UPI Options Header */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  UPI Applications
                </h3>

                {paymentError && (
                  <div className="mb-4 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                    <div className="font-semibold mb-1">Payment Notice</div>
                    <div>{paymentError}</div>
                  </div>
                )}

                <div className="grid gap-3.5">
                  {upiApps.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => handleRazorpayCheckout(app.name)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all duration-300 ${app.color} hover:translate-x-1 group shadow-sm`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`h-11 w-11 rounded-xl bg-card border border-border/40 grid place-items-center shadow-inner group-hover:scale-105 transition-transform ${app.iconColor}`}
                        >
                          <Smartphone className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-foreground group-hover:text-primary transition-colors">
                            {app.name}
                          </div>
                          <div className="text-xs text-muted-foreground/80 mt-0.5 max-w-[260px] sm:max-w-md truncate">
                            {app.tagline}
                          </div>
                        </div>
                      </div>
                      <div className="h-6 w-6 rounded-full bg-border/20 group-hover:bg-primary/20 grid place-items-center transition-colors">
                        <span className="text-xs text-muted-foreground group-hover:text-primary font-bold">
                          →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Alternative Fallback options */}
              <div className="mt-8 pt-6 border-t border-border/60">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Other payment options
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => handleRazorpayCheckout("Credit/Debit Card")}
                    className="flex items-center gap-3 p-3.5 rounded-xl border border-border/60 hover:bg-secondary text-left text-sm font-medium transition-colors"
                  >
                    <CreditCard className="h-4.5 w-4.5 text-muted-foreground" />
                    <div>
                      <div className="font-semibold text-foreground">Cards</div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Visa, Mastercard, RuPay
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleRazorpayCheckout("Net Banking")}
                    className="flex items-center gap-3 p-3.5 rounded-xl border border-border/60 hover:bg-secondary text-left text-sm font-medium transition-colors"
                  >
                    <Building className="h-4.5 w-4.5 text-muted-foreground" />
                    <div>
                      <div className="font-semibold text-foreground">
                        Net Banking
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        All major Indian banks
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-center text-[10px] text-muted-foreground mt-6 border-t border-border/40 pt-4">
                <Lock className="h-3.5 w-3.5 text-emerald-500" />
                Transactions encrypted using Razorpay 256-bit bank-grade PCI-DSS
                standards.
              </div>
            </div>
          </div>

          {/* Right: Booking Summary Sidebar */}
          <aside className="card-premium p-6 h-fit space-y-5">
            <div>
              <h3 className="font-bold text-lg">Order Summary</h3>
              <div className="mt-4 flex gap-3">
                <img
                  src={product.image}
                  alt=""
                  className="h-14 w-14 rounded-xl object-cover border border-border shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-bold truncate text-sm text-foreground">
                    {product.title}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Category: {product.category.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm pt-4 border-t border-border/60">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rental dates</span>
                <span className="font-medium text-right text-xs">
                  {start} to {end}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border/40 font-bold text-base">
                <span>To Pay</span>
                <span className="text-primary font-extrabold">
                  ₹{totalAmount.toFixed(0)}
                </span>
              </div>
            </div>

            <Button
              onClick={() => handleRazorpayCheckout()}
              loading={isProcessing || isVerifying}
              disabled={isProcessing || isVerifying}
              className="w-full font-bold"
            >
              {isVerifying
                ? "Verifying Payment..."
                : isProcessing
                  ? "Launching Razorpay..."
                  : "Pay with Razorpay"}
            </Button>
          </aside>
        </div>
      </section>

      {/* Processing Loader Modal */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
          <div className="w-full max-w-sm card-premium p-6 text-center space-y-6">
            <div className="relative h-16 w-16 mx-auto">
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
              <div className="absolute inset-0 grid place-items-center">
                <Smartphone className="h-6 w-6 text-primary animate-pulse" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">
                Waiting for payment confirmation
              </h3>
              <p className="text-xs text-muted-foreground mt-1.5 px-2">
                We've requested a secure checkout payment of{" "}
                <span className="font-bold text-foreground">
                  ₹{totalAmount.toFixed(0)}
                </span>{" "}
                on your{" "}
                <span className="font-semibold text-primary">
                  {selectedMethod}
                </span>{" "}
                mobile app. Please approve the request on your phone.
              </p>
            </div>

            <div className="bg-secondary/40 p-3 rounded-xl border border-border/40 flex items-start gap-2.5 text-[10px] text-muted-foreground text-left leading-relaxed">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                Do not refresh this page or close the tab. This simulated
                gateway will automatically prompt to complete the process.
              </div>
            </div>

            {/* Razorpay Launch Button */}
            <Button onClick={() => handleRazorpayCheckout()} className="w-full">
              Proceed to Razorpay Checkout
            </Button>
          </div>
        </div>
      )}

      {/* Success Success Overlay */}
      {paySuccess && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md grid place-items-center p-4">
          <div className="w-full max-w-sm text-center space-y-5 animate-in fade-in zoom-in-95 duration-300">
            <div className="h-20 w-20 mx-auto rounded-full bg-emerald-500/10 grid place-items-center border border-emerald-500/20">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 animate-bounce" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Payment Successful!
              </h2>
              <p className="text-sm text-white/70 mt-2 px-4">
                Thank you! Your transaction of ₹{totalAmount.toFixed(0)} was
                processed securely. Redirecting to your Orders...
              </p>
            </div>
            <div className="h-1 w-24 bg-border/20 mx-auto rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full animate-[loading-bar_2.2s_ease-out]"
                style={{ width: "100%" }}
              />
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
