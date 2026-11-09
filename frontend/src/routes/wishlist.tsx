import { createFileRoute } from "@tanstack/react-router";
import Wishlist from "@/pages/Wishlist";
import { getSeoMetadata } from "@/utils/seo";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";

export const Route = createFileRoute("/wishlist")({
  head: () =>
    getSeoMetadata({
      title: "Your Wishlist | paYent",
      description:
        "View and manage the verified tech gear you have saved to rent later on paYent.",
      path: "/wishlist",
    }),
  component: () => (
    <ProtectedRoute>
      <Wishlist />
    </ProtectedRoute>
  ),
});
