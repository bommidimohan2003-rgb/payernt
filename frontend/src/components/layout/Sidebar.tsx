import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Heart,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { LogoIcon } from "@/components/common/LogoIcon";

const baseItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { to: "/orders", icon: Package, label: "Orders & Bookings" },
  { to: "/wishlist", icon: Heart, label: "Wishlist" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/messages", icon: MessageSquare, label: "Messages" },
  { to: "/profile", icon: User, label: "Profile" },
  { to: "/settings", icon: Settings, label: "Settings" },
] as const;

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const { unreadCount } = useUnreadMessages();

  const sidebarItems = baseItems;

  return (
    <aside className="hidden lg:block w-64 shrink-0 sticky top-20 h-fit">
      <nav className="card-premium p-3 space-y-1 bg-white/90 dark:bg-[#0D151D]/90 backdrop-blur-md border border-black/10 dark:border-white/10 rounded-3xl shadow-sm">
        {/* Brand Area */}
        <div className="px-3 py-2.5 mb-2 border-b border-black/5 dark:border-white/5">
          <LogoIcon showTagline={true} />
        </div>

        {sidebarItems.map((it) => {
          const active = pathname === it.to;
          const isMessages = it.to === "/messages";
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-medium transition-all",
                active
                  ? "bg-[#161616] text-[#FFFFFF] dark:bg-white/12 dark:text-white dark:border dark:border-white/15 shadow-sm font-bold"
                  : "text-neutral-600 dark:text-[#AAB3BC] hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100/80 dark:hover:bg-white/5",
              )}
            >
              <div className="flex items-center gap-3">
                <it.icon className={cn("h-4 w-4", active ? "text-emerald-400" : "text-neutral-500 dark:text-neutral-400")} />
                <span>{it.label}</span>
              </div>
              {isMessages && unreadCount > 0 && (
                <span className="px-2 py-0.5 min-w-[20px] h-[20px] rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-sm">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

