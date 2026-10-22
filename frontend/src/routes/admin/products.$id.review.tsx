import { createFileRoute } from "@tanstack/react-router";
import ProductDetails from "@/admin/pages/ProductDetails";

export const Route = createFileRoute("/admin/products/$id/review")({
  component: () => <ProductDetails />,
});

export default Route;
