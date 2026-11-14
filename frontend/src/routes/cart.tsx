import { createFileRoute } from "@tanstack/react-router";
import Cart from "@/pages/Cart";
import { getSeoMetadata } from "@/utils/seo";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";

export const Route = createFileRoute("/cart")({
  head: () =>
    getSeoMetadata({
      title: "Your Rental Cart | PAYENT",
      description:
        "Review your selected tech gear, rental dates, and calculated pricing on Payent.",
      path: "/cart",
    }),
  component: () => (
    <ProtectedRoute>
      <Cart />
    </ProtectedRoute>
  ),
});
