import { createFileRoute } from "@tanstack/react-router";
import ProductDetails from "@/pages/ProductDetails";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payent/products/$id")({
  head: ({ params }) => {
    const id = params?.id || "";
    return getSeoMetadata({
      title: `Product Details | pay₹ent`,
      description: `Rent premium tech gear on pay₹ent. Safe, secure, and fully insured.`,
      path: `/payent/products/${id}`,
      type: "product",
    });
  },
  component: ProductDetails,
});
