import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft, Compass } from "lucide-react";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payent/$")({
  head: () =>
    getSeoMetadata({
      title: "Page Not Found | pay₹ent",
      description: "The requested marketplace page could not be found.",
      path: "/payent",
    }),
  component: PayentNotFoundRoute,
});

function PayentNotFoundRoute() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-muted/60 border border-border flex items-center justify-center">
        <Compass className="w-8 h-8 text-muted-foreground" />
      </div>
      <div>
        <h1 className="text-2xl font-black text-foreground">Page Not Found</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
          The requested marketplace page doesn't exist or may have been moved.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/payant"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-xs font-bold shadow-sm hover:opacity-90 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Marketplace
        </Link>
        <Link
          to="/browse"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary transition-all"
        >
          Explore Gear
        </Link>
      </div>
    </div>
  );
}

export default Route;
