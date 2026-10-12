import { createFileRoute } from "@tanstack/react-router";
import Support from "@/pages/Support";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/faq")({
  head: () =>
    getSeoMetadata({
      title: "PAYENT — FAQ & Support",
      description:
        "Frequently asked questions, guided troubleshooting, and support for PAYENT rentals.",
      path: "/faq",
    }),
  component: Support,
});
