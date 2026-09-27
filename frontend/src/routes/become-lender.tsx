import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/become-lender")({
  beforeLoad: () => {
    throw redirect({ to: "/browse" });
  },
  head: () =>
    getSeoMetadata({
      title: "Explore Gear | Payent",
      description: "Discover professional cameras, drones, and laptops on Payent.",
      path: "/become-lender",
    }),
  component: () => null,
});

export default Route;
