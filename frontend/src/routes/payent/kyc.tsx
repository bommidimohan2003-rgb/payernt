import { createFileRoute } from "@tanstack/react-router";
import { PayrentKycPage } from "@/pages/PayrentKycPage";
import { getSeoMetadata } from "@/utils/seo";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";

export const Route = createFileRoute("/payent/kyc")({
  head: () =>
    getSeoMetadata({
      title: "PAN Card Verification | pay₹ent Customer KYC",
      description: "Verify your renter identity using your PAN card on pay₹ent.",
      path: "/payent/kyc",
    }),
  component: () => (
    <ProtectedRoute>
      <PayrentKycPage />
    </ProtectedRoute>
  ),
});

export default Route;
