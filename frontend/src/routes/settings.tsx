import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/settings")({
  beforeLoad: () => {
    throw redirect({ to: "/payernt/settings" });
  },
  head: () =>
    getSeoMetadata({
      title: "Settings | Payernt",
      description:
        "Manage your account credentials, notification options, and rental preferences.",
      path: "/settings",
    }),
  component: () => null,
});

export default Route;
