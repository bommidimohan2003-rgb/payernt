import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RentalRequests } from "@/payernt/components/RentalRequests";
import { usePayernt } from "@/payernt/context";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payernt/bookings")({
  head: () =>
    getSeoMetadata({
      title: "Lender Bookings & Requests | Payernt",
      description: "Manage incoming renter booking requests, verify security PINs and track active rentals.",
      path: "/payernt/bookings",
    }),
  component: PayerntBookingsRoute,
});

function PayerntBookingsRoute() {
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
