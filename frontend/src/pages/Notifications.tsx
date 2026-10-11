import { Bell, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { MainLayout } from "@/layouts/MainLayout";
import { Button } from "@/components/common/Button";
import { STORAGE_KEYS, storage } from "@/utils/storage";
import { api } from "@/utils/api";
import { toast } from "sonner";
import type { Notification } from "@/types";

export default function Notifications() {
  const [list, setList] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = storage.get<Notification[]>(STORAGE_KEYS.notifications, []);
    if (cached.length > 0) setList(cached);

    const currentToken = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!currentToken) {
      setLoading(false);
      return;
    }
    api
      .getNotifications(currentToken)
      .then((data) => {
        setList(data);
        storage.set(STORAGE_KEYS.notifications, data);
      })
      .catch((err) => console.error("Failed to load notifications:", err))
      .finally(() => setLoading(false));
  }, []);

  const markAll = () => {
    const currentToken = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!currentToken) return;
    api
      .markNotificationsRead(currentToken)
      .then(() => {
        setList((prev) => {
          const updated = prev.map((n) => ({ ...n, read: true }));
          storage.set(STORAGE_KEYS.notifications, updated);
          return updated;
        });
        toast.success("All notifications marked as read!");
      })
      .catch((err) =>
        toast.error(err.message || "Failed to mark notifications as read."),
      );
  };

  return (
    <MainLayout>
      <section className="mx-auto max-w-3xl px-4 md:px-6 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
            <Bell className="h-7 w-7" /> Notifications
          </h1>
          {list.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Check className="h-4 w-4" />}
              onClick={markAll}
            >
              Mark all read
            </Button>
          )}
        </div>

        <div className="mt-8 space-y-3">
          {list.length === 0 ? (
            <div className="card-premium p-12 text-center text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-semibold text-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                You're all caught up! Updates regarding your gear rentals and messages will appear here.
              </p>
            </div>
          ) : (
            list.map((n) => (
              <div
                key={n.id}
                className={`card-premium p-5 flex gap-4 ${!n.read ? "border-primary/40" : ""}`}
              >
                <div
                  className={`h-10 w-10 rounded-xl border grid place-items-center shrink-0 ${
                    n.type === "success"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : n.type === "warning"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      : "bg-secondary text-foreground border-border"
                  }`}
                >
                  <Bell className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{n.title}</h3>
                    <span className="text-xs text-muted-foreground">
                      {n.createdAt}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {n.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </MainLayout>
  );
}
