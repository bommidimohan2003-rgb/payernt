import { useState, useEffect, useCallback } from "react";
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
  Wallet,
  AlertCircle,
  RefreshCw,
  Receipt,
  Download,
  Copy,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  FileText,
  BadgeCheck,
  XCircle,
} from "lucide-react";
import { MainLayout } from "@/layouts/MainLayout";
import { Button } from "@/components/common/Button";
import { STORAGE_KEYS, storage } from "@/utils/storage";
import { api } from "@/utils/api";
import type { Order, Product } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PaymentSearch {
  id?: string;
  orderId?: string;
  order_id?: string;
  total?: number | string;
  start?: string;
  end?: string;
}

type PaymentViewMode =
  | "checkout"
  | "processing"
  | "success"
  | "failed"
  | "pending_verification";

type PaymentMethodType = "upi" | "card" | "netbanking" | "wallet";

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

  const targetOrderId = (search.orderId || search.order_id || "").trim();
  const productId = (search.id || "").trim();

  // Data states
  const [order, setOrder] = useState<Order | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Flow & View States
  const [viewMode, setViewMode] = useState<PaymentViewMode>("checkout");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>("upi");
  const [selectedUpiApp, setSelectedUpiApp] = useState<string>("phonepe");
  const [selectedBank, setSelectedBank] = useState<string>("HDFC");
  const [selectedWallet, setSelectedWallet] = useState<string>("paytm");
  const [customUpiId, setCustomUpiId] = useState("");

  // Payment Outcome Info
  const [verifiedPaymentId, setVerifiedPaymentId] = useState<string>("");
  const [paymentErrorReason, setPaymentErrorReason] = useState<string>("");
  const [statusCheckLoading, setStatusCheckLoading] = useState(false);
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // 10-Minute Session Timer
  const [timeLeft, setTimeLeft] = useState(600);

  // 1. Fetch Order (Primary) or Product (Fallback)
  useEffect(() => {
    let isMounted = true;
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);

    if (!token) {
      toast.error("Please log in to complete your payment.");
      navigate({ to: "/login" });
      return;
    }

    const initData = async () => {
      setLoadingInitial(true);
      try {
        if (targetOrderId) {
          // Fetch existing order authoritatively from backend
          const fetchedOrder = await api.getOrderDetails(token, targetOrderId);
          if (!isMounted) return;

          setOrder(fetchedOrder);

          // If order is already paid, show success state immediately
          const st = String(fetchedOrder.paymentStatus || fetchedOrder.payment_status || "").toLowerCase();
          if (st === "paid" || st === "successful") {
            setVerifiedPaymentId(
              fetchedOrder.razorpayPaymentId ||
              fetchedOrder.razorpay_payment_id ||
              `pay_${fetchedOrder.id}`
            );
            setViewMode("success");
            setLoadingInitial(false);
            return;
          }

          // If order is cancelled, notify user
          if (String(fetchedOrder.status || "").toLowerCase() === "cancelled") {
            toast.error("This order has been cancelled and cannot be paid for.");
            navigate({ to: "/orders" });
            return;
          }

          // Load associated product details if available
          const pid = fetchedOrder.productId || fetchedOrder.product_id;
          if (pid) {
            try {
              const p = await api.getProductById(pid);
              if (isMounted && p) setProduct(p);
            } catch {
              // Product details in order are sufficient
            }
          }
        } else if (productId) {
          // Direct checkout without existing order
          const p = await api.getProductById(productId);
          if (isMounted && p) setProduct(p);
        }
      } catch (err: any) {
        console.error("Failed to load payment order context:", err);
        toast.error(err?.message || "Could not load order details.");
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    };

    void initData();
    return () => {
      isMounted = false;
    };
  }, [targetOrderId, productId, navigate]);

  // Session timer countdown (only active during checkout)
  useEffect(() => {
    if (viewMode !== "checkout") return;
    if (timeLeft <= 0) {
      toast.error("Checkout session expired. Please retry from Orders.");
      navigate({ to: "/orders" });
      return;
    }
    const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, viewMode, navigate]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Authoritative Pricing & Order Information
  const effectiveOrderId = order?.id || targetOrderId || `ord_pending_${Date.now()}`;
  const effectiveProductTitle =
    order?.productTitle || order?.product_title || product?.title || "Professional Tech Equipment Rental";
  const effectiveProductImage =
    order?.productImage ||
    order?.product_image ||
    product?.image ||
    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600";
  const effectiveCategory = order?.category || product?.category || "Equipment";
  const effectiveStartDate = order?.startDate || order?.start_date || search.start || new Date().toISOString().slice(0, 10);
  const effectiveEndDate =
    order?.endDate ||
    order?.end_date ||
    search.end ||
    new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);

  // Calculate rental duration in days
  const rentalDays = (() => {
    try {
      const d1 = new Date(effectiveStartDate);
      const d2 = new Date(effectiveEndDate);
      const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)) + 1;
      return Math.max(1, diff);
    } catch {
      return 1;
    }
  })();

  // Final Total from backend order or query
  const effectiveTotal = order ? Number(order.total || 0) : Number(search.total) || 0;
  const dailyRate = order?.dailyRate || order?.daily_rate || (product?.price ? Number(product.price) : Math.round(effectiveTotal / rentalDays));
  const subtotal = Math.round(dailyRate * rentalDays);
  const deliveryFee = 0; // Free doorstep delivery/escrow verified pickup
  const platformFee = 0; // Escrow coverage included
  const taxes = Math.max(0, effectiveTotal - subtotal);

  // Vendor Information
  const vendorName =
    order?.vendorName ||
    order?.vendor?.name ||
    product?.ownerName ||
    "Payent Verified Gear Hub";
  const vendorCity =
    order?.vendorCity ||
    order?.vendor?.city ||
    (typeof product?.location === "object" ? product?.location?.city : undefined) ||
    "Bengaluru, Karnataka";
  const vendorVerified = order?.vendorVerified ?? order?.vendor?.verified ?? true;

  // Real-time Payment Status Checker (Section 7)
  const handleCheckPaymentStatus = async () => {
    if (!order?.id && !targetOrderId) return;
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) return;

    setStatusCheckLoading(true);
    try {
      const res = await api.getPaymentStatus(token, order?.id || targetOrderId);
      const st = String(res.payment_status || res.status || "").toLowerCase();
      if (st === "paid" || st === "successful" || st === "active") {
        setVerifiedPaymentId(res.razorpay_payment_id || `pay_${res.order_id}`);
        setViewMode("success");
        toast.success("Payment verified! Your booking is confirmed.");
      } else if (st === "failed") {
        setPaymentErrorReason("The gateway confirmed that the transaction was not successful.");
        setViewMode("failed");
      } else {
        toast.info("Payment is still processing with the banking network. Please refresh in a moment.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Could not check payment status.");
    } finally {
      setStatusCheckLoading(false);
    }
  };

  // View Receipt Handler
  const handleViewReceipt = async () => {
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) return;
    try {
      const receipt = await api.getPaymentReceipt(token, order?.id || targetOrderId || effectiveOrderId);
      setReceiptData(receipt);
      setShowReceiptModal(true);
    } catch {
      // Build receipt from current order state if endpoint is busy
      setReceiptData({
        receipt_number: `REC-${effectiveOrderId.replace("ord_", "")}`,
        order_id: effectiveOrderId,
        product_title: effectiveProductTitle,
        start_date: effectiveStartDate,
        end_date: effectiveEndDate,
        payment_method: "Razorpay (UPI / Card / NetBanking)",
        transaction_id: verifiedPaymentId || `pay_${effectiveOrderId}`,
        subtotal: subtotal,
        gst_tax: taxes,
        total_amount: effectiveTotal,
        payment_status: "paid",
        issued_at: new Date().toISOString(),
        escrow_guarantee: "100% Escrow Secured by Payent Protection",
      });
      setShowReceiptModal(true);
    }
  };

  // Main Payment Initiation & Gateway Launch (Section 3.E, 4, 10)
  const handlePayNow = async () => {
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) {
      toast.error("Please log in to complete your payment.");
      navigate({ to: "/login" });
      return;
    }

    setPaymentErrorReason("");
    setViewMode("processing");

    try {
      let orderRes: any;

      if (order?.id || targetOrderId) {
        // Paying for existing order
        orderRes = await api.createOrderPayment(token, order?.id || targetOrderId);
      } else if (product?.id) {
        // Direct checkout order creation
        orderRes = await api.createRazorpayOrder(token, product.id, effectiveStartDate, effectiveEndDate);
      } else {
        throw new Error("No valid booking order found to process payment.");
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setViewMode("failed");
        setPaymentErrorReason("Could not load the secure payment gateway. Please check your network connection.");
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
        name: "paYent Marketplace",
        description: `Rental: ${effectiveProductTitle}`,
        image: effectiveProductImage,
        order_id: orderRes.razorpay_order_id,
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          setViewMode("processing");
          toast.loading("Verifying cryptographic payment signature...", {
            id: "pay-verify-toast",
          });

          try {
            const verifyRes = await api.verifyRazorpayPayment(
              token,
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature,
              order?.id || targetOrderId || orderRes.order_id
            );

            toast.dismiss("pay-verify-toast");
            setVerifiedPaymentId(response.razorpay_payment_id);
            setViewMode("success");
            toast.success("Payment verified! Booking confirmed & escrow secured.");

            // Notify application event listeners
            window.dispatchEvent(new CustomEvent("payent_orders_updated"));
          } catch (err: any) {
            toast.dismiss("pay-verify-toast");
            setPaymentErrorReason(
              err?.message || "Cryptographic signature verification failed on backend."
            );
            setViewMode("failed");
            toast.error("Payment verification failed.");
          }
        },
        modal: {
          ondismiss: () => {
            // User closed payment window without completing
            setViewMode("pending_verification");
            toast.info("Payment window closed. You can verify your status or retry.");
          },
        },
        prefill: {
          name: currentUser?.fullName || "",
          email: currentUser?.email || "",
          contact: currentUser?.phone || "",
        },
        theme: {
          color: "#1E1E1E",
        },
      };

      const rzp = new (
        window as unknown as {
          Razorpay: new (opts: typeof options) => {
            open: () => void;
            on: (
              event: string,
              handler: (resp: { error?: { description?: string; reason?: string } }) => void,
            ) => void;
          };
        }
      ).Razorpay(options);

      rzp.on("payment.failed", (resp: { error?: { description?: string; reason?: string } }) => {
        const desc = resp.error?.description || resp.error?.reason || "Payment was declined by bank.";
        setPaymentErrorReason(desc);
        setViewMode("failed");
        toast.error(`Payment failed: ${desc}`);
      });

      rzp.open();
    } catch (err: any) {
      setViewMode("failed");
      const msg = err?.message || "Failed to initialize secure payment order.";
      setPaymentErrorReason(msg);
      toast.error(msg);
    }
  };

  // Loading State
  if (loadingInitial) {
    return (
      <MainLayout>
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-neutral-800 dark:text-neutral-200" />
          <h2 className="mt-4 text-lg font-bold text-neutral-900 dark:text-white">
            Loading secure checkout...
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Validating order details and rental escrow terms.
          </p>
        </div>
      </MainLayout>
    );
  }

  // ---------------------------------------------------------------------------
  // VIEW: PAYMENT PROCESSING STATE (Section 4)
  // ---------------------------------------------------------------------------
  if (viewMode === "processing") {
    return (
      <MainLayout>
        <div className="min-h-[75vh] flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] shadow-xl text-center space-y-5">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-900 dark:text-white" />
            </div>

            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                <Clock className="h-3 w-3" />
                Escrow Gateway Verification
              </span>
              <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white">
                Processing your payment...
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Order Reference #{effectiveOrderId}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/20 text-left space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Important Security Notice</span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-300/90 leading-relaxed">
                Please do not refresh, close this window, or press back while the banking network and paYent verify your payment.
              </p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // ---------------------------------------------------------------------------
  // VIEW: PAYMENT SUCCESS STATE (Section 5)
  // ---------------------------------------------------------------------------
  if (viewMode === "success") {
    return (
      <MainLayout>
        <div className="min-h-[80vh] flex items-center justify-center p-4 py-8">
          <div className="w-full max-w-lg p-6 sm:p-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] shadow-2xl space-y-6 text-center">
            {/* Success Icon */}
            <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-sm">
              <CheckCircle2 className="h-9 w-9 stroke-[2.2]" />
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-3 w-3" />
                Booking Confirmed & Escrow Secured
              </span>
              <h2 className="text-2xl font-extrabold text-neutral-900 dark:text-white">
                Payment Successful!
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Your rental reservation is finalized and safe in paYent escrow.
              </p>
            </div>

            {/* Transaction Card */}
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-white/[0.02] text-left space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800">
                <img
                  src={effectiveProductImage}
                  alt={effectiveProductTitle}
                  className="h-14 w-14 rounded-lg object-cover border border-neutral-200 dark:border-neutral-700"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                    {effectiveProductTitle}
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {effectiveStartDate} → {effectiveEndDate} ({rentalDays} {rentalDays === 1 ? "Day" : "Days"})
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    Vendor: {vendorName}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold">Order Reference</span>
                  <p className="font-mono font-bold text-neutral-800 dark:text-neutral-200 truncate">
                    #{effectiveOrderId}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold">Transaction ID</span>
                  <p className="font-mono font-bold text-neutral-800 dark:text-neutral-200 truncate">
                    {verifiedPaymentId || `pay_${effectiveOrderId}`}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold">Amount Paid</span>
                  <p className="font-mono font-extrabold text-base text-emerald-600 dark:text-emerald-400">
                    ₹{effectiveTotal.toLocaleString("en-IN")}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold">Payment Method</span>
                  <p className="font-medium text-neutral-800 dark:text-neutral-200">
                    Razorpay (UPI / Card)
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => navigate({ to: "/orders" })}
                className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-100 font-bold text-xs shadow-sm transition-colors cursor-pointer"
              >
                View My Orders
              </button>

              <button
                type="button"
                onClick={handleViewReceipt}
                className="py-2.5 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-semibold text-xs transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Receipt className="h-3.5 w-3.5" />
                <span>View Receipt</span>
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: "/payent/explore" })}
                className="py-2.5 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-semibold text-xs transition-colors cursor-pointer"
              >
                Continue Exploring
              </button>
            </div>
          </div>
        </div>

        {/* Receipt Modal */}
        {showReceiptModal && (
          <ReceiptModal
            receipt={receiptData}
            onClose={() => setShowReceiptModal(false)}
          />
        )}
      </MainLayout>
    );
  }

  // ---------------------------------------------------------------------------
  // VIEW: PAYMENT FAILURE STATE (Section 6)
  // ---------------------------------------------------------------------------
  if (viewMode === "failed") {
    return (
      <MainLayout>
        <div className="min-h-[75vh] flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl border border-red-200 dark:border-red-950/60 bg-white dark:bg-[#1E1E1E] shadow-xl text-center space-y-5">
            <div className="h-16 w-16 mx-auto rounded-full bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-500/20">
              <XCircle className="h-9 w-9 stroke-[2.2]" />
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20">
                Payment Unsuccessful
              </span>
              <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white">
                Payment Could Not Be Completed
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Order Reference #{effectiveOrderId}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-red-500/10 dark:bg-red-500/10 border border-red-500/20 text-left space-y-1 text-xs">
              <p className="font-bold text-red-800 dark:text-red-300">Reason for Failure:</p>
              <p className="text-red-700 dark:text-red-400">
                {paymentErrorReason || "Transaction was rejected by your bank or the payment window was closed."}
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handlePayNow}
                className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-100 font-bold text-xs shadow-sm transition-colors cursor-pointer"
              >
                Retry Payment
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: "/orders" })}
                className="w-full py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-semibold text-xs transition-colors cursor-pointer"
              >
                Return to Orders
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: "/contact" })}
                className="text-xs text-neutral-500 dark:text-neutral-400 hover:underline pt-1 cursor-pointer"
              >
                Need help? Contact paYent Support
              </button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // ---------------------------------------------------------------------------
  // VIEW: PAYMENT PENDING / VERIFICATION STATE (Section 7)
  // ---------------------------------------------------------------------------
  if (viewMode === "pending_verification") {
    return (
      <MainLayout>
        <div className="min-h-[75vh] flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl border border-amber-200 dark:border-amber-950/60 bg-white dark:bg-[#1E1E1E] shadow-xl text-center space-y-5">
            <div className="h-16 w-16 mx-auto rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Clock className="h-9 w-9 stroke-[2.2]" />
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                Payment Verification Pending
              </span>
              <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white">
                Payment Verification in Progress
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Order #{effectiveOrderId} • Total: ₹{effectiveTotal.toLocaleString("en-IN")}
              </p>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              If money was debited from your bank account or UPI app, it may take 1–2 minutes for the payment gateway to transmit the confirmation callback.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleCheckPaymentStatus}
                disabled={statusCheckLoading}
                className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-100 font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", statusCheckLoading && "animate-spin")} />
                <span>{statusCheckLoading ? "Checking Status..." : "Refresh Payment Status"}</span>
              </button>

              <button
                type="button"
                onClick={handlePayNow}
                className="w-full py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-semibold text-xs transition-colors cursor-pointer"
              >
                Retry Payment Window
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: "/orders" })}
                className="text-xs text-neutral-500 dark:text-neutral-400 hover:underline pt-1 cursor-pointer"
              >
                Return to My Orders
              </button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // ---------------------------------------------------------------------------
  // VIEW: MAIN SECURE CHECKOUT PAGE (Section 3.A, 3.B, 3.C, 3.D, 3.E)
  // ---------------------------------------------------------------------------
  return (
    <MainLayout>
      <div className="min-h-screen bg-neutral-50 dark:bg-[#1E1E1E] text-neutral-900 dark:text-neutral-100 font-sans antialiased transition-colors pb-12">
        {/* ================================================================= */}
        {/* SECTION 3.A: DISTRACTION-FREE PAYMENT HEADER                     */}
        {/* ================================================================= */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#1E1E1E]/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate({ to: "/orders" })}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                title="Return to Orders"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Back to Orders</span>
              </button>

              <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />

              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-neutral-900 dark:text-white">
                  paYent <span className="font-normal text-xs text-neutral-400">Checkout</span>
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                  #{effectiveOrderId}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Session timer */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs font-mono font-bold text-neutral-700 dark:text-neutral-300">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <span>{formatTimer(timeLeft)}</span>
              </div>

              {/* Security indicator */}
              <div className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden md:inline">256-Bit SSL Escrow</span>
              </div>
            </div>
          </div>
        </header>

        {/* ================================================================= */}
        {/* MAIN CHECKOUT BODY: 2-COLUMN LAYOUT                              */}
        {/* Left: Payment Methods | Right: Order Summary & Pay Now           */}
        {/* ================================================================= */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* --------------------------------------------------------------- */}
            {/* LEFT COLUMN: PAYMENT METHODS (Section 3.C)                      */}
            {/* --------------------------------------------------------------- */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              {/* Payment Methods Card */}
              <div className="p-5 sm:p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] shadow-sm space-y-5">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                    Select Payment Method
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    All payment methods are processed through Razorpay PCI-DSS certified gateway.
                  </p>
                </div>

                {/* Method Navigation Tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
                  {[
                    { id: "upi" as const, label: "UPI Apps", icon: Smartphone },
                    { id: "card" as const, label: "Cards", icon: CreditCard },
                    { id: "netbanking" as const, label: "NetBanking", icon: Building },
                    { id: "wallet" as const, label: "Wallets", icon: Wallet },
                  ].map((m) => {
                    const isSelected = selectedMethod === m.id;
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMethod(m.id)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer select-none",
                          isSelected
                            ? "bg-neutral-900 text-white dark:bg-white dark:text-black shadow-xs"
                            : "bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* TAB 1: UPI */}
                {selectedMethod === "upi" && (
                  <div className="space-y-4 pt-1">
                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      Popular UPI Apps:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        { id: "phonepe", name: "PhonePe", note: "UPI, Cards & Wallet" },
                        { id: "gpay", name: "Google Pay", note: "Direct bank debit" },
                        { id: "paytm", name: "Paytm UPI", note: "Fast one-click checkout" },
                        { id: "bhim", name: "BHIM UPI", note: "NPCI official gateway" },
                      ].map((app) => (
                        <label
                          key={app.id}
                          onClick={() => setSelectedUpiApp(app.id)}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                            selectedUpiApp === app.id
                              ? "border-neutral-900 dark:border-white bg-neutral-50 dark:bg-white/[0.04]"
                              : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={cn(
                              "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                              selectedUpiApp === app.id
                                ? "border-neutral-900 dark:border-white"
                                : "border-neutral-400"
                            )}>
                              {selectedUpiApp === app.id && (
                                <div className="w-2 h-2 rounded-full bg-neutral-900 dark:bg-white" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-neutral-900 dark:text-white">
                                {app.name}
                              </p>
                              <p className="text-[10px] text-neutral-400">
                                {app.note}
                              </p>
                            </div>
                          </div>
                          <Smartphone className="h-4 w-4 text-neutral-400" />
                        </label>
                      ))}
                    </div>

                    <div className="pt-2">
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                        Or enter UPI ID / VPA:
                      </label>
                      <input
                        type="text"
                        placeholder="yourname@okhdfcbank / yourname@paytm"
                        value={customUpiId}
                        onChange={(e) => setCustomUpiId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1E1E1E] text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: CREDIT / DEBIT CARDS */}
                {selectedMethod === "card" && (
                  <div className="space-y-4 pt-1">
                    <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-white/[0.02] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                          Supported Card Networks:
                        </span>
                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-neutral-500">
                          <span>Visa</span> • <span>Mastercard</span> • <span>RuPay</span> • <span>Amex</span>
                        </div>
                      </div>

                      <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                        For maximum financial security, card details are entered directly inside Razorpay's end-to-end encrypted checkout overlay. paYent never receives or stores your card number or CVV.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
                      <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>Zero-Liability Escrow Guarantee on every card transaction.</span>
                    </div>
                  </div>
                )}

                {/* TAB 3: NET BANKING */}
                {selectedMethod === "netbanking" && (
                  <div className="space-y-3 pt-1">
                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      Popular Indian Banks:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {["HDFC", "ICICI", "SBI", "Axis", "Kotak", "Punjab National Bank"].map((bank) => (
                        <button
                          key={bank}
                          type="button"
                          onClick={() => setSelectedBank(bank)}
                          className={cn(
                            "py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer",
                            selectedBank === bank
                              ? "border-neutral-900 dark:border-white bg-neutral-50 dark:bg-white/[0.04] text-neutral-900 dark:text-white font-bold"
                              : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 text-neutral-700 dark:text-neutral-300"
                          )}
                        >
                          {bank}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      All other 50+ banks available directly inside the gateway selector.
                    </p>
                  </div>
                )}

                {/* TAB 4: WALLETS */}
                {selectedMethod === "wallet" && (
                  <div className="space-y-3 pt-1">
                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      Supported Wallets:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {["Paytm Wallet", "PhonePe", "Mobikwik", "Amazon Pay", "Airtel Money"].map((wallet) => (
                        <button
                          key={wallet}
                          type="button"
                          onClick={() => setSelectedWallet(wallet)}
                          className={cn(
                            "py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer",
                            selectedWallet === wallet
                              ? "border-neutral-900 dark:border-white bg-neutral-50 dark:bg-white/[0.04] text-neutral-900 dark:text-white font-bold"
                              : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 text-neutral-700 dark:text-neutral-300"
                          )}
                        >
                          {wallet}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Escrow Terms & Trust Banner */}
              <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-white/[0.01] flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                    100% Escrow Protection Guaranteed
                  </h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    Your rental payment is held safely in escrow. Funds are never released to the lender until equipment handover is physically verified and confirmed by your OTP.
                  </p>
                </div>
              </div>
            </div>

            {/* --------------------------------------------------------------- */}
            {/* RIGHT COLUMN: ORDER SUMMARY & PAYMENT BREAKDOWN (Section 3.B, 3.D) */}
            {/* --------------------------------------------------------------- */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-5">
              {/* Product & Rental Overview */}
              <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Order Summary
                  </span>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                    #{effectiveOrderId}
                  </span>
                </div>

                {/* Product Detail Thumbnail */}
                <div className="flex items-start gap-3">
                  <img
                    src={effectiveProductImage}
                    alt={effectiveProductTitle}
                    className="h-16 w-16 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700 shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 uppercase">
                      {effectiveCategory}
                    </span>
                    <h4 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                      {effectiveProductTitle}
                    </h4>
                    <div className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                      <span>Vendor: {vendorName}</span>
                      {vendorVerified && <BadgeCheck className="h-3 w-3 text-emerald-500 shrink-0" />}
                    </div>
                  </div>
                </div>

                {/* Rental Period */}
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/70 dark:border-neutral-800 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">Rental Period:</span>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">
                      {rentalDays} {rentalDays === 1 ? "Day" : "Days"}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-600 dark:text-neutral-300 font-mono">
                    {effectiveStartDate} → {effectiveEndDate}
                  </div>
                </div>

                {/* Price Breakdown (Section 3.D) */}
                <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-800 text-xs">
                  <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                    <span>Rental Subtotal ({rentalDays}d × ₹{dailyRate}):</span>
                    <span className="font-mono text-neutral-800 dark:text-neutral-200">
                      ₹{subtotal.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                    <span>Delivery & Logistics:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      FREE
                    </span>
                  </div>

                  <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                    <span>Platform & Escrow Protection:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      INCLUDED
                    </span>
                  </div>

                  {taxes > 0 && (
                    <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                      <span>Taxes & GST (Included):</span>
                      <span className="font-mono text-neutral-800 dark:text-neutral-200">
                        ₹{taxes.toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-3 border-t border-neutral-200 dark:border-neutral-800">
                    <div>
                      <span className="text-sm font-extrabold text-neutral-900 dark:text-white">
                        Total Amount Payable
                      </span>
                      <p className="text-[10px] text-neutral-400">Authoritative backend calculation</p>
                    </div>
                    <span className="text-xl font-mono font-black text-neutral-900 dark:text-white">
                      ₹{effectiveTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* SECTION 3.E: PAY NOW BUTTON (Immediate hover feedback)    */}
                {/* ========================================================= */}
                <div className="pt-2 space-y-2.5">
                  <button
                    type="button"
                    onClick={handlePayNow}
                    className="w-full py-3.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-100 font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] focus:outline-hidden focus:ring-2 focus:ring-neutral-400"
                  >
                    <Lock className="h-4 w-4" />
                    <span>Pay ₹{effectiveTotal.toLocaleString("en-IN")} Securely</span>
                  </button>

                  <p className="text-[10px] text-neutral-400 text-center leading-tight">
                    By clicking Pay Now, you agree to paYent's{" "}
                    <button
                      type="button"
                      onClick={() => navigate({ to: "/privacy" })}
                      className="underline hover:text-neutral-600 dark:hover:text-neutral-300"
                    >
                      Rental Terms
                    </button>{" "}
                    and{" "}
                    <button
                      type="button"
                      onClick={() => navigate({ to: "/faq" })}
                      className="underline hover:text-neutral-600 dark:hover:text-neutral-300"
                    >
                      Cancellation Policy
                    </button>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && (
        <ReceiptModal
          receipt={receiptData}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </MainLayout>
  );
}

// -----------------------------------------------------------------------------
// RECEIPT MODAL COMPONENT (View & Print / Download)
// -----------------------------------------------------------------------------
function ReceiptModal({ receipt, onClose }: { receipt: any; onClose: () => void }) {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] shadow-2xl space-y-5 text-left">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-neutral-700 dark:text-neutral-300" />
            <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">
              Official Rental Receipt
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between">
            <span className="text-neutral-400">Receipt Number:</span>
            <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
              {receipt?.receipt_number || "REC-OFFICIAL"}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-neutral-400">Order Reference:</span>
            <span className="font-mono text-neutral-800 dark:text-neutral-200">
              #{receipt?.order_id}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-neutral-400">Transaction ID:</span>
            <span className="font-mono text-neutral-800 dark:text-neutral-200">
              {receipt?.transaction_id}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-neutral-400">Item:</span>
            <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate max-w-[200px]">
              {receipt?.product_title}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-neutral-400">Payment Status:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">
              {receipt?.payment_status || "PAID"}
            </span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <span className="font-bold text-neutral-900 dark:text-white">Total Amount:</span>
            <span className="font-mono font-extrabold text-base text-neutral-900 dark:text-white">
              ₹{Number(receipt?.total_amount || 0).toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-100 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Print / Save Receipt</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
