import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Check,
  CheckCheck,
  Package,
  Hash,
  ExternalLink,
  Calendar,
  Trash2,
  Wallet,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { useState, useMemo } from "react";
import { usePayernt } from "@/payernt/context";
import { getSeoMetadata } from "@/utils/seo";
import { Button } from "@/components/common/Button";
import { BackButton } from "@/components/common/BackButton";
import { SwipeRow } from "@/components/reactbits/SwipeRow";
import type { LenderNotification } from "@/payernt/types";

export const Route = createFileRoute("/payernt/notifications")({
  head: () =>
    getSeoMetadata({
      title: "Lender Notifications | Payernt",
      description: "Review system notices, rental status changes and platform updates.",
      path: "/payernt/notifications",
    }),
  component: PayerntNotificationsRoute,
});

type FilterTab = "all" | "unread" | "requests" | "wallet";

function PayerntNotificationsRoute() {
  const navigate = useNavigate();
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
  } = usePayernt();

  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const requestCount = useMemo(
    () =>
      notifications.filter(
        (n) =>
          n.bookingId ||
          n.productName ||
          n.actionRoute === "requests" ||
          n.actionRoute === "bookings"
      ).length,
    [notifications]
  );

  const walletCount = useMemo(
    () =>
      notifications.filter(
        (n) =>
          n.actionRoute === "wallet" ||
          n.title.toLowerCase().includes("payout") ||
          n.title.toLowerCase().includes("earning") ||
          n.message.toLowerCase().includes("wallet") ||
          n.message.toLowerCase().includes("credited")
      ).length,
    [notifications]
  );

  const filteredList = useMemo(() => {
    if (activeTab === "unread") {
      return notifications.filter((n) => !n.read);
    }
    if (activeTab === "requests") {
      return notifications.filter(
        (n) =>
          n.bookingId ||
          n.productName ||
          n.actionRoute === "requests" ||
          n.actionRoute === "bookings"
      );
    }
    if (activeTab === "wallet") {
      return notifications.filter(
        (n) =>
          n.actionRoute === "wallet" ||
          n.title.toLowerCase().includes("payout") ||
          n.title.toLowerCase().includes("earning") ||
          n.message.toLowerCase().includes("wallet") ||
          n.message.toLowerCase().includes("credited")
      );
    }
    return notifications;
  }, [notifications, activeTab]);

  const handleNotificationClick = (n: LenderNotification) => {
    if (!n.read) {
      markNotificationRead(n.id);
    }

    if (n.link) {
      navigate({ to: n.link as any });
      return;
    }

    if (n.actionRoute) {
      navigate({ to: `/payernt/${n.actionRoute}` as any });
      return;
    }

    if (n.bookingId) {
      navigate({ to: "/payernt/bookings" as any });
      return;
    }
  };

  const formatTimestamp = (isoString?: string) => {
    if (!isoString) return "Recently";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Top-left Back Navigation */}
      <div className="flex items-center justify-start">
        <BackButton fallback="/payernt" />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground font-display">
                Lender Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Payernt Lender Notifications — Real-time booking requests, gear lifecycle milestones, handovers, returns, and wallet payouts
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            leftIcon={<CheckCheck className="h-4 w-4" />}
            onClick={markAllNotificationsRead}
            className="self-start sm:self-auto cursor-pointer"
          >
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "all"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          All
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              activeTab === "all"
                ? "bg-white/20 text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {notifications.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("unread")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "unread"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          Unread
          {unreadCount > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === "unread"
                  ? "bg-white/20 text-white"
                  : "bg-red-500/20 text-red-500"
              }`}
            >
              {unreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("requests")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "requests"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          Booking Requests
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              activeTab === "requests"
                ? "bg-white/20 text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {requestCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("wallet")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "wallet"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          Wallet &amp; Payouts
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              activeTab === "wallet"
                ? "bg-white/20 text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {walletCount}
          </span>
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="card-premium p-12 text-center border border-dashed border-border rounded-2xl bg-card/60">
            <Bell className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-bold text-base text-foreground">
              {activeTab === "unread"
                ? "No unread lender notifications"
                : "No lender notifications found"}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              {activeTab === "unread"
                ? "You're all caught up! New reservation status updates, handover codes, and payout notices will show here."
                : "Updates regarding your equipment reservations, pickup milestones, and payout settlements will appear here."}
            </p>
          </div>
        ) : (
          filteredList.map((n) => {
            const isUnread = !n.read;
            const hasAction = Boolean(n.actionRoute || n.bookingId || n.link);

            const swipeActions = [
              ...(isUnread
                ? [
                    {
                      label: "Read",
                      icon: <Check className="h-4 w-4" />,
                      variant: "success" as const,
                      onClick: () => markNotificationRead(n.id),
                    },
                  ]
                : []),
              ...(hasAction
                ? [
                    {
                      label: "Open",
                      icon: <ExternalLink className="h-4 w-4" />,
                      variant: "default" as const,
                      onClick: () => handleNotificationClick(n),
                    },
                  ]
                : []),
              {
                label: "Delete",
                icon: <Trash2 className="h-4 w-4" />,
                variant: "destructive" as const,
                onClick: () => deleteNotification(n.id),
              },
            ];

            return (
              <SwipeRow key={n.id} actions={swipeActions} className="rounded-2xl">
                <div
                  onClick={() => handleNotificationClick(n)}
                  className={`card-premium p-4 sm:p-5 rounded-2xl border transition-all select-none ${
                    hasAction
                      ? "cursor-pointer hover:border-primary/50 hover:shadow-md"
                      : ""
                  } ${
                    isUnread
                      ? "border-primary/40 bg-primary/[0.03] dark:bg-primary/[0.04] shadow-xs"
                      : "border-border/70 bg-card/70 opacity-90"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Status Icon */}
                    <div
                      className={`h-10 w-10 rounded-xl border grid place-items-center shrink-0 mt-0.5 ${
                        n.type === "success"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : n.type === "warning" || n.type === "alert"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          : "bg-primary/10 text-primary border-primary/20"
                      }`}
                    >
                      <Bell className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3
                            className={`text-sm sm:text-base ${
                              isUnread
                                ? "font-bold text-foreground"
                                : "font-semibold text-foreground/90"
                            }`}
                          >
                            {n.title}
                          </h3>
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />
                          )}
                        </div>

                        <span className="text-[11px] text-muted-foreground shrink-0 font-medium whitespace-nowrap">
                          {formatTimestamp(n.timestamp)}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                        {n.message}
                      </p>

                      {/* Metadata Badges */}
                      <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
                        {n.productName && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/80 border border-border text-foreground/90 font-medium text-[11px]">
                            <Package className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate max-w-[200px]">
                              {n.productName}
                            </span>
                          </span>
                        )}

                        {n.bookingId && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/80 border border-border text-foreground/90 font-mono text-[11px]">
                            <Hash className="h-3 w-3 text-muted-foreground" />
                            <span>{n.bookingId}</span>
                          </span>
                        )}

                        {n.actionRoute === "wallet" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px]">
                            <Wallet className="h-3 w-3" />
                            <span>Wallet Payout</span>
                          </span>
                        )}

                        {hasAction && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline ml-auto">
                            <span>Open details</span>
                            <ExternalLink className="h-3 w-3" />
                          </span>
                        )}

                        {isUnread && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              markNotificationRead(n.id);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground text-[11px] font-medium transition-colors cursor-pointer border border-transparent hover:border-border"
                            title="Mark as read"
                          >
                            <Check className="h-3 w-3" />
                            <span>Mark read</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(n.id);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 text-[11px] font-medium transition-colors cursor-pointer border border-transparent hover:border-red-500/20"
                          title="Delete notification"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </SwipeRow>
            );
          })
        )}
      </div>
    </section>
  );
}

export default Route;
