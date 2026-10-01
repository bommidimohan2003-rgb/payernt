import axios from "axios";

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

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("payent:token");
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    const user = window.localStorage.getItem("payent:currentUser");
    if (user) {
      try {
        const parsed = JSON.parse(user);
        if (parsed?.id) config.headers.set("X-User-Id", parsed.id);
      } catch {
        /* ignore */
      }
    }
  }
  return config;
});

let _axiosRefreshPromise: Promise<string | null> | null = null;

async function refreshAxiosToken(): Promise<string | null> {
  if (_axiosRefreshPromise) return _axiosRefreshPromise;
  if (typeof window === "undefined") return null;

  const currentRefreshToken = window.localStorage.getItem("payent:refreshToken");
  if (!currentRefreshToken) return null;

  _axiosRefreshPromise = (async () => {
    try {
      const res = await axios.post(`${API_BASE}/api/auth/refresh`, {
        refresh_token: currentRefreshToken,
      });
      if (res.data?.token) {
        window.localStorage.setItem("payent:token", res.data.token);
        if (res.data.refreshToken) {
          window.localStorage.setItem("payent:refreshToken", res.data.refreshToken);
        }
        return res.data.token as string;
      }
      return null;
    } catch {
      return null;
    } finally {
      _axiosRefreshPromise = null;
    }
  })();

  return _axiosRefreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/login")
    ) {
      originalRequest._retry = true;
      const newToken = await refreshAxiosToken();
      if (newToken) {
        originalRequest.headers.set("Authorization", `Bearer ${newToken}`);
        return api(originalRequest);
      } else {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("payent:token");
          window.localStorage.removeItem("payent:refreshToken");
          window.localStorage.removeItem("payent:currentUser");
          window.localStorage.removeItem("payent:admin:token");
          window.localStorage.removeItem("payent:admin:current_user");
          window.dispatchEvent(new CustomEvent("payent-session-expired"));
        }
      }
    }
    return Promise.reject(error);
  }
);

export interface ReviewItem {
  id: string;
  productId?: string;
  productTitle?: string;
  productImage?: string;
  bookingId?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userLocation?: string;
  userRole?: string;
  rating: number;
  comment: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    "5": number;
    "4": number;
    "3": number;
    "2": number;
    "1": number;
  };
}

export interface ReviewsResponse {
  reviews: ReviewItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface EligibleBooking {
  bookingId: string;
  productId: string;
  productTitle: string;
  productImage?: string;
  startDate?: string;
  endDate?: string;
  status: string;
}

export const reviewsApi = {
  getReviews: async (params?: {
    page?: number;
    limit?: number;
    sort?: string;
    rating?: number;
    product_id?: string;
    verified_only?: boolean;
  }): Promise<ReviewsResponse> => {
    const res = await api.get<ReviewsResponse>("/reviews", { params });
    return res.data;
  },

  getStats: async (productId?: string): Promise<ReviewStats> => {
    const res = await api.get<ReviewStats>("/reviews/stats", {
      params: productId ? { product_id: productId } : undefined,
    });
    return res.data;
  },

  getEligibleBookings: async (): Promise<EligibleBooking[]> => {
    const res = await api.get<EligibleBooking[]>("/reviews/eligible-bookings");
    return res.data;
  },

  createReview: async (data: {
    productId?: string;
    bookingId?: string;
    rating: number;
    comment: string;
  }): Promise<ReviewItem> => {
    const res = await api.post<ReviewItem>("/reviews", data);
    return res.data;
  },

  updateReview: async (
    id: string,
    data: { rating?: number; comment?: string }
  ): Promise<ReviewItem> => {
    const res = await api.put<ReviewItem>(`/reviews/${id}`, data);
    return res.data;
  },

  deleteReview: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete<{ success: boolean; message: string }>(`/reviews/${id}`);
    return res.data;
  },
};

