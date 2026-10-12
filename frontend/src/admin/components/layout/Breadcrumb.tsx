import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";

const CUSTOM_NAMES: Record<string, string> = {
  "pin-verification": "8-Digit PIN Verification",
  "activity-logs": "Activity Logs",
  "dashboard": "Dashboard",
};

export function Breadcrumb() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  // If we are on the dashboard or login, don't show complex breadcrumbs
  if (
    pathnames.length <= 2 &&
    (pathnames[1] === "dashboard" || pathnames[1] === "login" || !pathnames[1])
  ) {
    return null;
  }

  // Format breadcrumbs with Section Category for Security & Support if on pin-verification
  const isPinVerification = pathnames.includes("pin-verification");

  return (
    <nav className="flex items-center gap-2 text-xs font-medium text-[#A1A1AA] mb-4">
      <Link
        to="/admin/dashboard"
        className="flex items-center gap-1 hover:text-[#F5F5F5] transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
        <span>Admin</span>
      </Link>

      {isPinVerification ? (
        <>
          <ChevronRight className="h-3 w-3 opacity-60 text-[#A1A1AA]" />
          <span className="text-[#A1A1AA]">Security & Support</span>
          <ChevronRight className="h-3 w-3 opacity-60 text-[#A1A1AA]" />
          <span className="text-[#F5F5F5] font-semibold">8-Digit PIN Verification</span>
        </>
      ) : (
        pathnames.map((value, index) => {
          if (value === "admin") return null;

          const last = index === pathnames.length - 1;
          const to = `/${pathnames.slice(0, index + 1).join("/")}`;

          const formattedValue =
            CUSTOM_NAMES[value] ||
            value
              .replace(/-/g, " ")
              .replace(/\b\w/g, (char) => char.toUpperCase());

          return (
            <div key={to} className="flex items-center gap-2">
              <ChevronRight className="h-3 w-3 opacity-60 text-[#A1A1AA]" />
              {last ? (
                <span className="text-[#F5F5F5] font-semibold tracking-wide">
                  {formattedValue}
                </span>
              ) : (
                <Link
                  to={to as "/admin"}
                  className="hover:text-[#F5F5F5] transition-colors"
                >
                  {formattedValue}
                </Link>
              )}
            </div>
          );
        })
      )}
    </nav>
  );
}
