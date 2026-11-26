import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ListProductWizard } from "@/payernt/components/ListProductWizard";
import { usePayernt } from "@/payernt/context";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payernt/")({
  head: () =>
    getSeoMetadata({
      title: "List Gear & Become a Lender | Payernt",
      description:
        "List what you own. Get it verified. Rent it out. Earn safely with Payernt peer-to-peer gear lending platform.",
      path: "/payernt",
    }),
  component: PayerntListingPage,
});

function PayerntListingPage() {
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
        onCancel={() => navigate({ to: "/payernt/products" })}
      />
    </div>
  );
}

export default Route;
