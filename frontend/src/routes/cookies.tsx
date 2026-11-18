import { createFileRoute } from "@tanstack/react-router";
import { CookiePolicy } from "@/pages/CookiePolicy";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/cookies")({
  head: () =>
    getSeoMetadata({
      title: "Cookie Policy | paYent",
      description:
        "Learn how paYent uses cookies and local storage for authentication, security, and recommendations in accordance with the India DPDP Act 2023.",
      path: "/cookies",
    }),
  component: CookiePolicy,
});
