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
  ShieldCheck,
  User,
  Settings,
  X,
  Loader2,
  KeyRound,
  BookOpen,
  CornerDownLeft,
} from "lucide-react";
import { adminApi, AdminUser, AdminProduct, AdminBooking, AdminPayment } from "../../services/api";
import { cn } from "@/lib/utils";
import { ADMIN_SEARCH_PHRASES, useTypewriterText } from "./SearchBar";
import { PayentAgentIcon } from "@/components/common/PayentAgentIcon";

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
  { id: "p-dash", category: "Navigation", title: "Dashboard", subtitle: "Marketplace operations and review queue", icon: LayoutDashboard, route: "/admin/dashboard" },
  { id: "p-analytics", category: "Navigation", title: "Analytics", subtitle: "Booking trends, utilization, and revenue", icon: BarChart3, route: "/admin/analytics" },
  { id: "p-users", category: "Navigation", title: "Users", subtitle: "Account approvals and status", icon: Users, route: "/admin/users" },
  { id: "p-kyc", category: "Navigation", title: "KYC verification", subtitle: "Aadhaar and PAN document inspection", icon: ShieldCheck, route: "/admin/kyc" },
  { id: "p-agents", category: "Navigation", title: "Agents", subtitle: "Equipment lenders and fleet revenue", icon: Users, route: "/admin/agents" },
  { id: "p-products", category: "Navigation", title: "Products", subtitle: "Equipment listings and pricing review", icon: Package, route: "/admin/products" },
  { id: "p-categories", category: "Navigation", title: "Categories", subtitle: "Equipment taxonomy", icon: Grid, route: "/admin/categories" },
  { id: "p-knowledge", category: "Navigation", title: "Knowledge base", subtitle: "Support retrieval articles and drafts", icon: PayentAgentIcon as any, route: "/admin/knowledge" },
  { id: "p-bookings", category: "Navigation", title: "Bookings", subtitle: "Rental orders and handover tracking", icon: Calendar, route: "/admin/bookings" },
  { id: "p-payments", category: "Navigation", title: "Payments", subtitle: "Settlements, payouts, and refunds", icon: CreditCard, route: "/admin/payments" },
  { id: "p-reviews", category: "Navigation", title: "Reviews", subtitle: "Customer feedback and ratings", icon: Star, route: "/admin/reviews" },
  { id: "p-reports", category: "Navigation", title: "Reports", subtitle: "Data exports and dispute claims", icon: Flag, route: "/admin/reports" },
  { id: "p-notifs", category: "Navigation", title: "Notifications", subtitle: "System alerts and events", icon: Bell, route: "/admin/notifications" },
  { id: "p-support", category: "Navigation", title: "Support", subtitle: "Customer inquiries and help tickets", icon: LifeBuoy, route: "/admin/support" },
  { id: "p-logs", category: "Navigation", title: "Activity logs", subtitle: "Administrative audit trail", icon: Shield, route: "/admin/activity-logs" },
  { id: "p-pin-verify", category: "Navigation", title: "PIN verification", subtitle: "Verify vendor and renter 8-digit code", icon: KeyRound, route: "/admin/pin-verification" },
  { id: "p-profile", category: "Navigation", title: "Profile", subtitle: "Administrator credentials", icon: User, route: "/admin/profile" },
  { id: "p-settings", category: "Navigation", title: "Settings", subtitle: "Platform configuration and theme", icon: Settings, route: "/admin/settings" },
];

