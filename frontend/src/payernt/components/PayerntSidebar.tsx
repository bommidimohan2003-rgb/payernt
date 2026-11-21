import React from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Package,
  Calendar,
  Wallet,
  BarChart3,
  ShieldCheck,
  PlusCircle,
  LayoutDashboard,
} from "lucide-react";

interface PayerntSidebarProps {
  pendingRequestsCount?: number;
  unreadMessagesCount?: number;
  onNavigateTab?: (tab: string, path: string) => void;
  className?: string;
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
  onLogout?: () => void;
}

export function PayerntSidebar({
  pendingRequestsCount = 0,
  onNavigateTab,
  className = "",
  isMobileDrawer = false,
  onCloseMobileDrawer,
}: PayerntSidebarProps) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const currentTab = (() => {
    if (pathname === "/payernt" || pathname === "/payernt/") return "home";
    if (pathname.startsWith("/payernt/products") && !pathname.startsWith("/payernt/products/create")) return "products";
    if (pathname.startsWith("/payernt/list") || pathname.startsWith("/payernt/products/create")) return "list";
    if (pathname.startsWith("/payernt/bookings") || pathname.startsWith("/payernt/requests")) return "bookings";
    if (pathname.startsWith("/payernt/wallet")) return "wallet";
    if (pathname.startsWith("/payernt/analytics") || pathname.startsWith("/payernt/earnings")) return "analytics";
    if (pathname.startsWith("/payernt/kyc")) return "kyc";
    if (pathname.startsWith("/payernt/dashboard")) return "dashboard";
    return "home";
  })();

  const handleNav = (id: string, path: string) => {
    if (onCloseMobileDrawer) onCloseMobileDrawer();
    if (onNavigateTab) {
      onNavigateTab(id, path);
      return;
    }
    navigate({ to: path as any });
  };

  const navItems = [
    { id: "home", label: "Home", icon: Home, path: "/payernt" },
    { id: "products", label: "Products", icon: Package, path: "/payernt/products" },
    { id: "list", label: "Listings Process", icon: PlusCircle, path: "/payernt/list" },
    {
      id: "bookings",
      label: "Bookings",
      icon: Calendar,
      path: "/payernt/bookings",
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
    },
    { id: "wallet", label: "Wallets", icon: Wallet, path: "/payernt/wallet" },
    { id: "analytics", label: "Analytics", icon: BarChart3, path: "/payernt/analytics" },
    { id: "kyc", label: "Aadhaar KYC", icon: ShieldCheck, path: "/payernt/kyc" },
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/payernt/dashboard" },
  ];

  if (isMobileDrawer) {
    return (
      <div className="flex flex-col gap-1.5 p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id, item.path)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-md font-bold"
                  : "text-text-secondary hover:text-text-primary hover:bg-secondary"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`h-4 min-w-4 px-1 rounded-full text-[10px] font-extrabold flex items-center justify-center ${
                  isActive
                    ? "bg-white/20 text-white dark:bg-black/20 dark:text-neutral-950"
                    : "bg-secondary text-foreground"
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <aside
      className={`hidden sm:flex flex-col items-center justify-start py-3 px-2 w-14 sm:w-16 shrink-0 self-start h-fit sticky rounded-3xl bg-surface-navigation border border-border shadow-elevation-1 backdrop-blur-xl transition-all duration-200 z-30 ${className}`}
      style={{ top: "max(84px, calc(50vh - 220px))" }}
      aria-label="Lender Navigation"
    >
      {/* Top Main Navigation Stack */}
      <div className="flex flex-col items-center gap-2 w-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id, item.path)}
              className={`relative group flex items-center justify-center h-11 w-11 rounded-2xl transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-md scale-102 font-bold"
                  : "text-text-secondary hover:text-text-primary hover:bg-secondary border border-transparent"
              }`}
              title={item.label}
              aria-label={item.label}
            >
              <Icon className="h-4.5 w-4.5 stroke-[1.8]" />
              {item.badge !== undefined && (
                <span className={`absolute -top-1 -right-1 flex h-3.5 min-w-3.5 px-0.5 items-center justify-center rounded-full text-[9px] font-black shadow-xs ${
                  isActive
                    ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 border border-white dark:border-neutral-900"
                    : "bg-destructive text-white"
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export default PayerntSidebar;
