import { createFileRoute } from "@tanstack/react-router";
import FiltersPage from "@/pages/Filters";
import { getSeoMetadata } from "@/utils/seo";
import { normalizeCategoryParam } from "@/utils/categoryFilter";

type SearchParams = {
  q?: string;
  cat?: string;
  min_p?: string;
  max_p?: string;
  city?: string;
  pincode?: string;
  cond?: string;
  start?: string;
  end?: string;
  sort?: string;
};

export const Route = createFileRoute("/filters")({
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    return {
      q: (search.q as string) || undefined,
      cat: normalizeCategoryParam(search),
      min_p: (search.min_p as string) || undefined,
      max_p: (search.max_p as string) || undefined,
      city: (search.city as string) || undefined,
      pincode: (search.pincode as string) || undefined,
      cond: (search.cond as string) || undefined,
      start: (search.start as string) || undefined,
      end: (search.end as string) || undefined,
      sort: (search.sort as string) || undefined,
    };
  },
  head: () =>
    getSeoMetadata({
      title: "paYent — Filter Products",
      description:
        "Filter verified rental cameras, drones, laptops, audio gear, and equipment on paYent.",
      path: "/filters",
    }),
  component: FiltersPage,
});
