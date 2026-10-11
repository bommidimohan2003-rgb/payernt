import { storage, STORAGE_KEYS } from "./storage";

export interface AnalyticsEvent {
  event_type:
    | "view_product"
    | "search"
    | "add_to_cart"
    | "booking_completed"
    | "category_browse"
    | "recommendation_click"
    | "recommendation_impression";
  product_id?: string;
  category?: string;
  search_query?: string;
  recommendation_type?: string;
  variant?: string;
  user_email?: string;
  session_id?: string;
  timestamp?: string;
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

// Generate or retrieve persistent session ID for anonymous users
export function getSessionId(): string {
  if (typeof window === "undefined") return "server-session";

  let sessionId = localStorage.getItem("payent_session_id");
  if (!sessionId) {
    sessionId = `sess_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
    localStorage.setItem("payent_session_id", sessionId);
  }
  return sessionId;
}

// Get logged in user email if present
function getCurrentUserEmail(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const user = storage.get<{ email?: string } | null>(
    STORAGE_KEYS.currentUser,
    null,
  );
  return user?.email;
}

// A/B Variant Assignment (50/50 split based on session ID)
export function getABVariant(): "A" | "B" {
  const sessId = getSessionId();
  let hash = 0;
  for (let i = 0; i < sessId.length; i++) {
    hash = (hash << 5) - hash + sessId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2 === 0 ? "A" : "B";
}

let eventQueue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

// Flush queued events to backend API /api/events
export async function flushEvents() {
  if (eventQueue.length === 0) return;

  const eventsToSend = [...eventQueue];
  eventQueue = [];

  try {
    const res = await fetch(`${API_BASE}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: eventsToSend }),
    });
    if (!res.ok) {
      if (res.status === 404 || res.status === 405) {
        // Endpoint not present on backend deployment; silently drop events
        return;
      }
      // Re-queue failed events up to a reasonable limit for temporary errors
      eventQueue = [...eventsToSend, ...eventQueue].slice(0, 30);
    }
  } catch {
    // Network error / offline, do not crash or throw
  }
}

// Track event with debouncing / batching
export function trackEvent(
  eventType: AnalyticsEvent["event_type"],
  payload: Partial<AnalyticsEvent> = {},
) {
  const event: AnalyticsEvent = {
    event_type: eventType,
    session_id: getSessionId(),
    user_email: getCurrentUserEmail(),
    variant: getABVariant(),
    timestamp: new Date().toISOString(),
    ...payload,
  };

  eventQueue.push(event);

  if (eventQueue.length >= 5) {
    if (flushTimer) clearTimeout(flushTimer);
    flushEvents();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushEvents();
    }, 3000);
  }
}

// Helper methods for instrumentation
export const tracker = {
  viewProduct: (productId: string, category?: string) => {
    trackEvent("view_product", { product_id: productId, category });
  },
  search: (query: string) => {
    if (!query.trim()) return;
    trackEvent("search", { search_query: query });
  },
  addToCart: (productId: string, category?: string) => {
    trackEvent("add_to_cart", { product_id: productId, category });
  },
  bookingCompleted: (productId: string, category?: string) => {
    trackEvent("booking_completed", { product_id: productId, category });
  },
  browseCategory: (category: string) => {
    trackEvent("category_browse", { category });
  },
  recommendationClick: (productId: string, recommendationType: string) => {
    trackEvent("recommendation_click", {
      product_id: productId,
      recommendation_type: recommendationType,
    });
  },
  recommendationImpression: (productId: string, recommendationType: string) => {
    trackEvent("recommendation_impression", {
      product_id: productId,
      recommendation_type: recommendationType,
    });
  },
};

// Automatic flush when user navigates away or hides page
if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushEvents();
    }
  });
  window.addEventListener("pagehide", () => {
    flushEvents();
  });
}
