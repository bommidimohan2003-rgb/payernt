import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ListProductWizard } from "@/payernt/components/ListProductWizard";
import { usePayernt } from "@/payernt/context";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payernt/list")({
  head: () =>
    getSeoMetadata({
      title: "List Gear | Payernt",
      description: "List new gear on Payernt lender portal.",
      path: "/payernt/list",
    }),
  component: PayerntListAliasRoute,
});

function PayerntListAliasRoute() {
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
