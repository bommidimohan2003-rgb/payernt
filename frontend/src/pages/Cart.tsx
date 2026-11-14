import React, { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ShoppingBag,
  Trash2,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Truck,
  CheckCircle2,
  Calendar,
  Package,
  MapPin,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";
import { MainLayout } from "@/layouts/MainLayout";
import { BackButton } from "@/components/common/BackButton";
import { Button } from "@/components/common/Button";
import { useCart } from "@/hooks/useCart";
import { getOptimizedImageUrl } from "@/utils/images";
import { toast } from "sonner";

export default function Cart() {
  const {
    cartItems,
    cartCount,
    subtotal,
    removeFromCart,
    clearCart,
    isLoading,
  } = useCart();
  const navigate = useNavigate();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const handleRemove = async (itemId: string, title: string) => {
    setRemovingId(itemId);
    try {
      const ok = await removeFromCart(itemId);
      if (ok) {
        toast.info(`Removed "${title}" from your rental cart`);
      }
    } catch {
      toast.error("Failed to remove item. Please try again.");
    } finally {
      setRemovingId(null);
    }
  };

  const handleClearCart = async () => {
    if (!window.confirm("Are you sure you want to remove all items from your rental cart?")) {
      return;
    }
    setIsClearing(true);
    try {
      const ok = await clearCart();
      if (ok) {
        toast.info("Your rental cart has been cleared");
      }
    } catch {
      toast.error("Failed to clear cart.");
    } finally {
      setIsClearing(false);
    }
  };

  const handleProceedToBooking = () => {
    if (cartItems.length === 0) {
      toast.error("Your rental cart is empty.");
      return;
    }

    // Direct to checkout with the first cart item's details (and selected dates if present)
    const primaryItem = cartItems[0];
    const searchParams: { id: string; start?: string; end?: string } = {
      id: primaryItem.product_id,
    };
    if (primaryItem.start_date) searchParams.start = primaryItem.start_date;
    if (primaryItem.end_date) searchParams.end = primaryItem.end_date;

    navigate({
      to: "/checkout",
      search: searchParams,
    });
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-neutral-50/60 dark:bg-[#1E1E1E] text-neutral-900 dark:text-white transition-colors py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Back Button & Breadcrumb Navigation */}
          <div className="flex items-center gap-3 mb-6">
            <BackButton fallback="/explore" />
            <nav className="flex items-center gap-2 text-xs text-neutral-500 dark:text-[#8D98A3]" aria-label="Breadcrumb">
              <Link to="/" className="hover:text-black dark:hover:text-white transition-colors">
                Home
              </Link>
              <ChevronRight className="h-3 w-3" />
              <Link to="/explore" className="hover:text-black dark:hover:text-white transition-colors">
                Explore Rentals
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="font-semibold text-neutral-900 dark:text-white" aria-current="page">
                Rental Cart
              </span>
            </nav>
          </div>

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-neutral-200 dark:border-white/10">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-950 dark:text-white">
                  Your Rental Cart
                </h1>
                {cartCount > 0 && (
                  <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-950">
                    {cartCount} {cartCount === 1 ? "item" : "items"}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs sm:text-sm text-neutral-600 dark:text-[#8D98A3]">
                Review your selected items before booking.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/explore"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:text-black dark:hover:text-white px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-white/10 hover:border-neutral-400 dark:hover:border-white/20 transition-all cursor-pointer"
              >
                <span>Continue Shopping</span>
              </Link>

              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  disabled={isClearing}
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-red-500 dark:text-[#8D98A3] dark:hover:text-red-400 font-semibold px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-white/10 hover:border-red-500/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isClearing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  <span>Clear Cart</span>
                </button>
              )}
            </div>
          </div>

          {/* Main Grid: Left Items + Right Summary */}
          {isLoading && cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#1E1E1E] p-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
              <p className="mt-4 text-sm text-neutral-500 dark:text-[#8D98A3]">
                Loading your rental cart...
              </p>
            </div>
          ) : cartItems.length === 0 ? (
            /* Empty Cart State */
            <div
              data-testid="cart-empty-state"
              className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-300 dark:border-white/10 bg-white dark:bg-[#1E1E1E] p-12 sm:p-20 text-center shadow-xs"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 dark:bg-white/5 text-neutral-400 dark:text-neutral-500 mb-5">
                <ShoppingBag className="h-10 w-10 stroke-[1.75]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Your cart is empty
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-neutral-600 dark:text-[#8D98A3] max-w-md">
                Explore rentals and add the items you need. Discover cameras, lenses, drones, laptops, audio gear, and more.
              </p>
              <Link
                to="/explore"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#161616] text-[#F2F0EA] dark:bg-[#F2F0EA] dark:text-[#161616] px-6 py-3 text-xs sm:text-sm font-bold shadow-md hover:opacity-90 active:scale-95 transition-all"
              >
                <span>Explore Rentals</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Cart Items List */}
              <div className="lg:col-span-8 space-y-4">
                {cartItems.map((item) => {
                  const dailyPrice = item.daily_price || item.price || 0;
                  const hasDates = Boolean(item.start_date && item.end_date);
                  const isItemRemoving = removingId === item.id;

                  return (
                    <article
                      key={item.id}
                      data-testid={`cart-item-${item.product_id}`}
                      className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#1E1E1E] shadow-xs hover:border-neutral-300 dark:hover:border-white/20 transition-all"
                    >
                      <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                        {/* Thumbnail Container */}
                        <Link
                          to="/product/$id"
                          params={{ id: item.product_id }}
                          className="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white rounded-xl"
                        >
                          {item.image ? (
                            <img
                              src={getOptimizedImageUrl(item.image, "thumb")}
                              alt={item.title}
                              loading="lazy"
                              decoding="async"
                              className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-xl object-cover border border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-neutral-800 transition-transform group-hover:scale-102"
                            />
                          ) : (
                            <div className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
                              <Package className="h-8 w-8 opacity-40" />
                            </div>
                          )}
                        </Link>

                        {/* Product Meta */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {item.category && (
                              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 dark:text-[#8D98A3]">
                                {item.category}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Ready for rental
                            </span>
                          </div>

                          <h2 className="text-sm sm:text-base font-bold text-neutral-950 dark:text-white truncate mt-1">
                            <Link
                              to="/product/$id"
                              params={{ id: item.product_id }}
                              className="hover:underline focus:outline-none"
                            >
                              {item.title}
                            </Link>
                          </h2>

                          {/* Location */}
                          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-[#8D98A3] mt-1">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                            <span>{item.city || "Available locally for pickup / delivery"}</span>
                          </div>

                          {/* Rental Dates & Duration Status */}
                          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                            {hasDates ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-white/5 text-neutral-700 dark:text-neutral-300 font-medium text-[11px]">
                                <Calendar className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                                <span>
                                  {item.start_date} to {item.end_date}
                                  {item.days ? ` (${item.days} ${item.days === 1 ? "day" : "days"})` : ""}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-neutral-400 dark:text-[#8D98A3]">
                                  Rental dates not selected
                                </span>
                                <Link
                                  to="/product/$id"
                                  params={{ id: item.product_id }}
                                  className="text-[11px] font-semibold text-neutral-900 dark:text-white underline hover:opacity-80"
                                >
                                  Select Dates
                                </Link>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Pricing & Removal Actions */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-white/5 gap-3">
                        <div className="text-left sm:text-right">
                          <div className="text-base sm:text-lg font-black font-mono text-neutral-950 dark:text-white">
                            ₹{dailyPrice.toLocaleString("en-IN")}
                            <span className="text-xs font-normal text-neutral-500 dark:text-[#8D98A3]">
                              /day
                            </span>
                          </div>
                          {hasDates && item.total_price && (
                            <div className="text-[11px] font-medium text-neutral-500 dark:text-[#8D98A3]">
                              Est. total: ₹{item.total_price.toLocaleString("en-IN")}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            to="/product/$id"
                            params={{ id: item.product_id }}
                            className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white font-medium px-2 py-1 rounded-md hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
                          >
                            <span>Details</span>
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleRemove(item.id, item.title)}
                            disabled={isItemRemoving}
                            aria-label={`Remove ${item.title} from cart`}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 dark:text-[#8D98A3] dark:hover:text-red-400 hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
                            title="Remove item"
                          >
                            {isItemRemoving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Right Column: Order Summary Panel */}
              <div className="lg:col-span-4 sticky top-[100px] space-y-4">
                <div className="relative rounded-3xl border border-neutral-300/80 dark:border-neutral-700/80 bg-white dark:bg-[#1E1E1E] p-6 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-white/5">
                    <h2 className="text-base font-bold tracking-tight text-neutral-950 dark:text-white">
                      Rental Summary
                    </h2>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-white/10 text-neutral-700 dark:text-neutral-300">
                      {cartItems.length} {cartItems.length === 1 ? "item" : "items"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3 text-xs">
                    <div className="flex justify-between text-neutral-600 dark:text-[#AAB3BC]">
                      <span>Daily Rates Base</span>
                      <span className="font-mono font-semibold text-neutral-950 dark:text-white">
                        ₹{subtotal.toLocaleString("en-IN")}/day
                      </span>
                    </div>

                    <div className="flex justify-between text-neutral-600 dark:text-[#AAB3BC]">
                      <span>Payent Shield Protection</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Covered (₹0 upfront)
                      </span>
                    </div>

                    <div className="flex justify-between text-neutral-600 dark:text-[#AAB3BC]">
                      <span>Security Deposit</span>
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">
                        Refundable at return
                      </span>
                    </div>

                    <div className="flex justify-between text-neutral-600 dark:text-[#AAB3BC]">
                      <span>GST / Taxes</span>
                      <span className="font-medium text-neutral-500 dark:text-[#8D98A3]">
                        Calculated at booking
                      </span>
                    </div>

                    <div className="p-3 bg-neutral-50 dark:bg-white/5 rounded-xl text-[11px] text-neutral-600 dark:text-[#AAB3BC] flex items-start gap-2 mt-3 border border-neutral-200/60 dark:border-white/5">
                      <Calendar className="h-4 w-4 shrink-0 mt-0.5 text-neutral-500" />
                      <span>
                        Rental dates and delivery / handover preferences are confirmed during checkout.
                      </span>
                    </div>
                  </div>

                  {/* Primary CTA Button: Proceed to Booking */}
                  <Button
                    type="button"
                    onClick={handleProceedToBooking}
                    id="cart-proceed-booking-btn"
                    className="mt-6 w-full flex items-center justify-center gap-2 rounded-full py-3.5 px-5 text-xs sm:text-sm font-bold shadow-md transition-all bg-[#161616] text-[#F2F0EA] hover:bg-[#262626] dark:bg-[#F2F0EA] dark:text-[#161616] dark:hover:bg-white cursor-pointer active:scale-98"
                  >
                    <span>Proceed to Booking</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>

                  {/* Guarantees & Trust Points */}
                  <div className="mt-6 pt-5 border-t border-neutral-100 dark:border-white/5 space-y-2.5 text-[11px] text-neutral-500 dark:text-[#8D98A3]">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-neutral-700 dark:text-neutral-300 shrink-0" />
                      <span>Full gear protection & verified damage coverage</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-neutral-700 dark:text-neutral-300 shrink-0" />
                      <span>Local verified handover or insured door-step delivery</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-neutral-700 dark:text-neutral-300 shrink-0" />
                      <span>Instant KYC & digital rental agreement verification</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
