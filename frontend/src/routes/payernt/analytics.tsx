import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LenderEarnings } from "@/payernt/components/LenderEarnings";
import { usePayernt } from "@/payernt/context";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payernt/analytics")({
  head: () =>
    getSeoMetadata({
      title: "Lender Analytics & Earnings | paye₹nt",
      description: "Track earnings, performance metrics and payout history.",
      path: "/payernt/analytics",
    }),
  component: PayerntAnalyticsRoute,
});

function PayerntAnalyticsRoute() {
  const navigate = useNavigate();
  const {
    earningsTransactions,
    profile,
    updateProfile,
  } = usePayernt();

  return (
    <LenderEarnings
      transactions={earningsTransactions}
      profile={profile}
      onUpdateProfile={updateProfile}
      onNavigateToProducts={() => navigate({ to: "/payernt/products" })}
    />
  );
}

export default Route;
