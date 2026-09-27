import { createFileRoute } from "@tanstack/react-router";
import Home from "@/pages/Home";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payent")({
  head: () =>
    getSeoMetadata({
      title: "paye₹nt — Peer-to-Peer Tech Gear Rentals",
      description:
        "Rent high-end cameras, lenses, drones, laptops, and gaming consoles with instant verification and fast delivery.",
      path: "/payent",
    }),
  component: Home,
});
