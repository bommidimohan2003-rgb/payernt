import { createFileRoute } from "@tanstack/react-router";
import Support from "@/pages/Support";
import { getSeoMetadata } from "@/utils/seo";

type SupportSearchParams = {
  category?: string;
  tab?: "faq" | "troubleshoot" | "ticket" | "requests";
  q?: string;
};

export const Route = createFileRoute("/support")({
  validateSearch: (search: Record<string, unknown>): SupportSearchParams => ({
    category: typeof search.category === "string" ? search.category : undefined,
    tab: ["faq", "troubleshoot", "ticket", "requests"].includes(search.tab as string)
      ? (search.tab as any)
      : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  head: () =>
    getSeoMetadata({
      title: "PAYENT — FAQ & Support",
      description:
        "Find answers, troubleshoot rental issues, or raise a support ticket with the PAYENT team.",
      path: "/support",
    }),
  component: Support,
});
