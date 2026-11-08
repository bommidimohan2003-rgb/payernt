import { createFileRoute } from "@tanstack/react-router";
import Payment from "@/pages/Payment";
import { getSeoMetadata } from "@/utils/seo";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";

export const Route = createFileRoute("/payment")({
  head: () =>
    getSeoMetadata({
      title: "Secure Payment | Payent",
      description:
        "Pay securely via PhonePe, BHIM UPI, Google Pay, or Paytm on Payent.",
      path: "/payment",
    }),
  validateSearch: (s: Record<string, unknown>) => ({
    id: (s.id as string) ?? "",
    orderId: ((s.orderId as string) ?? (s.order_id as string) ?? "") as string,
    total: (s.total as number | string) ?? 0,
    start: (s.start as string) ?? "",
    end: (s.end as string) ?? "",
  }),
  component: () => (
    <ProtectedRoute>
      <Payment />
    </ProtectedRoute>
  ),
});
