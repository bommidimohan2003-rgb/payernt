import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  Shield,
  CreditCard,
  User,
  Package,
  LifeBuoy,
  RefreshCw,
  Clock,
  Info,
  ShieldAlert,
} from "lucide-react";
import { notificationsService } from "../services/notifications";
import { AdminNotification } from "../services/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { adminWS } from "../services/websocket";

export default function Notifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const fetchNotifications = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const data = await notificationsService.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error(err);
      if (!silent) setError("Failed to load notifications from server.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    const unsubWS = adminWS.onEvent(() => {
      fetchNotifications(true);
    });

    return () => {
      unsubWS();
    };
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success("All notifications marked as read.");
    } catch {
      toast.error("Failed to update notification states.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationsService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.info("Notification removed.");
    } catch {
      toast.error("Failed to delete notification.");
    }
  };

  const filteredNotifications = useMemo(() => {
    let result = [...notifications];

    if (categoryFilter !== "all") {
      result = result.filter((n) => {
        const titleLower = (n.title || "").toLowerCase();
        const msgLower = (n.message || "").toLowerCase();
        if (categoryFilter === "unread") {
          return !n.read;
        }
        if (categoryFilter === "system") {
          return titleLower.includes("system") || titleLower.includes("server") || titleLower.includes("database");
        }
        if (categoryFilter === "user") {
          return titleLower.includes("user") || titleLower.includes("account") || titleLower.includes("agent");
        }
        if (categoryFilter === "marketplace") {
          return titleLower.includes("product") || titleLower.includes("gear") || titleLower.includes("booking") || titleLower.includes("listing");
        }
        if (categoryFilter === "security") {
          return titleLower.includes("security") || titleLower.includes("auth") || n.type === "error";
        }
        return true;
      });
    }

    return result;
  }, [notifications, categoryFilter]);

  const tabCounts = useMemo(() => {
    return {
      all: notifications.length,
      unread: notifications.filter((n) => !n.read).length,
      system: notifications.filter((n) => (n.title || "").toLowerCase().includes("system") || (n.title || "").toLowerCase().includes("server")).length,
      bookings: notifications.filter((n) => (n.title || "").toLowerCase().includes("booking") || (n.title || "").toLowerCase().includes("order")).length,
      users: notifications.filter((n) => (n.title || "").toLowerCase().includes("user") || (n.title || "").toLowerCase().includes("agent")).length,
    };
  }, [notifications]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F5F5]">
            Notifications
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-0.5 font-medium">
            Send and manage platform notifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {tabCounts.unread > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(161,161,170,0.18)] bg-[#10151B] hover:bg-[#171C23] text-[#F5F5F5] text-xs font-medium transition-colors cursor-pointer"
            >
              <CheckCheck className="h-3.5 w-3.5 text-[#A1A1AA]" />
              <span>Mark all read</span>
            </button>
          )}

          <button
            onClick={() => fetchNotifications()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(161,161,170,0.18)] bg-[#10151B] hover:bg-[#171C23] text-[#F5F5F5] text-xs font-medium transition-colors cursor-pointer"
            title="Refresh notifications"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-[#A1A1AA]", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              toast.info("Notification composer ready.");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition-colors cursor-pointer"
          >
            <Bell className="h-3.5 w-3.5" />
            <span>Send Notification</span>
          </button>
        </div>
      </div>

      {/* TABS (Panel 11): All | Unread | System | Bookings | Users */}
      <div className="flex items-center gap-2 border-b border-[rgba(161,161,170,0.18)] pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: "all", label: "All", count: tabCounts.all },
          { id: "unread", label: "Unread", count: tabCounts.unread },
          { id: "system", label: "System", count: tabCounts.system },
          { id: "marketplace", label: "Bookings", count: tabCounts.bookings },
          { id: "user", label: "Users", count: tabCounts.users },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCategoryFilter(tab.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-2",
              categoryFilter === tab.id
                ? "bg-white text-black font-semibold shadow-xs"
                : "text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-white/5 border border-transparent"
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                categoryFilter === tab.id ? "bg-black/15 text-black font-bold" : "bg-white/10 text-[#A1A1AA]"
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ERROR STATE */}
      {error && !loading ? (
        <div className="bg-[#10151B] rounded-xl border border-red-500/20 p-8 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#F5F5F5]">Database Sync Failed</h3>
            <p className="text-xs text-[#A1A1AA] mt-1 max-w-sm">{error}</p>
          </div>
          <button
            onClick={() => fetchNotifications()}
            className="px-4 py-2 rounded-lg bg-[#171C23] hover:bg-[#171C23]/80 text-[#F5F5F5] text-xs font-medium transition-colors border border-[rgba(161,161,170,0.18)] cursor-pointer"
          >
            Retry Database Fetch
          </button>
        </div>
      ) : (
        /* NOTIFICATIONS TABLE (Panel 11) */
        <div className="bg-[#10151B] rounded-xl border border-[rgba(161,161,170,0.18)] overflow-hidden">
          {filteredNotifications.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#A1A1AA] space-y-2">
              <Bell className="h-5 w-5 text-[#A1A1AA] mx-auto opacity-40" />
              <p>No notifications found in this view.</p>
            </div>
          ) : (
            <div className="divide-y divide-[rgba(161,161,170,0.1)]">
              {filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    "p-4 flex items-center justify-between gap-4 transition-colors",
                    !notif.read ? "bg-white/[0.02]" : "hover:bg-white/[0.01]"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        !notif.read ? "bg-red-500" : "bg-neutral-600"
                      )}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#F5F5F5] truncate">
                        {notif.title}
                      </div>
                      <div className="text-[11px] text-[#A1A1AA] line-clamp-1 mt-0.5">
                        {notif.message}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#171C23] text-[#A1A1AA] border border-[rgba(161,161,170,0.18)]">
                      {notif.type || "System"}
                    </span>
                    <span className="text-[11px] font-mono text-[#A1A1AA]">
                      {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recent"}
                    </span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                        !notif.read ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-neutral-800 text-neutral-400"
                      )}
                    >
                      {!notif.read ? "Unread" : "Read"}
                    </span>
                    <button
                      onClick={() => handleDelete(notif.id)}
                      className="p-1 rounded text-[#A1A1AA] hover:text-red-400 transition-colors cursor-pointer"
                      title="Dismiss"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
