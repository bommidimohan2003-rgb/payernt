import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  Users,
  Package,
  Calendar,
  CreditCard,
  Star,
  Flag,
  LifeBuoy,
  LayoutDashboard,
  BarChart3,
  Grid,
  Bell,
  Shield,
  User,
  Settings,
  X,
  Loader2,
  KeyRound,
  CornerDownLeft,
} from "lucide-react";
import { adminApi, AdminUser, AdminProduct, AdminBooking, AdminPayment } from "../../services/api";
import { cn } from "@/lib/utils";

interface CommandSearchModalProps {
  open: boolean;
  onClose: () => void;
}

interface SearchResultItem {
  id: string;
  category: "Navigation" | "Users" | "Products" | "Bookings" | "Payments" | "Support";
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  route: string;
  badge?: string;
}

const PAGES: SearchResultItem[] = [
  { id: "p-dash", category: "Navigation", title: "Dashboard", subtitle: "Operational command center & KPIs", icon: LayoutDashboard, route: "/admin/dashboard" },
  { id: "p-analytics", category: "Navigation", title: "Analytics", subtitle: "Marketplace, revenue & user growth trends", icon: BarChart3, route: "/admin/analytics" },
  { id: "p-users", category: "Navigation", title: "Users Management", subtitle: "Account approvals, verification & roles", icon: Users, route: "/admin/users" },
  { id: "p-agents", category: "Navigation", title: "Agents Directory", subtitle: "Verified gear lenders & fleet partners", icon: Users, route: "/admin/agents" },
  { id: "p-products", category: "Navigation", title: "Products & Gear", subtitle: "Listing moderation & catalog review", icon: Package, route: "/admin/products" },
  { id: "p-categories", category: "Navigation", title: "Categories", subtitle: "Gear categories & taxonomy", icon: Grid, route: "/admin/categories" },
  { id: "p-bookings", category: "Navigation", title: "Bookings", subtitle: "Rental order operations & dispatch", icon: Calendar, route: "/admin/bookings" },
  { id: "p-payments", category: "Navigation", title: "Payments Reconciliation", subtitle: "Settlements, transactions & refunds", icon: CreditCard, route: "/admin/payments" },
  { id: "p-reviews", category: "Navigation", title: "Customer Reviews", subtitle: "Verified feedback & moderation", icon: Star, route: "/admin/reviews" },
  { id: "p-reports", category: "Navigation", title: "Reports & Disputes", subtitle: "Operational reports & issue resolution", icon: Flag, route: "/admin/reports" },
  { id: "p-notifs", category: "Navigation", title: "Notifications", subtitle: "System alerts & activity events", icon: Bell, route: "/admin/notifications" },
  { id: "p-support", category: "Navigation", title: "Support Desk", subtitle: "Customer inquiries & help tickets", icon: LifeBuoy, route: "/admin/support" },
  { id: "p-logs", category: "Navigation", title: "Activity Logs", subtitle: "Security audit trail & admin logs", icon: Shield, route: "/admin/activity-logs" },
  { id: "p-pin-verify", category: "Navigation", title: "8-Digit PIN Verification", subtitle: "Verify combined vendor + renter Secret PIN", icon: KeyRound, route: "/admin/pin-verification" },
  { id: "p-profile", category: "Navigation", title: "Admin Profile", subtitle: "Credentials & account security", icon: User, route: "/admin/profile" },
  { id: "p-settings", category: "Navigation", title: "Platform Settings", subtitle: "Configuration, branding & SEO", icon: Settings, route: "/admin/settings" },
];

