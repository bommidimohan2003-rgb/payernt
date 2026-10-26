import { createFileRoute } from "@tanstack/react-router";
import Home from "@/pages/Home";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/")({
  head: () =>
    getSeoMetadata({
      title: "Paye₹nt — Rent Professional Tech | Peer-to-Peer Rental Marketplace",
      description:
        "Create Without Limits. Peer-to-peer marketplace to rent cinema cameras, drones, laptops, and production gear.",
      path: "/",
    }),
  component: Home,
});
