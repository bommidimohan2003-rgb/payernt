import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const AdminLogin = lazy(() => import("@/admin/pages/Login"));

export const Route = createFileRoute("/admin/login")({
  component: () => (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <AdminLogin />
    </Suspense>
  ),
});
export default Route;
