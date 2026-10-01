import { createFileRoute } from "@tanstack/react-router";
import Wishlist from "@/pages/Wishlist";
import { getSeoMetadata } from "@/utils/seo";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";

export const Route = createFileRoute("/payent/wishlist")({
  head: () =>
    getSeoMetadata({
      title: "Saved Wishlist | pay₹ent",
      description: "Review your saved favorite rental gear and equipment.",
      path: "/payent/wishlist",
    }),
  component: () => (
    <ProtectedRoute>
      <Wishlist />
    </ProtectedRoute>
  ),
});
