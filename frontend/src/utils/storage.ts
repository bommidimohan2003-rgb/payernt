const USER_SPECIFIC_KEYS = new Set([
  "payent:wishlist",
  "payent:cart",
  "payent:notifications",
  "payent:messages",
  "payent:orders",
]);

export const PAYENT_CACHE_VERSION = "v8_clean_products";

export function resetPayentCache(): void {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove = [
      "payent_server_products",
      "payernt_products_v2",
      "paye₹nt_products",
      "payent_cached_catalog",
      "payent_live_categories",
      "payent:cache:public_custom_products",
      "payent:cache:public_categories",
      "payent:cache:public_stats",
      "payent_custom_products",
      "payent:customProducts",
      "payent:theme_backup",
    ];
    for (const k of keysToRemove) {
      window.localStorage.removeItem(k);
    }
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i);
      if (
        key &&
        (key.startsWith("payent:cache:") ||
          key.startsWith("payent_server_") ||
          key.startsWith("payent_cached_") ||
          key.startsWith("product:"))
      ) {
        window.localStorage.removeItem(key);
      }
    }
    window.localStorage.setItem("payent:cache_version", PAYENT_CACHE_VERSION);
  } catch {
    /* ignore storage errors */
  }
}

// Auto-purge stale cache if cache version mismatch
if (typeof window !== "undefined") {
  try {
    const currentVersion = window.localStorage.getItem("payent:cache_version");
    if (currentVersion !== PAYENT_CACHE_VERSION) {
      resetPayentCache();
    }
  } catch {
    /* ignore */
  }
}

function getNamespacedKey(key: string): string {
  if (typeof window === "undefined") return key;
  if (USER_SPECIFIC_KEYS.has(key)) {
    try {
      const rawUser = window.localStorage.getItem("payent:currentUser");
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        if (parsed?.email) {
          // Namespace by user email to keep data strictly separated per user
          return `${key}:${parsed.email}`;
        }
      }
    } catch {
      /* ignore and return default key */
    }
  }
  return key;
}

export const storage = {
  get<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
      const namespaced = getNamespacedKey(key);
      const raw = window.localStorage.getItem(namespaced);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T) {
    if (typeof window === "undefined") return;
    const namespaced = getNamespacedKey(key);
    try {
      window.localStorage.setItem(namespaced, JSON.stringify(value));
    } catch (e) {
      console.warn(`[Storage] Failed to persist key "${key}" to localStorage (quota exceeded or storage blocked):`, e);
      // Clean up stale non-essential caches if quota was reached
      try {
        window.localStorage.removeItem("payent_server_products");
        window.localStorage.removeItem("payent:cache:public_custom_products");
      } catch {
        /* ignore */
      }
    }
    window.dispatchEvent(
      new CustomEvent("payent:storage_change", {
        detail: { key: namespaced, originalKey: key, value },
      }),
    );
    window.dispatchEvent(new Event("storage"));
  },
  remove(key: string) {
    if (typeof window === "undefined") return;
    const namespaced = getNamespacedKey(key);
    window.localStorage.removeItem(namespaced);
    window.dispatchEvent(
      new CustomEvent("payent:storage_change", {
        detail: { key: namespaced, originalKey: key, value: null },
      }),
    );
    window.dispatchEvent(new Event("storage"));
  },
};

export const STORAGE_KEYS = {
  users: "payent:users",
  currentUser: "payent:currentUser",
  token: "payent:token",
  refreshToken: "payent:refreshToken",
  cart: "payent:cart",
  wishlist: "payent:wishlist",
  notifications: "payent:notifications",
  messages: "payent:messages",
  orders: "payent:orders",
  theme: "payent:theme",
  otp: "payent:otp",
  otpEmail: "payent:otpEmail",
  customProducts: "payent:customProducts",
  pendingUser: "payent:pendingUser",
} as const;
