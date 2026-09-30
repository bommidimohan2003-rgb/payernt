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
  HelpCircle,
  CornerDownLeft,
  Sparkles,
} from "lucide-react";

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
    title: "Home Dashboard",
    description: "Overview, revenue metrics and lending activity",
    keywords: ["home", "dashboard", "overview", "main", "command center", "stats", "metrics"],
    icon: Package,
  },
  {
    id: "products",
    tab: "products",
    title: "My Listings",
    description: "Manage listed gear, pricing, and availability schedules",
    keywords: ["listings", "my listings", "gear", "equipment", "products", "inventory", "items", "catalog", "list"],
    icon: Layers,
  },
  {
    id: "list",
    tab: "list",
    title: "Create Listing",
    description: "List new cameras, laptops, drones, or equipment",
    keywords: ["create", "create listing", "add gear", "new listing", "post", "upload", "add equipment", "list"],
    icon: Plus,
    badge: "New",
  },
  {
    id: "requests",
    tab: "requests",
    title: "Bookings",
    description: "Review borrower reservations and handover requests",
    keywords: ["bookings", "rental requests", "reservations", "rentals", "handover", "orders", "borrow", "book"],
    icon: Calendar,
  },
  {
    id: "wallet",
    tab: "wallet",
    title: "Wallet & Banking",
    description: "Balance, escrow holdings, withdrawals and bank accounts",
    keywords: ["wallet", "balance", "earnings", "earn", "withdraw", "payout", "bank", "escrow", "funds", "revenue", "wal"],
    icon: Wallet,
  },
  {
    id: "messages",
    tab: "messages",
    title: "Messages",
    description: "Admin notices, product reviews and revision requests",
    keywords: ["messages", "msg", "admin", "review", "revision", "chat", "inbox", "alerts", "notifications", "updates"],
    icon: MessageSquare,
  },
  {
    id: "analytics",
    tab: "home",
    title: "Analytics",
    description: "Earnings breakdown, revenue charts, and yield performance",
    keywords: ["analytics", "revenue", "charts", "graphs", "performance", "yield", "reports", "stats", "analyt"],
    icon: BarChart3,
  },
  {
    id: "profile",
    tab: "profile",
    title: "Profile & KYC",
    description: "Identity verification, security PIN and contact settings",
    keywords: ["profile", "settings", "kyc", "aadhaar", "security", "pin", "contact", "account", "sett", "prof"],
    icon: User,
  },
  {
    id: "support",
    tab: "profile",
    title: "Help & Support",
    description: "Lender documentation, FAQ and dispute assistance",
    keywords: ["help", "support", "faq", "guide", "dispute", "assistance", "contact support", "docs"],
    icon: HelpCircle,
  },
];

interface PayerntGlobalSearchProps {
  onNavigate: (tab: "home" | "products" | "requests" | "wallet" | "profile" | "list" | "messages") => void;
  onScrollToSection?: (sectionId: string) => void;
  unreadMessagesCount?: number;
}

export function PayerntGlobalSearch({
  onNavigate,
  onScrollToSection,
  unreadMessagesCount = 0,
}: PayerntGlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter matching pages only when user types
  const matchingPages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [];
    }

    return PAYERNT_PAGE_REGISTRY.filter((page) => {
      // Direct match
      if (page.title.toLowerCase().includes(q)) return true;
      if (page.description.toLowerCase().includes(q)) return true;
      // Keywords fuzzy prefix / substring match
      return page.keywords.some((kw) => kw.includes(q) || q.includes(kw));
    });
  }, [query]);

  // Reset selected index on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle page selection and navigation
  const handleSelectPage = (page: PageRegistryItem) => {
    setIsOpen(false);
    setQuery("");

    if (page.id === "analytics") {
      onNavigate("home");
      setTimeout(() => {
        const el = document.getElementById("analytics-section");
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        } else if (onScrollToSection) {
          onScrollToSection("analytics-section");
        }
      }, 100);
    } else {
      onNavigate(page.tab);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!query.trim()) return;

    if (!isOpen && (e.key === "ArrowDown" || e.key === "Enter")) {
      setIsOpen(true);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (matchingPages.length > 0 ? (prev + 1) % matchingPages.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (matchingPages.length > 0 ? (prev - 1 + matchingPages.length) % matchingPages.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (matchingPages.length > 0 && matchingPages[selectedIndex]) {
        handleSelectPage(matchingPages[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative w-full max-w-xs sm:max-w-md">
      {/* SEARCH INPUT BAR */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            setIsOpen(val.trim().length > 0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search pages (e.g. wallet, bookings, listings)..."
          className="w-full pl-9 pr-8 py-2 rounded-xl border border-border/80 bg-card text-xs text-foreground placeholder:text-muted-foreground/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all shadow-2xs"
          aria-label="Global page navigation search"
        />

        {query ? (
          <button
            onClick={() => {
              setQuery("");
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 pointer-events-none text-[10px] text-muted-foreground font-mono bg-secondary px-1.5 py-0.5 rounded border border-border/60">
            <span>⌘K</span>
          </div>
        )}
      </div>

      {/* SEARCH DROPDOWN PANEL */}
      {isOpen && query.trim().length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-border bg-card p-2 shadow-2xl z-50 text-left space-y-1 max-h-96 overflow-y-auto backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {/* Header label */}
          <div className="flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-emerald-500" />
              Matching Pages
            </span>
            <span className="text-[9px] lowercase font-normal">use ↑↓ arrows to navigate</span>
          </div>

          {/* Results list */}
          {matchingPages.length === 0 ? (
            <div className="p-6 text-center space-y-3">
              <p className="font-bold text-xs text-foreground">No matching page found</p>
              <p className="text-[11px] text-muted-foreground">
                Try searching for:
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                {["Wallet", "Bookings", "Listings", "Messages", "Analytics"].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setQuery(suggestion.toLowerCase());
                      inputRef.current?.focus();
                    }}
                    className="px-2 py-1 rounded-lg bg-secondary hover:bg-secondary/80 text-[11px] font-semibold text-foreground border border-border transition-colors cursor-pointer"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            matchingPages.map((page, index) => {
              const isSelected = index === selectedIndex;
              const PageIcon = page.icon;
              const isMessages = page.id === "messages";

              return (
                <div
                  key={page.id}
                  onClick={() => handleSelectPage(page)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? "bg-secondary text-foreground font-bold shadow-2xs"
                      : "text-foreground hover:bg-secondary/60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                        isSelected
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-secondary/80 text-muted-foreground border-border"
                      }`}
                    >
                      <PageIcon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold truncate leading-tight">
                          {page.title}
                        </span>
                        {page.badge && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-[9px] uppercase tracking-wider border border-emerald-500/20">
                            {page.badge}
                          </span>
                        )}
                        {isMessages && unreadMessagesCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-black text-[9px]">
                            {unreadMessagesCount} new
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate font-medium">
                        {page.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 pl-2 text-muted-foreground">
                    {isSelected ? (
                      <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                        <CornerDownLeft className="h-3 w-3" />
                      </div>
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5 opacity-40" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default PayerntGlobalSearch;
