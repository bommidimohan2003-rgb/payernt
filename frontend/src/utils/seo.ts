export function getSeoMetadata({
  title,
  description,
  path = "",
  keywords = "rent tech, cameras, drones, laptops, consoles, tech rental",
  image = "https://payent.com/brand/payent-logo-og.png",
  type = "website",
}: {
  title: string;
  description: string;
  path?: string;
  keywords?: string;
  image?: string;
  type?: string;
}) {
  const baseUrl = "https://payent.com";
  const canonicalUrl = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "keywords", content: keywords },
      { name: "author", content: "paYent" },
      { name: "robots", content: "index, follow" },
      { property: "og:type", content: type },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:image", content: image },
      { property: "og:url", content: canonicalUrl },
      { property: "og:site_name", content: "paYent" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
    ],
    links: [{ rel: "canonical", href: canonicalUrl }],
  };
}
