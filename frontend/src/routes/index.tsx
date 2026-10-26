import { createFileRoute } from "@tanstack/react-router";
import ProductSelection from "@/components/selection/ProductSelection";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/")({
  head: () =>
    getSeoMetadata({
      title: "paye₹nt | pay₹ent — Choose Your Experience",
      description:
        "Choose between paye₹nt peer-to-peer tech gear lending platform and pay₹ent gear rental marketplace.",
      path: "/",
    }),
  component: ProductSelection,
});
