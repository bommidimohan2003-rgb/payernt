import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RentalRequests } from "@/payernt/components/RentalRequests";
import { usePayernt } from "@/payernt/context";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payernt/requests")({
  head: () =>
    getSeoMetadata({
      title: "Rental Requests | paye₹nt",
      description: "Manage incoming renter requests.",
      path: "/payernt/requests",
    }),
  component: PayerntRequestsAliasRoute,
});

function PayerntRequestsAliasRoute() {
  const navigate = useNavigate();
  const {
    rentalRequests,
    handleRequestAction,
    advanceRentalLifecycle,
  } = usePayernt();

  return (
    <RentalRequests
      requests={rentalRequests}
      onRequestAction={handleRequestAction}
      onAdvanceLifecycle={advanceRentalLifecycle}
      onNavigateToWallet={() => navigate({ to: "/payernt/wallet" })}
      onBack={() => navigate({ to: "/payernt" })}
    />
  );
}

export default Route;
