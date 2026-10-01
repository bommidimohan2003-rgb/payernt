import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LenderProfileView } from "@/payernt/components/LenderProfile";
import { usePayernt } from "@/payernt/context";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payernt/settings")({
  head: () =>
    getSeoMetadata({
      title: "Lender Settings & Account Preferences | paye₹nt",
      description: "Manage security settings, notifications and payout configurations.",
      path: "/payernt/settings",
    }),
  component: PayerntSettingsRoute,
});

function PayerntSettingsRoute() {
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
