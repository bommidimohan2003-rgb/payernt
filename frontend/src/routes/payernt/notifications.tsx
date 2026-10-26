import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bell, CheckCircle2, ArrowLeft, Trash2 } from "lucide-react";
import { usePayernt } from "@/payernt/context";
import { getSeoMetadata } from "@/utils/seo";

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

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/payernt" })}
            className="p-2 rounded-xl border border-border bg-card hover:bg-secondary text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-black text-foreground">Notifications</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up"}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllNotificationsRead}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-bold text-primary transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {notifications.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card/50">
            <Bell className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
            <p className="text-sm font-semibold text-foreground">No notifications yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              You will receive updates when borrowers book your gear or KYC changes occur.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => markNotificationRead(n.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                n.read
                  ? "border-border/60 bg-card/60 text-muted-foreground"
                  : "border-primary/40 bg-primary/5 text-foreground font-medium shadow-xs"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${n.read ? "bg-muted" : "bg-primary"}`} />
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{n.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.message}</p>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">{n.timestamp}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Route;
