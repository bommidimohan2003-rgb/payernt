import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";

const CUSTOM_NAMES: Record<string, string> = {
  "pin-verification": "PIN verification",
  "activity-logs": "Activity logs",
  "dashboard": "Dashboard",
  "kyc": "KYC verification",
  "knowledge": "Knowledge base",
};

export function Breadcrumb() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  if (
    pathnames.length <= 2 &&
    (pathnames[1] === "dashboard" || pathnames[1] === "login" || !pathnames[1])
  ) {
    return null;
  }

  const isPinVerification = pathnames.includes("pin-verification");

  return (
    <nav className="flex items-center gap-2 text-xs font-medium text-[var(--admin-text-muted)]">
      <Link
        to="/admin/dashboard"
        className="flex items-center gap-1.5 hover:text-[var(--admin-text)] transition-colors"
      >
        <Home className="h-3.5 w-3.5" strokeWidth={1.5} />
        <span>Admin</span>
      </Link>

      {isPinVerification ? (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-[var(--admin-text-muted)]" strokeWidth={1.5} />
          <span className="text-[var(--admin-text-secondary)]">Security & support</span>
          <ChevronRight className="h-3.5 w-3.5 text-[var(--admin-text-muted)]" strokeWidth={1.5} />
          <span className="text-[var(--admin-text)] font-medium">PIN verification</span>
        </>
      ) : (
        pathnames.map((value, index) => {
          if (value === "admin") return null;

          const last = index === pathnames.length - 1;
          const to = `/${pathnames.slice(0, index + 1).join("/")}`;

          const rawLabel =
            CUSTOM_NAMES[value] ||
            value.replace(/-/g, " ").replace(/^\w/, (char) => char.toUpperCase());
          const formattedValue =
            rawLabel.length > 24 ? `${rawLabel.slice(0, 12)}...` : rawLabel;

          return (
            <div key={to} className="flex items-center gap-2">
              <ChevronRight className="h-3.5 w-3.5 text-[var(--admin-text-muted)]" strokeWidth={1.5} />
              {last ? (
                <span className="text-[var(--admin-text)] font-medium font-mono">
                  {formattedValue}
                </span>
              ) : (
                <Link
                  to={to as "/admin"}
                  className="hover:text-[var(--admin-text)] transition-colors"
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
