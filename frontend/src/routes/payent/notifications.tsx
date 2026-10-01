import { createFileRoute } from "@tanstack/react-router";
import Notifications from "@/pages/Notifications";
import { getSeoMetadata } from "@/utils/seo";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";

export const Route = createFileRoute("/payent/notifications")({
  head: () =>
    getSeoMetadata({
      title: "Renter Notifications | pay₹ent",
      description: "Stay updated on order status, payment receipts, and delivery alerts.",
      path: "/payent/notifications",
    }),
  component: () => (
    <ProtectedRoute>
      <Notifications />
    </ProtectedRoute>
  ),
});
