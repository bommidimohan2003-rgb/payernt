import type { Product } from "@/types";
import { advancedSearch } from "./searchEngine";
import { getSessionId } from "./eventTracker";
import { storage, STORAGE_KEYS } from "./storage";

export interface MLSearchResult {
  results: Product[];
  didYouMean: string | null;
  total: number;
  isMLPowered: boolean;
}

export interface SearchStats {
  isIndexed: boolean;
  indexedProductsCount: number;
  vocabularySize: number;
  popularQueries: string[];
}

const getApiBase = () => {
  if (typeof window !== "undefined") {
    const win = window as unknown as { PAYENT_API_URL?: string };
    if (win.PAYENT_API_URL) return win.PAYENT_API_URL;
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "10.0.2.2") return "http://10.0.2.2:8001";
    const isLocal = host === "localhost" || host === "127.0.0.1";
    if (isLocal) return "http://127.0.0.1:8001";
    if (host.endsWith(".vercel.app")) {
      return "";
    }
    return window.location.origin;
  }
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  return "";
};
const API_BASE = getApiBase();

// Get current user email if logged in
function getCurrentUserEmail(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const user = storage.get<{ email?: string } | null>(
    STORAGE_KEYS.currentUser,
    null,
  );
  return user?.email;
}

/**
 * Executes ML-powered search via backend API POST /api/search.
 * Falls back to client-side advancedSearch if backend is unavailable.
 */
export async function searchWithML(
  productsList: Product[],
  query: string,
  category?: string,
  limit: number = 20,
): Promise<MLSearchResult> {
  const trimmed = (query || "").trim();
  const selectedCat = category === "all" ? undefined : category;

  try {
    const res = await fetch(`${API_BASE}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: trimmed,
        category: selectedCat,
        user_email: getCurrentUserEmail(),
        session_id: getSessionId(),
        limit,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.results)) {
        // Map returned raw items to full Product objects or merge with local products list
        const rawResults: Record<string, unknown>[] = data.results;
        const matchedProducts: Product[] = rawResults.map((raw) => {
          const existing = productsList.find(
            (p) => String(p.id) === String(raw.id),
          );
          if (existing) return existing;
          return {
            id: String(raw.id || ""),
            title: String(raw.title || ""),
            description: String(raw.description || ""),
            price: Number(raw.price || 0),
            image: String(raw.image || ""),
            category: String(raw.category || "general"),
            rating: Number(raw.rating || 4.8),
            reviews: Number(raw.reviews || 10),
            available: Boolean(raw.available ?? true),
            owner:
              typeof raw.owner === "object" && raw.owner !== null
                ? (raw.owner as {
                  name: string;
                  avatar: string;
                  rating: number;
                })
                : { name: "Payent Lender", avatar: "", rating: 4.9 },
          };
        });

        return {
          results: matchedProducts,
          didYouMean: data.did_you_mean || null,
          total: data.total || matchedProducts.length,
          isMLPowered: true,
        };
      }
    }
  } catch (err) {
    console.warn(
      "[MLSearch] Backend ML search unavailable, using client-side engine fallback.",
      err,
    );
  }

  // Fallback to client-side advanced search
  let filtered = productsList.filter((p) =>
    !selectedCat ? true : p.category === selectedCat,
  );
  if (trimmed) {
    filtered = advancedSearch(filtered, trimmed);
  }

  return {
    results: filtered.slice(0, limit),
    didYouMean: null,
    total: filtered.length,
    isMLPowered: false,
  };
}

/**
 * Fetch search engine index stats and trending popular queries from backend
 */
export async function getSearchStats(): Promise<SearchStats> {
  try {
    const res = await fetch(`${API_BASE}/api/search/stats`);
    if (res.ok) {
      const data = await res.json();
      return {
        isIndexed: Boolean(data.is_indexed),
        indexedProductsCount: Number(data.indexed_products_count || 0),
        vocabularySize: Number(data.vocabulary_size || 0),
        popularQueries: Array.isArray(data.popular_queries)
          ? data.popular_queries
          : [],
      };
    }
  } catch (err) {
    console.warn("[MLSearch] Could not fetch search stats.", err);
  }

  return {
    isIndexed: false,
    indexedProductsCount: 0,
    vocabularySize: 0,
    popularQueries: [
      "Sony Alpha",
      "MacBook Pro",
      "DJI Mavic",
      "Royal Enfield",
      "DeWalt Drill",
    ],
  };
}
