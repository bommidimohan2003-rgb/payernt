import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

const AdminLogin = lazy(() => import("@/admin/pages/Login"));

export const Route = createFileRoute("/admin/login")({
  component: () => (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#070B14]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      }
    >
      <AdminLogin />
    </Suspense>
  ),
});
export default Route;
