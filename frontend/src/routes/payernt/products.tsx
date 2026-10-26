import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { MyProducts } from "@/payernt/components/MyProducts";
import { usePayernt } from "@/payernt/context";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payernt/products")({
  head: () =>
    getSeoMetadata({
      title: "My Listed Gear | Payernt",
      description: "Manage your listed tech equipment, toggle availability, edit rental rates and track status.",
      path: "/payernt/products",
    }),
  component: PayerntProductsRoute,
});

function PayerntProductsRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    userProducts,
    toggleAvailability,
    deleteProduct,
    updateProduct,
  } = usePayernt();

  const isExactProducts =
    location.pathname === "/payernt/products" ||
    location.pathname === "/payernt/products/";

  if (!isExactProducts) {
    return <Outlet />;
  }

  return (
    <MyProducts
      products={userProducts}
      onToggleAvailability={toggleAvailability}
      onDeleteProduct={deleteProduct}
      onUpdateProduct={updateProduct}
      onAddNewGear={() => navigate({ to: "/payernt/products/create" })}
      onNavigateToRequests={() => navigate({ to: "/payernt/bookings" })}
      onBack={() => navigate({ to: "/payernt" })}
    />
  );
}

export default Route;