export function CommandSearchModal({ open, onClose }: CommandSearchModalProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { text: animatedPlaceholder } = useTypewriterText(
    ADMIN_SEARCH_PHRASES,
    !open || query.length > 0
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  const performSearch = useCallback(async (q: string) => {
    const trimmed = q.trim().toLowerCase();
    if (!trimmed) {
      setResults(PAGES.slice(0, 7));
      return;
    }

    setLoading(true);
    const matched: SearchResultItem[] = [];

    PAGES.forEach((p) => {
      if (p.title.toLowerCase().includes(trimmed) || (p.subtitle && p.subtitle.toLowerCase().includes(trimmed))) {
        matched.push(p);
      }
    });

    try {
      const [usersRes, prodsRes, bookingsRes, paymentsRes] = await Promise.allSettled([
        adminApi.get("/users"),
        adminApi.get("/products"),
        adminApi.get("/bookings"),
        adminApi.get("/payments"),
      ]);

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
              subtitle: `${u.email} · ${u.role || "user"} · ${u.status || "active"}`,
              icon: Users,
              route: `/admin/users?search=${encodeURIComponent(u.email || u.fullName)}`,
              badge: u.role,
            });
          }
        });
      }

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
              subtitle: `${p.category || "Gear"} · ₹${(p.price || 0).toLocaleString("en-IN")}/day`,
              icon: Package,
              route: `/admin/products?search=${encodeURIComponent(p.title || p.id)}`,
              badge: p.status,
            });
          }
        });
      }

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
              subtitle: `${b.productTitle || "Gear"} · ${b.customerName} · ₹${(b.amount || 0).toLocaleString("en-IN")}`,
              icon: Calendar,
              route: `/admin/bookings?search=${encodeURIComponent(b.id)}`,
              badge: b.status,
            });
          }
        });
      }

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
              subtitle: `₹${(py.amount || 0).toLocaleString("en-IN")} · ${py.customerName}`,
              icon: CreditCard,
              route: `/admin/payments?search=${encodeURIComponent(py.id)}`,
              badge: py.status,
            });
          }
        });
      }
    } catch {
      // Keep page results if network search fails
    } finally {
      setResults(matched);
      setSelectedIndex(0);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 180);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

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
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/50"
    >
      <div
        className="w-full max-w-2xl bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 h-12 border-b border-[var(--admin-border)] bg-[var(--admin-elevated)]/50 gap-3">
          <Search className="h-4 w-4 text-[var(--admin-text-muted)] shrink-0" strokeWidth={1.5} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={animatedPlaceholder || "Search pages, users, products, or bookings"}
            className="flex-1 bg-transparent text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)] focus:outline-none"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-[var(--admin-text-muted)] shrink-0" />}
          {query && !loading && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="px-2 py-1 rounded-md text-xs font-medium text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-elevated)] transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-md text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-elevated)] transition-colors cursor-pointer"
            aria-label="Close search"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {results.length === 0 && !loading && (
            <div className="py-12 text-center text-xs text-[var(--admin-text-muted)]">
              No matching records found
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
                  "flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-xs gap-3",
                  isSelected
                    ? "bg-[var(--admin-elevated)] text-[var(--admin-text)] border border-[var(--admin-border)]"
                    : "hover:bg-[var(--admin-elevated)]/50 text-[var(--admin-text)] border border-transparent"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border border-[var(--admin-border)] bg-[var(--admin-card)] text-[var(--admin-text-secondary)]">
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{item.title}</span>
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--admin-card)] text-[var(--admin-text-muted)] border border-[var(--admin-border)]">
                        {item.category}
                      </span>
                    </div>
                    {item.subtitle && (
                      <p className="truncate text-xs text-[var(--admin-text-secondary)] mt-0.5 tabular-nums">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.badge && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-[var(--admin-border)] bg-[var(--admin-card)] text-[var(--admin-text-secondary)] capitalize">
                      {item.badge}
                    </span>
                  )}
                  {isSelected && <CornerDownLeft className="h-3.5 w-3.5 text-[var(--admin-text-muted)]" strokeWidth={1.5} />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Status Bar */}
        <div className="px-4 py-2 border-t border-[var(--admin-border)] bg-[var(--admin-elevated)]/40 flex items-center justify-between text-xs text-[var(--admin-text-muted)]">
          <span className="tabular-nums">
            {results.length} {results.length === 1 ? "result" : "results"}
          </span>
          <span className="font-mono text-xs">Payent Admin</span>
        </div>
      </div>
    </div>
  );
}
