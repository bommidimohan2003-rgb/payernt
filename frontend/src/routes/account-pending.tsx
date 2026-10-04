import { createFileRoute } from "@tanstack/react-router";
import AccountPending from "@/pages/AccountPending";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/account-pending")({
  validateSearch: (search: Record<string, unknown>) => ({
    type: typeof search.type === "string" ? search.type : undefined,
    email: typeof search.email === "string" ? search.email : undefined,
  }),
  head: () =>
    getSeoMetadata({
      title: "PAYENT — Account Verification Pending",
      description: "Your PAYENT account is currently being reviewed by our verification team.",
      path: "/account-pending",
    }),
  component: AccountPending,
});
