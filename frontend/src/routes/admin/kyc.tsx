import { createFileRoute, useLocation } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { z } from "zod";

const KycVerification = lazy(() => import("@/admin/pages/KycVerification"));
const KycApplicationDetails = lazy(
  () => import("@/admin/pages/KycApplicationDetails"),
);

const kycSearchSchema = z.object({
  status: z.string().optional().catch("all"),
  type: z.string().optional().catch("all"),
  q: z.string().optional().catch(""),
});

function AdminKycRouteComponent() {
  const location = useLocation();
  const pathParts = (location?.pathname || "").split("/").filter(Boolean);
  const isDetails =
    pathParts.length > 2 && pathParts[0] === "admin" && pathParts[1] === "kyc";

  if (isDetails) {
    return (
      <Suspense
        fallback={
          <div className="h-64 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        }
      >
        <KycApplicationDetails />
      </Suspense>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="h-64 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <KycVerification />
    </Suspense>
  );
}

export const Route = createFileRoute("/admin/kyc")({
  validateSearch: (search) => kycSearchSchema.parse(search),
  component: AdminKycRouteComponent,
});

export default Route;
