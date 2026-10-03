import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Package } from "lucide-react";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payernt/$")({
  head: () =>
    getSeoMetadata({
      title: "Lender Page Not Found | Payernt",
      description: "The requested lender page could not be found.",
      path: "/payernt",
    }),
  component: PayerntNotFoundRoute,
});

function PayerntNotFoundRoute() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-muted/60 border border-border flex items-center justify-center">
        <Package className="w-8 h-8 text-muted-foreground" />
      </div>
      <div>
        <h1 className="text-2xl font-black text-foreground">Page Not Found</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
          The requested lender page doesn't exist or may have been moved.
        </p>
      </div>
      <button
        onClick={() => navigate({ to: "/payernt" })}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-xs font-bold shadow-sm hover:opacity-90 transition-all cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Lender Home
      </button>
    </div>
  );
}

export default Route;
