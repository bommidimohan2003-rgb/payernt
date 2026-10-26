import { Bell, Check, CheckCheck, Package, Hash, ExternalLink, Filter, Calendar } from "lucide-react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MainLayout } from "@/layouts/MainLayout";
import { Button } from "@/components/common/Button";
import { STORAGE_KEYS, storage } from "@/utils/storage";
import { api } from "@/utils/api";
import { toast } from "sonner";
import type { Notification } from "@/types";

type FilterTab = "all" | "unread" | "bookings";

export default function Notifications() {
  const navigate = useNavigate();
  const [list, setList] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const loadNotifications = useCallback(async (silent = false) => {
    const currentToken = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!currentToken) {
      setLoading(false);
      return;
    }
    try {
      if (!silent) setLoading(true);
      const data = await api.getNotifications(currentToken);
      if (Array.isArray(data)) {
        setList(data);
        storage.set(STORAGE_KEYS.notifications, data);
      }
    } catch (err) {
      if (!silent) console.error("Failed to load notifications:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = storage.get<Notification[]>(STORAGE_KEYS.notifications, []);
    if (cached.length > 0) {
      setList(cached);
      setLoading(false);
    }

    loadNotifications(cached.length > 0);

    const interval = setInterval(() => {
      loadNotifications(true);
    }, 12000);

    const onRefresh = () => loadNotifications(true);
    window.addEventListener("payent_orders_updated", onRefresh);
    window.addEventListener("payent_notifications_updated", onRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("payent_orders_updated", onRefresh);
      window.removeEventListener("payent_notifications_updated", onRefresh);
    };
  }, [loadNotifications]);

  const markSingleRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const currentToken = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!currentToken) return;

    // Optimistic update
    setList((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      storage.set(STORAGE_KEYS.notifications, updated);
      return updated;
    });

    try {
      await api.markNotificationRead(currentToken, id);
      window.dispatchEvent(new CustomEvent("payent_notifications_updated"));
    } catch (err: any) {
      console.warn("Failed to mark single notification as read:", err);
    }
  };

  const markAll = async () => {
    const currentToken = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!currentToken) return;

    // Optimistic update
    setList((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      storage.set(STORAGE_KEYS.notifications, updated);
      return updated;
    });

    try {
      await api.markNotificationsRead(currentToken);
      window.dispatchEvent(new CustomEvent("payent_notifications_updated"));
      toast.success("All notifications marked as read!");
    } catch (err: any) {
      toast.error(err.message || "Failed to mark notifications as read.");
      loadNotifications(true);
    }
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.read) {
      markSingleRead(n.id);
    }

    if (n.link) {
      navigate({ to: n.link as any });
      return;
    }

    if (n.bookingId) {
      navigate({ to: "/orders" as any });
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

  const unreadCount = useMemo(() => list.filter((n) => !n.read).length, [list]);
  const bookingCount = useMemo(() => list.filter((n) => n.bookingId || n.productName).length, [list]);

  const filteredList = useMemo(() => {
    if (activeTab === "unread") {
      return list.filter((n) => !n.read);
    }
    if (activeTab === "bookings") {
      return list.filter((n) => n.bookingId || n.productName);
    }
    return list;
  }, [list, activeTab]);

  return (
    <MainLayout>
      <section className="mx-auto max-w-4xl px-4 md:px-6 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-bold">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Real-time booking confirmations, gear lifecycle updates, and payment alerts
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<CheckCheck className="h-4 w-4" />}
              onClick={markAll}
              className="self-start sm:self-auto cursor-pointer"
            >
              Mark all as read
            </Button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1">
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
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === "all" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
            }`}>
              {list.length}
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
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === "unread" ? "bg-white/20 text-white" : "bg-red-500/20 text-red-500"
              }`}>
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("bookings")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "bookings"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Rentals & Bookings
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === "bookings" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
            }`}>
              {bookingCount}
            </span>
          </button>
        </div>

        {/* Notifications List */}
        <div className="mt-6 space-y-3">
          {filteredList.length === 0 ? (
            <div className="card-premium p-12 text-center border border-dashed border-border rounded-2xl bg-card/60">
              <Bell className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-bold text-base text-foreground">
                {activeTab === "unread" ? "No unread notifications" : "No notifications found"}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                {activeTab === "unread"
                  ? "You're all caught up! New reservation status updates will show here."
                  : "Updates regarding your equipment reservations, pickup milestones, and returns will appear here."}
              </p>
            </div>
          ) : (
            filteredList.map((n) => {
              const isUnread = !n.read;
              const hasAction = Boolean(n.link || n.bookingId);

              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`card-premium p-4 sm:p-5 rounded-2xl border transition-all select-none ${
                    hasAction ? "cursor-pointer hover:border-primary/50 hover:shadow-md" : ""
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
                          : n.type === "warning"
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
                          <h3 className={`text-sm sm:text-base ${isUnread ? "font-bold text-foreground" : "font-semibold text-foreground/90"}`}>
                            {n.title}
                          </h3>
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />
                          )}
                        </div>

                        <span className="text-[11px] text-muted-foreground shrink-0 font-medium whitespace-nowrap">
                          {formatTimestamp(n.createdAt)}
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
                            <span className="truncate max-w-[200px]">{n.productName}</span>
                          </span>
                        )}

                        {n.bookingId && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/80 border border-border text-foreground/90 font-mono text-[11px]">
                            <Hash className="h-3 w-3 text-muted-foreground" />
                            <span>{n.bookingId}</span>
                          </span>
                        )}

                        {hasAction && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline ml-auto">
                            <span>View booking</span>
                            <ExternalLink className="h-3 w-3" />
                          </span>
                        )}

                        {isUnread && (
                          <button
                            type="button"
                            onClick={(e) => markSingleRead(n.id, e)}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground text-[11px] font-medium transition-colors cursor-pointer border border-transparent hover:border-border"
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
              );
            })
          )}
        </div>
      </section>
    </MainLayout>
  );
}
