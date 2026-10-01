import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, LayoutDashboard } from "lucide-react";

export const Route = createFileRoute("/admin/$")({
  component: AdminNotFoundPage,
});

function AdminNotFoundPage() {
  return (
    <div className="py-20 flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mb-6">
        <AlertCircle className="w-8 h-8" />
      </div>

      <div className="space-y-2 max-w-md">
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-bold">
          404 / NOT FOUND
        </span>
        <h1 className="text-2xl font-bold text-foreground font-display">
          Admin Page Not Found
        </h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The requested administrative resource does not exist or has been relocated.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-6">
        <Link
          to="/admin/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background text-xs font-bold hover:opacity-90 transition-all shadow-xs cursor-pointer"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>BACK TO DASHBOARD</span>
        </Link>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground text-xs font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>GO BACK</span>
        </button>
      </div>
    </div>
  );
}

export default Route;
