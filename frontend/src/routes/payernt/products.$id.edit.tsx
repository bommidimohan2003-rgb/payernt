import { createFileRoute } from "@tanstack/react-router";
import { LenderProductEdit } from "@/payernt/components/LenderProductEdit";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payernt/products/$id/edit")({
  head: ({ params }) =>
    getSeoMetadata({
      title: `Edit Product #${params.id} | Payernt`,
      description: "Edit your rental equipment listing, rates, images and pickup instructions on Payernt.",
      path: `/payernt/products/${params.id}/edit`,
    }),
  component: LenderProductEditRoute,
});

function LenderProductEditRoute() {
  const { id } = Route.useParams();
  return <LenderProductEdit productId={id} />;
}

export default Route;
