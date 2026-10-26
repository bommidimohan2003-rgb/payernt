import React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { User, LogOut, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface HeroHeaderProps {
  className?: string;
}

export function HeroHeader({ className = "" }: HeroHeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleSignInClick = () => {
    if (user) {
      navigate({ to: "/dashboard" });
    } else {
      navigate({ to: "/login" });
    }
  };

  return (
    <header
      role="banner"
      aria-label="Paye₹nt Header"
      className={`w-full flex items-center justify-between z-30 relative select-none ${className}`}
    >
      {/* Brand Logo - Top Left */}
      <Link
        to="/"
        activeProps={{ className: "" }}
        inactiveProps={{ className: "" }}
        aria-label="Paye₹nt Home"
        className="group inline-flex items-center text-left py-1 px-0.5 transition-transform active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2 rounded-lg"
        style={{
          boxShadow: "none",
          outline: "none",
          border: "none",
        }}
      >
        <span className="font-display font-extrabold text-[28px] sm:text-[32px] md:text-[34px] tracking-tight text-[#6622aa] leading-none select-none">
          Paye<span className="inline-block tracking-tighter">₹</span>nt
        </span>
      </Link>

      {/* Sign In / Auth Action - Top Right */}
      <div className="flex items-center gap-2">
        {user ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSignInClick}
              aria-label={`Dashboard for ${user.name || user.email || "Account"}`}
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-[#ddf0e4] hover:bg-[#cde7d6] text-neutral-900 font-semibold text-xs sm:text-sm border border-emerald-900/15 shadow-2xs transition-all duration-200 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3828] focus-visible:ring-offset-2"
            >
              <User
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-900 fill-neutral-900"
                aria-hidden="true"
              />
              <span className="truncate max-w-[120px] sm:max-w-[160px]">
                {user.name ? user.name.split(" ")[0] : "Dashboard"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => logout()}
              aria-label="Sign out"
              title="Sign out"
              className="p-2 sm:p-2.5 rounded-full hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSignInClick}
            aria-label="Sign in to your Paye₹nt account"
            className="inline-flex items-center gap-2 px-4.5 sm:px-5.5 py-2 sm:py-2.5 rounded-full bg-[#e1f3e7] hover:bg-[#d4ecdc] active:bg-[#c6e4d0] text-[#0a0a0a] font-semibold text-xs sm:text-sm border border-[#1b3d2b]/20 shadow-2xs transition-all duration-200 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3828] focus-visible:ring-offset-2 select-none"
          >
            <User
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0a0a0a] fill-[#0a0a0a]"
              aria-hidden="true"
            />
            <span className="tracking-tight font-medium">Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}

export default HeroHeader;
