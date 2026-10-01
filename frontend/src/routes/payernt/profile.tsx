import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LenderProfileView } from "@/payernt/components/LenderProfile";
import { usePayernt } from "@/payernt/context";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payernt/profile")({
  head: () =>
    getSeoMetadata({
      title: "Lender Profile & Verification | paye₹nt",
      description: "Manage KYC identity, address, security preferences and payout details.",
      path: "/payernt/profile",
    }),
  component: PayerntProfileRoute,
});

function PayerntProfileRoute() {
  const navigate = useNavigate();
  const {
    profile,
    activeAccount,
    updateProfile,
    resetToDefaults,
    logout,
  } = usePayernt();

  return (
    <LenderProfileView
      profile={profile}
      activeAccount={activeAccount}
      onUpdateProfile={updateProfile}
      onResetDemo={resetToDefaults}
      onNavigateToProducts={() => navigate({ to: "/payernt/products" })}
      onLogout={logout}
      onBack={() => navigate({ to: "/payernt" })}
    />
  );
}

export default Route;
