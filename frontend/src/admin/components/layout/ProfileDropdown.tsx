import { useState, useEffect } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { User, Settings, LogOut, Shield } from "lucide-react";
import { authService } from "../../services/auth";
import { AdminUser } from "../../services/api";

export function ProfileDropdown() {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const loadUser = () => {
    setCurrentUser(authService.getCurrentUser());
  };

  useEffect(() => {
    loadUser();

    // Listen to profile updates
    const handleProfileUpdate = () => loadUser();
    window.addEventListener(
      "payent:admin:profile-updated",
      handleProfileUpdate,
    );
    return () =>
      window.removeEventListener(
        "payent:admin:profile-updated",
        handleProfileUpdate,
      );
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
      setIsOpen(false);
      navigate({ to: "/" });
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1 rounded-full hover:bg-secondary transition-colors"
      >
        <img
          src={currentUser.avatar}
          alt={currentUser.fullName}
          className="h-8 w-8 rounded-full object-cover border border-primary/20"
        />
        <div className="hidden lg:flex flex-col text-left pr-2">
          <span className="text-xs font-bold text-foreground leading-none">
            {currentUser.fullName}
          </span>
          <span className="text-[10px] font-semibold text-muted-foreground mt-0.5 capitalize">
            {currentUser.role}
          </span>
        </div>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2.5 w-56 glass bg-card/95 rounded-2xl shadow-xl border border-border/80 z-50 overflow-hidden py-1">
            {/* Header info */}
            <div className="px-4 py-3 border-b border-border/50 flex flex-col">
              <span className="text-xs font-bold text-foreground truncate">
                {currentUser.fullName}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground truncate mt-0.5">
                {currentUser.email}
              </span>
            </div>

            {/* Menu Links */}
            <div className="py-1">
              <Link
                to="/admin/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
              >
                <User className="h-4 w-4" />
                <span>My Profile</span>
              </Link>
              <Link
                to="/admin/settings"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
              <Link
                to="/admin/activity-logs"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
              >
                <Shield className="h-4 w-4" />
                <span>Activity Logs</span>
              </Link>
            </div>

            {/* Logout Divider */}
            <div className="border-t border-border/50 py-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-destructive hover:bg-destructive/5 transition-colors text-left"
              >
                <LogOut className="h-4 w-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
