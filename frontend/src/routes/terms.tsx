import { createFileRoute } from "@tanstack/react-router";
import { TermsOfService } from "@/pages/TermsOfService";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/terms")({
  head: () =>
    getSeoMetadata({
      title: "Terms of Service | paYent",
      description:
        "Terms and conditions governing peer-to-peer gear rentals, customer and lender responsibilities, deposits, and dispute rules on paYent.",
      path: "/terms",
    }),
  component: TermsOfService,
});
