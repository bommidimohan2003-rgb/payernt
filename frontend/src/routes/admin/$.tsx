import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, LayoutDashboard } from "lucide-react";

export const Route = createFileRoute("/admin/$")({
  component: AdminNotFoundPage,
});

function AdminNotFoundPage() {
  return (
    <div className="py-20 flex flex-col items-center justify-center text-center px-4">
      <div className="w-14 h-14 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mb-6">
        <AlertCircle className="w-6 h-6" strokeWidth={1.5} />
      </div>

      <div className="space-y-2 max-w-md">
        <span className="text-xs font-mono text-[var(--admin-text-muted)]">
          404 — Page not found
        </span>
        <h1 className="text-2xl font-semibold text-[var(--admin-text)]">
          Admin page not found
        </h1>
        <p className="text-sm text-[var(--admin-text-secondary)] leading-relaxed">
          The requested administrative page does not exist or has been relocated.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-6">
        <Link
          to="/admin/dashboard"
          className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-[var(--admin-text)] text-[var(--admin-bg)] text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
        >
          <LayoutDashboard className="w-4 h-4" strokeWidth={1.5} />
          <span>Back to dashboard</span>
        </Link>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 px-4 h-9 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] hover:bg-[var(--admin-elevated)] text-[var(--admin-text)] text-xs font-medium transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          <span>Go back</span>
        </button>
      </div>
    </div>
  );
}

export default Route;
