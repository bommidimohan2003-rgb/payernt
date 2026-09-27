import { createFileRoute } from "@tanstack/react-router";
import ProductDetails from "@/pages/ProductDetails";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/product/$id")({
  head: ({ params }) => {
    const id = params?.id || "";
    const title = `Product Details | Payent`;
    const description = `Rent premium tech gear on Payent. Safe, secure, and fully insured.`;
    return getSeoMetadata({
      title,
      description,
      path: `/product/${id}`,
      type: "product",
    });
  },
  component: ProductDetails,
});
