import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Check, Inbox, Trash } from "lucide-react";
import { notificationsService } from "../../services/notifications";
import { AdminNotification } from "../../services/api";
import { cn } from "@/lib/utils";

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const data = await notificationsService.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const handleRefresh = () => fetchNotifications();
    window.addEventListener("payent:admin:refresh-notifications", handleRefresh);
    return () =>
      window.removeEventListener("payent:admin:refresh-notifications", handleRefresh);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await notificationsService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-9 w-9 flex items-center justify-center rounded-lg text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-elevated)] border border-transparent hover:border-[var(--admin-border)] transition-colors cursor-pointer"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-md bg-[var(--admin-error)] text-[11px] font-mono tabular-nums font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-[var(--admin-card)] rounded-xl shadow-lg border border-[var(--admin-border)] z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--admin-border)]">
              <span className="text-xs font-semibold text-[var(--admin-text)]">
                Notifications
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs font-medium text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>Mark all read</span>
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-64 overflow-y-auto no-scrollbar divide-y divide-[var(--admin-border)]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-[var(--admin-text-muted)]">
                  <Inbox className="h-6 w-6 opacity-50 mb-2" strokeWidth={1.5} />
                  <span className="text-xs font-medium">No unread alerts</span>
                </div>
              ) : (
                notifications.slice(0, 5).map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "px-4 py-3 flex gap-3 hover:bg-[var(--admin-elevated)]/50 transition-colors relative group/item",
                      !n.read && "bg-[var(--admin-elevated)]/30"
                    )}
                  >
                    <div
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        n.type === "success" && "bg-[var(--admin-success)]",
                        n.type === "warning" && "bg-[var(--admin-warning)]",
                        n.type === "error" && "bg-[var(--admin-error)]",
                        n.type === "info" && "bg-[var(--admin-text-muted)]"
                      )}
                    />
                    <div className="flex-1 min-w-0 pr-5">
                      <p className="text-xs font-medium text-[var(--admin-text)] truncate">
                        {n.title}
                      </p>
                      <p className="text-xs text-[var(--admin-text-secondary)] leading-relaxed mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[11px] font-mono tabular-nums text-[var(--admin-text-muted)] mt-1">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <button
                      onClick={(e) => handleDelete(e, n.id)}
                      className="absolute right-3 top-3 opacity-0 group-hover/item:opacity-100 p-1 rounded hover:bg-[var(--admin-elevated)] text-[var(--admin-text-muted)] hover:text-[var(--admin-error)] transition-opacity cursor-pointer"
                      aria-label="Delete notification"
                    >
                      <Trash className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <Link
              to="/admin/notifications"
              onClick={() => setIsOpen(false)}
              className="block text-center py-2.5 bg-[var(--admin-elevated)]/40 text-xs font-medium text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] border-t border-[var(--admin-border)] transition-colors"
            >
              View all notifications
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
