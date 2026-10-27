import { createFileRoute } from "@tanstack/react-router";
import { PayerntKycPage } from "@/payernt/components/PayerntKycPage";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payernt/kyc")({
  head: () =>
    getSeoMetadata({
      title: "Aadhaar Verification | Payernt Lender KYC",
      description: "Verify your equipment lender identity securely using your Aadhaar card on Payernt.",
      path: "/payernt/kyc",
    }),
  component: PayerntKycRoute,
});

function PayerntKycRoute() {
  return <PayerntKycPage />;
}

export default Route;
