import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Plus,
  Bell,
  CheckCircle2,
  AlertCircle,
  Info,
  Clock,
  ExternalLink,
  ChevronRight,
  Menu,
  X,
  ShieldCheck,
  Sparkles,
  Layers,
  UserCheck,
  Sun,
  Moon,
  LogOut,
  Wallet,
  Calendar,
  User,
  LayoutDashboard,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { LenderNotification, DemoUser, PayerntAccount } from "../types";
import { useTheme } from "@/hooks/useTheme";

interface PayerntNavbarProps {
  activeTab?: "home" | "products" | "requests" | "wallet" | "profile" | "list" | "messages" | "analytics" | "settings" | "help";
  onTabChange?: (tab: "home" | "products" | "requests" | "wallet" | "profile" | "list" | "messages" | "analytics" | "settings" | "help") => void;
  pendingRequestsCount?: number;
  notifications?: LenderNotification[];
  onMarkNotificationRead?: (id: string) => void;
  onMarkAllNotificationsRead?: () => void;
  onResetDemo?: () => void;
  activeUser?: DemoUser;
  activeAccount?: PayerntAccount | null;
  onLogout?: () => void;
}

export function PayerntNavbar({
  activeTab: propActiveTab,
  onTabChange,
  pendingRequestsCount = 0,
  notifications = [],
  onMarkNotificationRead = () => {},
  onMarkAllNotificationsRead = () => {},
  onResetDemo = () => {},
  activeUser,
  activeAccount,
  onLogout,
}: PayerntNavbarProps) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggle: toggleTheme } = useTheme();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const displayName = activeAccount?.name || activeUser?.fullName || activeUser?.name || "Vendor";

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute active tab from route pathname
  const currentTab = (() => {
    if (propActiveTab) return propActiveTab;
    if (pathname === "/payernt" || pathname === "/payernt/") return "home";
    if (pathname.startsWith("/payernt/products/create") || pathname === "/payernt/list") return "list";
    if (pathname.startsWith("/payernt/products")) return "products";
    if (pathname.startsWith("/payernt/bookings") || pathname.startsWith("/payernt/requests")) return "requests";
    if (pathname.startsWith("/payernt/wallet")) return "wallet";
    if (pathname.startsWith("/payernt/messages")) return "messages";
    if (pathname.startsWith("/payernt/analytics") || pathname.startsWith("/payernt/earnings")) return "analytics";
    if (pathname.startsWith("/payernt/profile")) return "profile";
    if (pathname.startsWith("/payernt/settings")) return "settings";
    if (pathname.startsWith("/payernt/help")) return "help";
    return "home";
  })();

  const handleNav = (tab: "home" | "products" | "requests" | "wallet" | "profile" | "list" | "messages" | "analytics" | "settings" | "help", path: string) => {
    if (onTabChange) {
      onTabChange(tab);
      // Stay on /payernt — tab-based SPA, no router navigation needed
      return;
    }
    navigate({ to: path as any });
  };

  const navItems: { id: "home" | "products" | "requests" | "wallet" | "profile"; label: string; path: string; badge?: number }[] = [
    { id: "home", label: "Home", path: "/payernt" },
    { id: "products", label: "My Products", path: "/payernt/products" },
    { id: "requests", label: "Rental Requests", path: "/payernt/bookings", badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined },
    { id: "wallet", label: "Wallet", path: "/payernt/wallet" },
    { id: "profile", label: "Profile", path: "/payernt/profile" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/90 backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Section */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => {
              if (pathname === "/payernt" || pathname === "/payernt/") {
                navigate({ to: "/" });
              } else {
                handleNav("home", "/payernt");
              }
            }}
            className="group flex items-center gap-2.5 text-left cursor-pointer focus:outline-none"
            title={pathname === "/payernt" || pathname === "/payernt/" ? "Click to return to Gateway" : "Click to go to Lender Home"}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background font-black text-lg tracking-tight transition-transform group-hover:scale-105 shadow-sm">
              ₹
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold tracking-tight text-xl text-foreground leading-none font-display">
                paye<span className="font-black font-serif">₹</span>nt
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-none mt-0.5">
                Product Owner Platform
              </span>
            </div>
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id, item.path)}
                  className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    isActive
                      ? "text-foreground font-bold bg-secondary/80"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  }`}
                >
                  <span className="relative z-10 flex items-center gap-1.5">
                    {item.label}
                    {item.badge !== undefined && (
                      <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-primary-foreground">
                        {item.badge}
                      </span>
                    )}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="payerntNavIndicator"
                      className="absolute inset-0 rounded-lg bg-secondary/80 -z-0"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Action Hub */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* User Profile Pill */}
          <button
            onClick={() => handleNav("profile", "/payernt/profile")}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-secondary text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs"
            title="View Profile"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black text-[9px]">
              {displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "LD"}
            </div>
            <span className="hidden sm:inline font-bold text-xs max-w-[120px] truncate">{displayName}</span>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-card hover:bg-secondary text-foreground transition-all cursor-pointer"
              aria-label="View notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground shadow-xs animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Drawer Popover */}
            <AnimatePresence>
              {isNotifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-card shadow-2xl p-4 z-50 text-left space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-border/70 pb-2">
                    <span className="font-bold text-xs">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={onMarkAllNotificationsRead}
                        className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No notifications yet.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => onMarkNotificationRead(n.id)}
                          className={`p-2.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                            n.read
                              ? "border-border/60 bg-secondary/20 text-muted-foreground"
                              : "border-primary/30 bg-primary/5 text-foreground font-medium"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs">{n.title}</span>
                            <span className="text-[10px] text-muted-foreground">{n.timestamp}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Theme Toggle Button (Dark / Light Mode) */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-card hover:bg-secondary text-foreground transition-all cursor-pointer shadow-2xs"
            aria-label={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="h-4 w-4 text-foreground/80 hover:-rotate-12 transition-transform" />
            )}
          </button>

          {/* Primary Action CTA: List Product */}
          <button
            onClick={() => handleNav("list", "/payernt/products/create")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-foreground text-background font-bold text-xs shadow-sm hover:opacity-90 active:scale-98 transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            <span className="hidden sm:inline">List Product</span>
            <span className="sm:hidden">List</span>
          </button>

          {/* Logout Button (Desktop) */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-card hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors cursor-pointer"
              title="Log Out from paye₹nt"
              aria-label="Log Out from paye₹nt"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-foreground"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-background/95 px-4 py-3 space-y-2"
          >
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleNav(item.id, item.path);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Mobile Theme Toggle Item */}
            <div className="pt-2 border-t border-border/60 flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Theme</span>
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-foreground cursor-pointer"
              >
                {theme === "dark" ? (
                  <>
                    <Sun className="h-3.5 w-3.5 text-amber-400" />
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-3.5 w-3.5 text-foreground/80" />
                    <span>Dark Mode</span>
                  </>
                )}
              </button>
            </div>

            {/* Mobile Logout Action */}
            {onLogout && (
              <div className="pt-2 border-t border-border/60">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log Out of paye₹nt</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export default PayerntNavbar;
