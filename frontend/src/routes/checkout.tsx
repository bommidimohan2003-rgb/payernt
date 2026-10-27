import { createFileRoute } from "@tanstack/react-router";
import Checkout from "@/pages/Checkout";
import { getSeoMetadata } from "@/utils/seo";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";

export const Route = createFileRoute("/checkout")({
  head: () =>
    getSeoMetadata({
      title: "Secure Checkout | Payent",
      description:
        "Complete your secure rental booking with insurance options on Payent.",
      path: "/checkout",
    }),
  validateSearch: (s: Record<string, unknown>) => ({
    id: (s.id as string) ?? undefined,
    start: (s.start as string) ?? undefined,
    end: (s.end as string) ?? undefined,
    slot: (s.slot as string) ?? undefined,
    mode: (s.mode as string) ?? undefined,
  }),
  component: () => (
    <ProtectedRoute>
      <Checkout />
    </ProtectedRoute>
  ),
});
