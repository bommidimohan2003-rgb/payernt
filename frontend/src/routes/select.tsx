import { createFileRoute } from "@tanstack/react-router";
import ProductSelection from "@/components/selection/ProductSelection";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/select")({
  head: () =>
    getSeoMetadata({
      title: "Select Experience — Payent Platform",
      description: "Choose between paye₹nt peer-to-peer gear lending and pay₹ent gear rental marketplace.",
      path: "/select",
    }),
  component: ProductSelection,
});
