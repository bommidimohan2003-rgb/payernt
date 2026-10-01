import { createFileRoute } from "@tanstack/react-router";
import Cart from "@/pages/Cart";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payent/cart")({
  head: () =>
    getSeoMetadata({
      title: "Your Rental Cart | pay₹ent",
      description: "Review selected rental equipment and calculated totals.",
      path: "/payent/cart",
    }),
  component: Cart,
});
