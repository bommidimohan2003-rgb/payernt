import { createFileRoute } from "@tanstack/react-router";
import Categories from "@/pages/Categories";
import { getSeoMetadata } from "@/utils/seo";

type SearchParams = {
  q?: string;
  cat?: string;
  city?: string;
};

export const Route = createFileRoute("/payent/explore")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: (search.q as string) || undefined,
    cat: (search.cat as string) || undefined,
    city: (search.city as string) || undefined,
  }),
  head: () =>
    getSeoMetadata({
      title: "Explore Tech Gear | pay₹ent",
      description: "Browse verified cameras, drones, audio and computers available for rent.",
      path: "/payent/explore",
    }),
  component: Categories,
});
