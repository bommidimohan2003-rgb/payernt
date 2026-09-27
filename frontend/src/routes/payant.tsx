import { createFileRoute } from "@tanstack/react-router";
import Home from "@/pages/Home";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payant")({
  head: () =>
    getSeoMetadata({
      title: "pay₹ent — Explore Approved Rental Gear | Peer-to-Peer Marketplace",
      description:
        "Browse and rent high-end cameras, drones, computers, gaming consoles, tools and vehicles approved by Admin on pay₹ent marketplace.",
      path: "/payant",
    }),
  component: Home,
});
