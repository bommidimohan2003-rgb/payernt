import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const Payments = lazy(() => import("@/admin/pages/Payments"));

export const Route = createFileRoute("/admin/wallet")({
  component: () => (
    <Suspense
      fallback={
        <div className="h-64 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <Payments />
    </Suspense>
  ),
});

export default Route;
