import { createFileRoute } from "@tanstack/react-router";
import PayerntApp from "@/payernt/PayerntApp";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payernt")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),
  head: () =>
    getSeoMetadata({
      title: "Payernt — Turn Your Products Into Income | Peer-to-Peer Tech Gear Lending",
      description:
        "List what you own. Get it verified. Rent it out. Earn from it with Payernt peer-to-peer gear lending platform.",
      path: "/payernt",
    }),
  component: PayerntApp,
});
