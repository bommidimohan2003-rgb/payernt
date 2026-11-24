import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payent/settings")({
  beforeLoad: () => {
    throw redirect({ to: "/payernt/settings" });
  },
  head: () =>
    getSeoMetadata({
      title: "Settings | Payernt",
      description: "Manage security settings, notifications and payout configurations.",
      path: "/payent/settings",
    }),
  component: () => null,
});

export default Route;
