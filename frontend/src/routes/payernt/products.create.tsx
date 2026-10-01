import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ListProductWizard } from "@/payernt/components/ListProductWizard";
import { usePayernt } from "@/payernt/context";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payernt/products/create")({
  head: () =>
    getSeoMetadata({
      title: "List Product for Rent | paye₹nt",
      description: "List your cameras, laptops, audio and gear to start earning rental income.",
      path: "/payernt/products/create",
    }),
  component: PayerntListProductRoute,
});

function PayerntListProductRoute() {
  const navigate = useNavigate();
  const { draftProduct, saveDraft, addProduct, clearDraft } = usePayernt();

  return (
    <div className="w-full">
      <ListProductWizard
        initialDraft={draftProduct}
        onSaveDraft={saveDraft}
        onSubmitProduct={(product) => {
          addProduct(product);
          clearDraft();
          navigate({ to: "/payernt/products" });
        }}
        onCancel={() => navigate({ to: "/payernt" })}
      />
    </div>
  );
}

export default Route;
