import { createFileRoute } from "@tanstack/react-router";
import { RefundPolicy } from "@/pages/RefundPolicy";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/refund-policy")({
  head: () =>
    getSeoMetadata({
      title: "Refund & Cancellation Policy | paYent",
      description:
        "Comprehensive refund and cancellation terms for peer-to-peer gear rentals, deposit release rules, and dispute adjudication on paYent.",
      path: "/refund-policy",
    }),
  component: RefundPolicy,
});
