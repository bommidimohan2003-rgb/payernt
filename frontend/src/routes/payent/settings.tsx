import { createFileRoute } from "@tanstack/react-router";
import Settings from "@/pages/Settings";
import { getSeoMetadata } from "@/utils/seo";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";

export const Route = createFileRoute("/payent/settings")({
  head: () =>
    getSeoMetadata({
      title: "Renter Settings | pay₹ent",
      description: "Manage security preferences, communication channels, and privacy settings.",
      path: "/payent/settings",
    }),
  component: () => (
    <ProtectedRoute>
      <Settings />
    </ProtectedRoute>
  ),
});
