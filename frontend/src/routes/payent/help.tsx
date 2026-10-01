import { createFileRoute } from "@tanstack/react-router";
import Contact from "@/pages/Contact";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payent/help")({
  head: () =>
    getSeoMetadata({
      title: "Help & Customer Support | pay₹ent",
      description: "Get in touch with Payent customer support for order questions, deliveries, and claims.",
      path: "/payent/help",
    }),
  component: Contact,
});
