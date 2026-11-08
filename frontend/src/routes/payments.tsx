import { createFileRoute } from "@tanstack/react-router";
import PaymentHistory from "@/pages/PaymentHistory";
import { getSeoMetadata } from "@/utils/seo";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";

export const Route = createFileRoute("/payments")({
  head: () =>
    getSeoMetadata({
      title: "Payment History & Transactions | Payent",
      description:
        "View and track your rental payments, receipts, and refund statuses securely on Payent.",
      path: "/payments",
    }),
  validateSearch: (s: Record<string, unknown>) => ({
    q: (s.q as string) ?? "",
    status: (s.status as string) ?? "all",
  }),
  component: () => (
    <ProtectedRoute>
      <PaymentHistory />
    </ProtectedRoute>
  ),
});
