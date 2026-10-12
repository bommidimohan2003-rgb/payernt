import { createFileRoute } from "@tanstack/react-router";
import Support from "@/pages/Support";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/support")({
  head: () =>
    getSeoMetadata({
      title: "PAYENT — FAQ & Support",
      description:
        "Find answers, troubleshoot rental issues, or raise a support ticket with the PAYENT team.",
      path: "/support",
    }),
  component: Support,
});
