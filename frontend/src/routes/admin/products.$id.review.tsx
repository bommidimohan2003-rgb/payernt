import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const ProductDetails = lazy(() => import("@/admin/pages/ProductDetails"));

export const Route = createFileRoute("/admin/products/$id/review")({
  component: () => (
    <Suspense
      fallback={
        <div className="h-64 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <ProductDetails />
    </Suspense>
  ),
});

export default Route;
