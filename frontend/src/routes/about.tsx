import { createFileRoute } from "@tanstack/react-router";
import About from "@/pages/About";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/about")({
  head: () =>
    getSeoMetadata({
      title: "paYent — About Us",
      description:
        "Learn about the mission, values, and escrow protection behind paYent, the peer-to-peer tech rental platform.",
      path: "/about",
    }),
  component: About,
});
