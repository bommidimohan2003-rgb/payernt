import { createFileRoute } from "@tanstack/react-router";
import Home from "@/pages/Home";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payent/")({
  head: () =>
    getSeoMetadata({
      title: "pay₹ent — Explore Approved Rental Gear",
      description:
        "Rent high-end cameras, lenses, drones, laptops, and gaming consoles with instant verification.",
      path: "/payent",
    }),
  component: Home,
});
