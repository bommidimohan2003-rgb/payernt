import { createFileRoute } from "@tanstack/react-router";
import Support from "@/pages/Support";
import { getSeoMetadata } from "@/utils/seo";

type FaqSearchParams = {
  category?: string;
  tab?: "faq" | "troubleshoot" | "ticket" | "requests";
  q?: string;
};

export const Route = createFileRoute("/faq")({
  validateSearch: (search: Record<string, unknown>): FaqSearchParams => ({
    category: typeof search.category === "string" ? search.category : undefined,
    tab: ["faq", "troubleshoot", "ticket", "requests"].includes(search.tab as string)
      ? (search.tab as any)
      : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  head: () =>
    getSeoMetadata({
      title: "paYent — FAQ & Support",
      description:
        "Frequently asked questions, guided troubleshooting, and support for paYent rentals.",
      path: "/faq",
    }),
  component: Support,
});