export function CommandSearchModal({ open, onClose }: CommandSearchModalProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Reset query on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Live search against real backend endpoints
  const performSearch = useCallback(async (q: string) => {
    const trimmed = q.trim().toLowerCase();
    if (!trimmed) {
      setResults(PAGES.slice(0, 6));
      return;
    }

    setLoading(true);
    const matched: SearchResultItem[] = [];

    // 1. Match Navigation Pages
    PAGES.forEach((p) => {
      if (p.title.toLowerCase().includes(trimmed) || (p.subtitle && p.subtitle.toLowerCase().includes(trimmed))) {
        matched.push(p);
      }
    });

    try {
      // 2. Query real backend datasets in parallel
      const [usersRes, prodsRes, bookingsRes, paymentsRes] = await Promise.allSettled([
        adminApi.get("/users"),
        adminApi.get("/products"),
        adminApi.get("/bookings"),
        adminApi.get("/payments"),
      ]);

      // Process Users
      if (usersRes.status === "fulfilled" && Array.isArray(usersRes.value.data)) {
        const users = usersRes.value.data as AdminUser[];
        users.forEach((u) => {
          if (
            (u.fullName && u.fullName.toLowerCase().includes(trimmed)) ||
            (u.email && u.email.toLowerCase().includes(trimmed)) ||
            (u.id && u.id.toLowerCase().includes(trimmed))
          ) {
            matched.push({
              id: `u-${u.id || u.email}`,
              category: "Users",
              title: u.fullName || u.email,
              subtitle: `${u.email} • Role: ${u.role || "user"} • Status: ${u.status || "active"}`,
              icon: Users,
              route: `/admin/users?search=${encodeURIComponent(u.email || u.fullName)}`,
              badge: u.role,
            });
          }
        });
      }

      // Process Products
      if (prodsRes.status === "fulfilled" && Array.isArray(prodsRes.value.data)) {
        const products = prodsRes.value.data as AdminProduct[];
        products.forEach((p) => {
          if (
            (p.title && p.title.toLowerCase().includes(trimmed)) ||
            (p.category && p.category.toLowerCase().includes(trimmed)) ||
            (p.id && p.id.toLowerCase().includes(trimmed))
          ) {
            matched.push({
              id: `p-${p.id}`,
              category: "Products",
              title: p.title || `Product #${p.id}`,
              subtitle: `${p.category || "Gear"} • ₹${p.price || 0}/day • Status: ${p.status || "pending"}`,
              icon: Package,
              route: `/admin/products?search=${encodeURIComponent(p.title || p.id)}`,
              badge: p.status,
            });
          }
        });
      }

      // Process Bookings
      if (bookingsRes.status === "fulfilled" && Array.isArray(bookingsRes.value.data)) {
        const bookings = bookingsRes.value.data as AdminBooking[];
        bookings.forEach((b) => {
          if (
            (b.id && b.id.toLowerCase().includes(trimmed)) ||
            (b.customerName && b.customerName.toLowerCase().includes(trimmed)) ||
            (b.productTitle && b.productTitle.toLowerCase().includes(trimmed))
          ) {
            matched.push({
              id: `b-${b.id}`,
              category: "Bookings",
              title: `Booking #${b.id}`,
              subtitle: `${b.productTitle || "Gear"} • Customer: ${b.customerName} • Total: ₹${b.amount || 0}`,
              icon: Calendar,
              route: `/admin/bookings?search=${encodeURIComponent(b.id)}`,
              badge: b.status,
            });
          }
        });
      }

      // Process Payments
      if (paymentsRes.status === "fulfilled" && Array.isArray(paymentsRes.value.data)) {
        const payments = paymentsRes.value.data as AdminPayment[];
        payments.forEach((py) => {
          if (
            (py.id && py.id.toLowerCase().includes(trimmed)) ||
            (py.customerName && py.customerName.toLowerCase().includes(trimmed)) ||
            (py.bookingId && py.bookingId.toLowerCase().includes(trimmed))
          ) {
            matched.push({
              id: `py-${py.id}`,
              category: "Payments",
              title: `Payment #${py.id}`,
              subtitle: `₹${py.amount || 0} • Status: ${py.status} • Customer: ${py.customerName}`,
              icon: CreditCard,
              route: `/admin/payments?search=${encodeURIComponent(py.id)}`,
              badge: py.status,
            });
          }
        });
      }
    } catch {
      // Backend error - keep matched navigation results
    } finally {
      setResults(matched);
      setSelectedIndex(0);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelect = (item: SearchResultItem) => {
    onClose();
    navigate({ to: item.route as unknown as "/admin/dashboard" });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3 border-b border-border/60 bg-secondary/30 gap-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search users, products, bookings, payments..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none font-medium"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
          {query && !loading && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-0.5 text-[10px] font-mono font-bold text-muted-foreground border border-border/60 rounded bg-secondary/60 hover:text-foreground"
          >
            ESC
          </button>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-border/20">
          {results.length === 0 && !loading && (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No matching records found across database.
            </div>
          )}

          {results.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            const Icon = item.icon;

            return (
              <div
                key={`${item.category}-${item.id}`}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors text-xs gap-3",
                  isSelected ? "bg-primary text-primary-foreground font-semibold shadow-xs" : "hover:bg-secondary/60 text-foreground"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border",
                      isSelected ? "border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground" : "border-border/60 bg-secondary/80 text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-bold">{item.title}</span>
                      <span
                        className={cn(
                          "text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider border",
                          isSelected ? "bg-primary-foreground/20 text-primary-foreground border-transparent" : "bg-secondary text-muted-foreground border-border/60"
                        )}
                      >
                        {item.category}
                      </span>
                    </div>
                    {item.subtitle && (
                      <p className={cn("truncate text-[11px] font-normal mt-0.5", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.badge && (
                    <span
                      className={cn(
                        "text-[10px] font-mono px-2 py-0.5 rounded-md uppercase font-bold",
                        isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary border border-border/60 text-muted-foreground"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isSelected && <CornerDownLeft className="h-3.5 w-3.5 opacity-70" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="px-4 py-2 border-t border-border/40 bg-secondary/20 flex items-center justify-between text-[11px] text-muted-foreground font-medium">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 text-[9px] font-mono bg-secondary rounded border border-border">↑</kbd>
              <kbd className="px-1 py-0.5 text-[9px] font-mono bg-secondary rounded border border-border">↓</kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-secondary rounded border border-border">↵</kbd>
              <span>to select</span>
            </span>
          </div>
          <span className="font-mono text-[10px]">PAYENT Command Center</span>
        </div>
      </div>
    </div>
  );
}
