import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LenderEarnings } from "@/payernt/components/LenderEarnings";
import { usePayernt } from "@/payernt/context";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payernt/earnings")({
  head: () =>
    getSeoMetadata({
      title: "Lender Earnings | Payernt",
      description: "Track earnings and payout history on Payernt.",
      path: "/payernt/earnings",
    }),
  component: PayerntEarningsAliasRoute,
});

function PayerntEarningsAliasRoute() {
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
