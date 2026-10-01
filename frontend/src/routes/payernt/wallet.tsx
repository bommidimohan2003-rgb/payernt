import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { UserWalletView } from "@/payernt/components/UserWallet";
import { usePayernt } from "@/payernt/context";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payernt/wallet")({
  head: () =>
    getSeoMetadata({
      title: "Lender Wallet & Payouts | paye₹nt",
      description: "Check available balance, manage escrow holdings and withdraw earnings to bank accounts.",
      path: "/payernt/wallet",
    }),
  component: PayerntWalletRoute,
});

function PayerntWalletRoute() {
  const navigate = useNavigate();
  const {
    wallet,
    requestWithdrawal,
    addBankAccount,
    creditRentalPayment,
    resetWalletData,
  } = usePayernt();

  return (
    <UserWalletView
      wallet={wallet}
      onRequestWithdrawal={requestWithdrawal}
      onAddBankAccount={addBankAccount}
      onSimulateCredit={creditRentalPayment}
      onResetWalletDemo={resetWalletData}
      onBack={() => navigate({ to: "/payernt" })}
    />
  );
}

export default Route;
