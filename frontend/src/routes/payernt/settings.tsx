import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LenderSettingsView } from "@/payernt/components/LenderSettings";
import { usePayernt } from "@/payernt/context";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payernt/settings")({
  head: () =>
    getSeoMetadata({
      title: "Lender Settings & Account Preferences | Payernt",
      description: "Manage security settings, notifications and payout configurations.",
      path: "/payernt/settings",
    }),
  component: PayerntSettingsRoute,
});

function PayerntSettingsRoute() {
  const navigate = useNavigate();
  const { resetToDefaults, logout } = usePayernt();

  return (
    <LenderSettingsView
      onResetDemo={resetToDefaults}
      onLogout={logout}
      onBack={() => navigate({ to: "/payernt" })}
    />
  );
}

export default Route;
