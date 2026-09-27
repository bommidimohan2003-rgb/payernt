import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { z } from "zod";

const Products = lazy(() => import("@/admin/pages/Products"));
const ProductDetails = lazy(() => import("@/admin/pages/ProductDetails"));

const productSearchSchema = z.object({
  search: z.string().optional().catch(""),
});

function AdminProductsRouteComponent() {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const handlePop = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const pathParts = pathname.split("/").filter(Boolean);
  const isDetails = pathParts.length > 2 && pathParts[0] === "admin" && pathParts[1] === "products";

  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
      {isDetails ? <ProductDetails /> : <Products />}
    </Suspense>
  );
}

export const Route = createFileRoute("/admin/products")({
  validateSearch: (search) => productSearchSchema.parse(search),
  component: AdminProductsRouteComponent,
});
export default Route;
