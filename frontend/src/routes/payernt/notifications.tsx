import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bell, CheckCircle2, ArrowLeft, Package, Hash, ExternalLink, Check } from "lucide-react";
import { useState, useMemo } from "react";
import { usePayernt } from "@/payernt/context";
import { getSeoMetadata } from "@/utils/seo";
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

function PayerntNotificationsRoute() {
  const navigate = useNavigate();
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
  } = usePayernt();

  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "requests">("all");

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const requestCount = useMemo(() => notifications.filter((n) => n.bookingId || n.productName || n.actionRoute === "requests").length, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "unread") {
      return notifications.filter((n) => !n.read);
    }
    if (activeFilter === "requests") {
      return notifications.filter((n) => n.bookingId || n.productName || n.actionRoute === "requests");
    }
    return notifications;
  }, [notifications, activeFilter]);

  const handleNotificationClick = (n: LenderNotification) => {
    if (!n.read) {
      markNotificationRead(n.id);
    }

    if (n.actionRoute) {
      navigate({ to: `/payernt/${n.actionRoute}` as any });
      return;
    }

    if (n.bookingId) {
      navigate({ to: "/payernt/requests" as any });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/payernt" })}
            className="p-2 rounded-xl border border-border bg-card hover:bg-secondary text-foreground transition-colors cursor-pointer"
            title="Back to Lender Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-foreground">Notifications</h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-bold">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review booking requests, rental status changes, returns, and wallet payouts
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllNotificationsRead}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-bold text-primary transition-all cursor-pointer self-start sm:self-auto"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveFilter("all")}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeFilter === "all"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          All
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            activeFilter === "all" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
          }`}>
            {notifications.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("unread")}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeFilter === "unread"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          Unread
          {unreadCount > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeFilter === "unread" ? "bg-white/20 text-white" : "bg-red-500/20 text-red-500"
            }`}>
              {unreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("requests")}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeFilter === "requests"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          Booking Requests
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            activeFilter === "requests" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
          }`}>
            {requestCount}
          </span>
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card/50">
            <Bell className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
            <p className="text-sm font-semibold text-foreground">
              {activeFilter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {activeFilter === "unread"
                ? "You're all caught up with booking decisions and handover alerts."
                : "You will receive updates when borrowers book your gear, initiate returns, or escrow payouts settle."}
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => {
            const isUnread = !n.read;
            const hasAction = Boolean(n.actionRoute || n.bookingId);

            return (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-4 rounded-2xl border transition-all ${
                  hasAction ? "cursor-pointer hover:border-primary/50 hover:shadow-xs" : ""
                } ${
                  isUnread
                    ? "border-primary/40 bg-primary/5 text-foreground font-medium shadow-xs"
                    : "border-border/60 bg-card/60 text-muted-foreground"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${isUnread ? "bg-primary animate-pulse" : "bg-muted"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-foreground truncate">{n.title}</h3>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">{n.timestamp}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.message}</p>

                      {/* Product and Booking Pills */}
                      <div className="mt-2.5 flex items-center gap-2 flex-wrap text-xs">
                        {n.productName && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary border border-border text-foreground/90 font-medium text-[11px]">
                            <Package className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate max-w-[200px]">{n.productName}</span>
                          </span>
                        )}

                        {n.bookingId && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary border border-border text-foreground/90 font-mono text-[11px]">
                            <Hash className="h-3 w-3 text-muted-foreground" />
                            <span>{n.bookingId}</span>
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
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground text-[11px] font-medium transition-colors cursor-pointer"
                            title="Mark as read"
                          >
                            <Check className="h-3 w-3" />
                            <span>Mark read</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Route;
