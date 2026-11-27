import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { User, Settings, LogOut, Shield } from "lucide-react";
import { authService } from "../../services/auth";
import { AdminUser } from "../../services/api";
import { ProfilePhoto } from "@/components/common/ProfilePhoto";

export function ProfileDropdown() {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const loadUser = () => {
    setCurrentUser(authService.getCurrentUser());
  };

  useEffect(() => {
    loadUser();
    const handleProfileUpdate = () => loadUser();
    window.addEventListener("payent:admin:profile-updated", handleProfileUpdate);
    return () =>
      window.removeEventListener("payent:admin:profile-updated", handleProfileUpdate);
  }, []);

  const handleLogout = async () => {
    try {
      setIsOpen(false);
      await authService.logout();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 flex items-center gap-2 px-1.5 rounded-lg hover:bg-[var(--admin-elevated)] border border-transparent hover:border-[var(--admin-border)] transition-colors cursor-pointer"
      >
        <ProfilePhoto
          src={
            (currentUser as any).profilePhotoUrl ||
            (currentUser as any).profile_photo_url ||
            currentUser.avatar
          }
          alt={currentUser.fullName}
          size={28}
          shape="rounded"
          className="border border-[var(--admin-border)]"
        />
        <div className="hidden lg:flex flex-col text-left pr-1">
          <span className="text-xs font-medium text-[var(--admin-text)] leading-none">
            {currentUser.fullName}
          </span>
          <span className="text-[11px] text-[var(--admin-text-muted)] mt-1 capitalize leading-none">
            {currentUser.role}
          </span>
        </div>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 bg-[var(--admin-card)] rounded-xl shadow-lg border border-[var(--admin-border)] z-50 overflow-hidden py-1">
            {/* Header info */}
            <div className="px-4 py-3 border-b border-[var(--admin-border)] flex flex-col">
              <span className="text-xs font-semibold text-[var(--admin-text)] truncate">
                {currentUser.fullName}
              </span>
              <span className="text-xs text-[var(--admin-text-muted)] truncate mt-0.5 font-mono">
                {currentUser.email}
              </span>
            </div>

            {/* Menu Links */}
            <div className="py-1">
              <Link
                to="/admin/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-elevated)]/60 transition-colors"
              >
                <User className="h-4 w-4 text-[var(--admin-text-muted)]" strokeWidth={1.5} />
                <span>My profile</span>
              </Link>
              <Link
                to="/admin/settings"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-elevated)]/60 transition-colors"
              >
                <Settings className="h-4 w-4 text-[var(--admin-text-muted)]" strokeWidth={1.5} />
                <span>Settings</span>
              </Link>
              <Link
                to="/admin/activity-logs"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-elevated)]/60 transition-colors"
              >
                <Shield className="h-4 w-4 text-[var(--admin-text-muted)]" strokeWidth={1.5} />
                <span>Activity logs</span>
              </Link>
            </div>

            {/* Logout Divider */}
            <div className="border-t border-[var(--admin-border)] py-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors text-left cursor-pointer"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.5} />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
