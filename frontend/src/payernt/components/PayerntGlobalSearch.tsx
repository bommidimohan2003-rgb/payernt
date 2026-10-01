import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  X,
  ArrowRight,
  Package,
  Layers,
  Plus,
  Calendar,
  Wallet,
  MessageSquare,
  BarChart3,
  User,
  CornerDownLeft,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { PayerntProduct, RentalRequest } from "../types";

export interface PageRegistryItem {
  id: string;
  tab: "home" | "products" | "requests" | "wallet" | "profile" | "list" | "messages";
  title: string;
  description: string;
  keywords: string[];
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const PAYERNT_PAGE_REGISTRY: PageRegistryItem[] = [
  {
    id: "home",
    tab: "home",
    title: "Overview",
    description: "Revenue metrics, performance charts and live status",
    keywords: ["home", "dashboard", "overview", "main", "command center", "stats", "metrics"],
    icon: Package,
  },
  {
    id: "products",
    tab: "products",
    title: "My Listings",
    description: "Manage listed gear, verification status, and daily rates",
    keywords: ["listings", "my listings", "gear", "equipment", "products", "inventory", "items", "catalog"],
    icon: Layers,
  },
  {
    id: "list",
    tab: "list",
    title: "Create Listing",
    description: "List new cameras, laptops, audio gear, or equipment",
    keywords: ["create", "create listing", "add gear", "new listing", "post", "upload", "add equipment", "list"],
    icon: Plus,
    badge: "Action",
  },
  {
    id: "requests",
    tab: "requests",
    title: "Bookings & Handover",
    description: "Review borrower reservations, handover PINs, and returns",
    keywords: ["bookings", "rental requests", "reservations", "rentals", "handover", "orders", "borrow", "book", "pin"],
    icon: Calendar,
  },
  {
    id: "wallet",
    tab: "wallet",
    title: "Wallet & Payouts",
    description: "Available balance, escrow holdings, withdrawals and bank account",
    keywords: ["wallet", "balance", "earnings", "earn", "withdraw", "payout", "bank", "escrow", "funds", "revenue"],
    icon: Wallet,
  },
  {
    id: "messages",
    tab: "messages",
    title: "Messages",
    description: "Admin notices, product reviews and platform alerts",
    keywords: ["messages", "msg", "admin", "review", "revision", "chat", "inbox", "alerts", "notifications", "updates"],
    icon: MessageSquare,
  },
  {
    id: "analytics",
    tab: "home",
    title: "Analytics & Performance",
    description: "Earnings trends, rental volume and monthly performance",
    keywords: ["analytics", "revenue", "charts", "graphs", "performance", "yield", "reports", "stats"],
    icon: BarChart3,
  },
  {
    id: "profile",
    tab: "profile",
    title: "Profile & KYC",
    description: "Identity verification, security PIN and account details",
    keywords: ["profile", "settings", "kyc", "aadhaar", "security", "pin", "contact", "account"],
    icon: User,
  },
];

interface PayerntGlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: "home" | "products" | "requests" | "wallet" | "profile" | "list" | "messages") => void;
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
  unreadMessagesCount = 0,
}: PayerntGlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on open
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

  // Filter matching pages
  const matchingPages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PAYERNT_PAGE_REGISTRY.slice(0, 6);

    return PAYERNT_PAGE_REGISTRY.filter((page) => {
      if (page.title.toLowerCase().includes(q)) return true;
      if (page.description.toLowerCase().includes(q)) return true;
      return page.keywords.some((kw) => kw.includes(q) || q.includes(kw));
    });
  }, [query]);

  // Filter matching products
  const matchingProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => {
        return (
          p.title?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q)
        );
      })
      .slice(0, 4);
  }, [query, products]);

  // Total results combined
  const totalItemsCount = matchingPages.length + matchingProducts.length;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelectPage = (page: PageRegistryItem) => {
    onClose();
    onNavigate(page.tab);
  };

  const handleSelectProductItem = (productId: string) => {
    onClose();
    if (onSelectProduct) {
      onSelectProduct(productId);
    } else {
      onNavigate("products");
    }
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
      if (selectedIndex < matchingPages.length) {
        const page = matchingPages[selectedIndex];
        if (page) handleSelectPage(page);
      } else {
        const prodIndex = selectedIndex - matchingPages.length;
        const prod = matchingProducts[prodIndex];
        if (prod) handleSelectProductItem(prod.id);
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
            className="fixed inset-0 bg-background/80 backdrop-blur-md"
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
            <div className="flex items-center px-4 py-3.5 border-b border-border bg-muted/20">
              <Search className="h-4 w-4 text-muted-foreground mr-3 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search pages, products or actions..."
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground mr-1 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded bg-muted border border-border text-muted-foreground">
                ESC
              </kbd>
            </div>

            {/* Results Body */}
            <div className="max-h-96 overflow-y-auto p-2 space-y-1">
              {/* Pages Section */}
              {matchingPages.length > 0 && (
                <div className="px-2 py-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                    QUICK ACCESS
                  </span>
                </div>
              )}

              {matchingPages.map((page, index) => {
                const isSelected = index === selectedIndex;
                const PageIcon = page.icon;

                return (
                  <button
                    key={page.id}
                    onClick={() => handleSelectPage(page)}
                    onMouseEnter={() => setSelectedIndex(index)}
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
                        <PageIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold truncate leading-tight">
                            {page.title}
                          </span>
                          {page.badge && (
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-medium uppercase tracking-wider ${
                                isSelected
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : "bg-primary/10 text-primary"
                              }`}
                            >
                              {page.badge}
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-[11px] truncate ${
                            isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                          }`}
                        >
                          {page.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 pl-2 shrink-0">
                      {isSelected ? (
                        <CornerDownLeft className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowRight className="h-3.5 w-3.5 opacity-40" />
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Matching Products Section */}
              {matchingProducts.length > 0 && (
                <>
                  <div className="px-2 pt-3 pb-1 border-t border-border mt-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                      LISTED GEAR
                    </span>
                  </div>
                  {matchingProducts.map((prod, pIdx) => {
                    const itemIndex = matchingPages.length + pIdx;
                    const isSelected = itemIndex === selectedIndex;

                    return (
                      <button
                        key={prod.id}
                        onClick={() => handleSelectProductItem(prod.id)}
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
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 pl-2 shrink-0">
                          {isSelected ? (
                            <CornerDownLeft className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowRight className="h-3.5 w-3.5 opacity-40" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </>
              )}

              {/* Empty State */}
              {totalItemsCount === 0 && (
                <div className="py-8 text-center space-y-2">
                  <p className="text-xs font-medium text-foreground">No matching pages or gear found</p>
                  <p className="text-[11px] text-muted-foreground">
                    Try searching for "wallet", "listings", "bookings", or "create"
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
              <span className="font-mono text-[10px]">paYent Command Search</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default PayerntGlobalSearch;
