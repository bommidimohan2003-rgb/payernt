import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/become-lender")({
  beforeLoad: () => {
    throw redirect({ to: "/payernt" });
  },
  head: () =>
    getSeoMetadata({
      title: "Become a Lender | Payernt",
      description: "List what you own, get it verified, and start earning on Payernt.",
      path: "/become-lender",
    }),
  component: () => null,
});

export default Route;
