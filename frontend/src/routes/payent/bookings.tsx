import { createFileRoute } from "@tanstack/react-router";
import Orders from "@/pages/Orders";
import { getSeoMetadata } from "@/utils/seo";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";

export const Route = createFileRoute("/payent/bookings")({
  head: () =>
    getSeoMetadata({
      title: "My Bookings & Orders | pay₹ent",
      description: "Track your active rental bookings, handover PINs, and delivery progress.",
      path: "/payent/bookings",
    }),
  component: () => (
    <ProtectedRoute>
      <Orders />
    </ProtectedRoute>
  ),
});
