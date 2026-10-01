import { createFileRoute } from "@tanstack/react-router";
import Profile from "@/pages/Profile";
import { getSeoMetadata } from "@/utils/seo";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";

export const Route = createFileRoute("/payent/profile")({
  head: () =>
    getSeoMetadata({
      title: "Renter Profile & KYC | pay₹ent",
      description: "Manage your personal profile, delivery addresses and verified KYC.",
      path: "/payent/profile",
    }),
  component: () => (
    <ProtectedRoute>
      <Profile />
    </ProtectedRoute>
  ),
});
