import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  X,
  Package,
  Calendar,
  CornerDownLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import type { PayerntProduct, RentalRequest } from "../types";
import { usePayernt } from "../context";

interface PayerntGlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: any) => void;
  products?: PayerntProduct[];
  rentalRequests?: RentalRequest[];
  onSelectProduct?: (productId: string) => void;
  unreadMessagesCount?: number;
}

export function PayerntGlobalSearch({
  isOpen,
  onClose,
  onNavigate,
  products = [],
  rentalRequests = [],
  onSelectProduct,
}: PayerntGlobalSearchProps) {
  const navigate = useNavigate();
  let payerntStore: any = null;
  try {
    payerntStore = usePayernt();
  } catch {
    // context optional fallback
  }

  const effectiveProducts: PayerntProduct[] =
    products && products.length > 0
      ? products
      : payerntStore?.userProducts || payerntStore?.products || [];

  const effectiveRequests: RentalRequest[] =
    rentalRequests && rentalRequests.length > 0
      ? rentalRequests
      : payerntStore?.rentalRequests || [];

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on open and clear state
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global key shortcut listener for Cmd+K / Ctrl+K and Esc
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      } else if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isOpen, onClose]);

  // Filter matching products (only when user has typed a query)
  const matchingProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return effectiveProducts
      .filter((p) => {
        return (
          p.title?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.serialNumber?.toLowerCase().includes(q) ||
          p.verificationStatus?.toLowerCase().includes(q)
        );
      })
      .slice(0, 6);
  }, [query, effectiveProducts]);

  // Filter matching bookings / rental requests (only when user has typed a query)
  const matchingRequests = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return effectiveRequests
      .filter((r) => {
        return (
          r.renter?.name?.toLowerCase().includes(q) ||
          r.productTitle?.toLowerCase().includes(q) ||
          r.status?.toLowerCase().includes(q) ||
          r.id?.toLowerCase().includes(q) ||
          r.handoverPin?.includes(q)
        );
      })
      .slice(0, 6);
  }, [query, effectiveRequests]);

  const totalItemsCount = matchingProducts.length + matchingRequests.length;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelectProductItem = (productId: string) => {
    onClose();
    if (onSelectProduct) {
      onSelectProduct(productId);
    } else {
      navigate({ to: "/payernt/products" as any }).catch(() => {});
    }
  };

  const handleSelectRequestItem = (requestId: string) => {
    onClose();
    navigate({ to: "/payernt/bookings" as any }).catch(() => {});
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (totalItemsCount > 0 ? (prev + 1) % totalItemsCount : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (totalItemsCount > 0 ? (prev - 1 + totalItemsCount) % totalItemsCount : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex < matchingProducts.length) {
        const prod = matchingProducts[selectedIndex];
        if (prod) handleSelectProductItem(prod.id);
      } else {
        const reqIndex = selectedIndex - matchingProducts.length;
        const req = matchingRequests[reqIndex];
        if (req) handleSelectRequestItem(req.id);
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-neutral-950/60 dark:bg-black/80 backdrop-blur-md"
          />

          {/* Modal Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col"
          >
            {/* Input Header */}
            <div className="flex items-center px-4 py-3.5 border-b border-border bg-muted/30">
              <Search className="h-4 w-4 text-muted-foreground mr-3 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search gear, serial numbers, or bookings..."
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground mr-2 cursor-pointer"
                  aria-label="Clear query"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              {/* Close Button on Right */}
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Results Body */}
            <div className="max-h-96 overflow-y-auto p-2 space-y-1">
              {/* Initial State when no query is typed - Clean uncluttered prompt without page suggestions */}
              {!query.trim() && (
                <div className="py-12 px-4 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                    <Search className="h-5 w-5 stroke-[1.75]" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    Search Lender Gear & Bookings
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Type an equipment title, brand, model, serial number, or renter name to search your catalog and reservations.
                  </p>
                </div>
              )}

              {/* Matching Products Section */}
              {matchingProducts.length > 0 && (
                <>
                  <div className="px-2 pt-2 pb-1 flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                      MY LISTED GEAR
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {matchingProducts.length} items
                    </span>
                  </div>
                  {matchingProducts.map((prod, pIdx) => {
                    const isSelected = pIdx === selectedIndex;

                    return (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => handleSelectProductItem(prod.id)}
                        onMouseEnter={() => setSelectedIndex(pIdx)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`p-1.5 rounded-lg border ${
                              isSelected
                                ? "bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground"
                                : "bg-muted border-border text-muted-foreground"
                            }`}
                          >
                            <Package className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold truncate block leading-tight">
                              {prod.title}
                            </span>
                            <span
                              className={`text-[10px] font-mono block ${
                                isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                              }`}
                            >
                              ₹{prod.dailyRate}/day • {prod.category || "Gear"} • {prod.verificationStatus}
                              {prod.serialNumber ? ` • S/N: ${prod.serialNumber}` : ""}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="flex items-center pl-2 shrink-0">
                            <CornerDownLeft className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </>
              )}

              {/* Matching Bookings / Rental Requests Section */}
              {matchingRequests.length > 0 && (
                <>
                  <div className="px-2 pt-3 pb-1 border-t border-border mt-2 flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                      RENTAL BOOKINGS & HANDOVER
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {matchingRequests.length} requests
                    </span>
                  </div>
                  {matchingRequests.map((req, rIdx) => {
                    const itemIndex = matchingProducts.length + rIdx;
                    const isSelected = itemIndex === selectedIndex;

                    return (
                      <button
                        key={req.id}
                        type="button"
                        onClick={() => handleSelectRequestItem(req.id)}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`p-1.5 rounded-lg border ${
                              isSelected
                                ? "bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground"
                                : "bg-muted border-border text-muted-foreground"
                            }`}
                          >
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold truncate block leading-tight">
                              {req.productTitle} — {req.renter?.name || "Borrower"}
                            </span>
                            <span
                              className={`text-[10px] font-mono block ${
                                isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                              }`}
                            >
                              Status: {req.status} • {req.startDate} to {req.endDate}
                              {req.handoverPin ? ` • PIN: ${req.handoverPin}` : ""}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="flex items-center pl-2 shrink-0">
                            <CornerDownLeft className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </>
              )}

              {/* Empty State when query returned nothing */}
              {query.trim() && totalItemsCount === 0 && (
                <div className="py-12 px-4 text-center space-y-1.5">
                  <p className="text-sm font-medium text-foreground">No matching gear or bookings found</p>
                  <p className="text-xs text-muted-foreground">
                    No records match "{query}". Try checking the spelling or searching another model.
                  </p>
                </div>
              )}
            </div>

            {/* Footer Shortcuts */}
            <div className="px-4 py-2.5 border-t border-border bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 rounded bg-muted border border-border font-mono text-[9px]">↑</kbd>
                  <kbd className="px-1 rounded bg-muted border border-border font-mono text-[9px]">↓</kbd>
                  <span>Navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 rounded bg-muted border border-border font-mono text-[9px]">↵</kbd>
                  <span>Select</span>
                </span>
              </div>
              <span className="font-mono text-[10px]">paye₹nt Search</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default PayerntGlobalSearch;
