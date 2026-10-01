import { createFileRoute } from "@tanstack/react-router";
import { LenderProductDetails } from "@/payernt/components/LenderProductDetails";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payernt/products/$id")({
  head: ({ params }) =>
    getSeoMetadata({
      title: `Product #${params.id} | paye₹nt Lender`,
      description: "Manage and inspect your product listing, rates and live status on paye₹nt.",
      path: `/payernt/products/${params.id}`,
    }),
  component: LenderProductDetailsRoute,
});

function LenderProductDetailsRoute() {
  const { id } = Route.useParams();
  return <LenderProductDetails productId={id} />;
}

export default Route;
