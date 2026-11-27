import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-auto py-4 px-6 md:px-8 border-t border-[var(--admin-border)] bg-[var(--admin-bg)]">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-[95rem] mx-auto w-full">
        <span className="text-xs text-[var(--admin-text-muted)]">
          © 2026 Payent Operations
        </span>
        <div className="flex items-center gap-6 text-xs text-[var(--admin-text-secondary)]">
          <Link to="/privacy" className="hover:text-[var(--admin-text)] transition-colors">
            Terms of service
          </Link>
          <Link to="/privacy" className="hover:text-[var(--admin-text)] transition-colors">
            Privacy policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
