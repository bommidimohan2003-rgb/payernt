import React from "react";
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
} from "lucide-react";
import { MainLayout } from "@/layouts/MainLayout";
import { useCart } from "@/hooks/useCart";
import { getOptimizedImageUrl } from "@/utils/images";

export default function Cart() {
  const {
    cartItems,
    cartCount,
    subtotal,
    removeFromCart,
    clearCart,
  } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (cartItems.length > 0) {
      navigate({
        to: "/checkout",
        search: { id: cartItems[0].product_id },
      });
    } else {
      navigate({ to: "/checkout", search: { id: "" } });
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-neutral-50/50 dark:bg-[#05090D] text-neutral-900 dark:text-white transition-colors py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-xs text-neutral-500 dark:text-[#8D98A3] mb-6">
            <Link to="/" className="hover:text-black dark:hover:text-white transition-colors">
              Home
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/browse" className="hover:text-black dark:hover:text-white transition-colors">
              Browse Gear
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-semibold text-neutral-900 dark:text-white">
              Rental Cart
            </span>
          </nav>

          {/* Page Title & Count Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-black/10 dark:border-white/10 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Your Rental Cart
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-neutral-500 dark:text-[#8D98A3]">
                {cartCount === 0
                  ? "No gear items added yet"
                  : cartCount === 1
                    ? "1 item selected for your rental project"
                    : `${cartCount} items selected for your rental project`}
              </p>
            </div>

            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={() => clearCart()}
                className="self-start sm:self-auto text-xs text-neutral-500 hover:text-red-500 dark:text-[#8D98A3] dark:hover:text-red-400 font-semibold px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-white/10 hover:border-red-500/30 transition-all cursor-pointer"
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Main Grid: Left Items + Right Summary */}
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-200 dark:border-white/10 bg-white dark:bg-[#0D151D] p-12 sm:p-16 text-center shadow-sm">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 dark:bg-white/5 text-neutral-400 dark:text-neutral-500 mb-5">
                <ShoppingBag className="h-10 w-10" />
              </div>
              <h2 className="text-lg font-bold tracking-tight">
                Your cart is empty
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-neutral-500 dark:text-[#8D98A3] max-w-sm">
                Explore our curated peer-to-peer catalog of cinema cameras, lenses, drones, laptops, and audio gear.
              </p>
              <Link
                to="/browse"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#161616] text-[#F2F0EA] dark:bg-[#F2F0EA] dark:text-[#161616] px-6 py-2.5 text-xs font-bold shadow-md hover:opacity-90 transition-opacity"
              >
                <span>Browse Gear</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Items List */}
              <div className="lg:col-span-8 space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#0D151D] shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {/* Thumbnail */}
                      {item.image ? (
                        <img
                          src={getOptimizedImageUrl(item.image, 'thumb')}
                          alt={item.title}
                          loading="lazy"
                          decoding="async"
                          className="h-20 w-20 shrink-0 rounded-xl object-cover border border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-neutral-800"
                        />
                      ) : (
                        <div className="h-20 w-20 shrink-0 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
                          <Package className="h-8 w-8 opacity-40" />
                        </div>
                      )}

                      {/* Product Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 dark:text-[#8D98A3]">
                            {item.category}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-neutral-700 dark:text-neutral-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Ready for booking
                          </span>
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white truncate mt-0.5">
                          {item.title}
                        </h3>

                        <p className="text-xs text-neutral-500 dark:text-[#8D98A3] mt-1">
                          Location: {item.city || "Available locally"}
                        </p>
                      </div>
                    </div>

                    {/* Right Side Price and Delete */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-white/5 gap-2">
                      <div className="text-left sm:text-right">
                        <div className="text-base sm:text-lg font-black font-mono text-neutral-950 dark:text-white">
                          ₹{(item.daily_price || item.price).toLocaleString("en-IN")}<span className="text-xs font-normal text-neutral-500">/day</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        aria-label={`Remove ${item.title}`}
                        className="text-neutral-400 hover:text-red-500 dark:text-[#8D98A3] dark:hover:text-red-400 p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Column: Order Summary Card */}
              <div className="lg:col-span-4 sticky top-[100px] space-y-4">
                <div className="rounded-3xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#0D151D] p-6 shadow-sm">
                  <h2 className="text-base font-extrabold tracking-tight pb-4 border-b border-neutral-100 dark:border-white/10">
                    Rental Summary
                  </h2>

                  <div className="mt-4 space-y-2.5 text-xs">
                    <div className="flex justify-between text-neutral-600 dark:text-[#AAB3BC]">
                      <span>Daily Rates Base</span>
                      <span className="font-mono font-semibold">₹{subtotal.toLocaleString("en-IN")}/day</span>
                    </div>
                    <div className="flex justify-between text-neutral-600 dark:text-[#AAB3BC]">
                      <span>Deposit / Security</span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">Covered by Payent Shield</span>
                    </div>

                    <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl text-[11px] text-neutral-600 dark:text-[#AAB3BC] flex items-start gap-2 mt-3">
                      <Calendar className="h-4 w-4 shrink-0 mt-0.5 text-neutral-500" />
                      <span>
                        Rental dates, total rental days, and courier/handover options are selected during checkout.
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCheckout}
                    id="cart-page-checkout-btn"
                    className="mt-6 w-full flex items-center justify-center gap-2 rounded-full py-3 px-5 text-xs font-bold shadow-md transition-all bg-[#161616] text-[#F2F0EA] hover:bg-[#262626] dark:bg-[#F2F0EA] dark:text-[#161616] dark:hover:bg-white cursor-pointer"
                  >
                    <span>Proceed to Select Dates</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  {/* Guarantee points */}
                  <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-white/5 space-y-2.5 text-[11px] text-neutral-500 dark:text-[#8D98A3]">
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
                      <span>Instant KYC and government ID / PAN verification</span>
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
