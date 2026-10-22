import { createFileRoute, useLocation } from "@tanstack/react-router";
import { z } from "zod";
import Products from "@/admin/pages/Products";
import ProductDetails from "@/admin/pages/ProductDetails";

const productSearchSchema = z.object({
  search: z.string().optional().catch(""),
  status: z.string().optional().catch("all"),
});

function AdminProductsRouteComponent() {
  const location = useLocation();
  const pathParts = location.pathname.split("/").filter(Boolean);
  const isDetails = pathParts.length > 2 && pathParts[0] === "admin" && pathParts[1] === "products";

  return isDetails ? <ProductDetails /> : <Products />;
}

export const Route = createFileRoute("/admin/products")({
  validateSearch: (search) => productSearchSchema.parse(search),
  component: AdminProductsRouteComponent,
});
export default Route;

