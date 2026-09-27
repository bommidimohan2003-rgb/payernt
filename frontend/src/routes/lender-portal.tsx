import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/lender-portal")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  head: () =>
    getSeoMetadata({
      title: "User Dashboard | Payent",
      description: "Manage your equipment rentals and bookings.",
      path: "/lender-portal",
    }),
  component: () => null,
});

export default Route;
