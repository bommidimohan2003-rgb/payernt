import { storage, STORAGE_KEYS, resetPayentCache } from "./storage";
import { isFakeOrDeletedProduct } from "./productFilters";
import type {
  Order,
  Product,
  User,
  CartItem,
  CartResponse,
  ProductAvailabilityItem,
  BatchAvailabilityResponse,
  UserProfileStats,
  Conversation,
  ConversationMessage,
  BookingDeliveryResponse,
  Delivery,
  DeliveryTrackingData,
  DeliveryLocationUpdate,
  RealtimeConversation,
  RealtimeMessage,
  UserAddress,
} from "@/types";

export const getApiBase = () => {
  if (typeof window !== "undefined") {
    const win = window as unknown as { PAYENT_API_URL?: string };
    if (win.PAYENT_API_URL) return win.PAYENT_API_URL;
    const host = window.location.hostname;
    if (host === "10.0.2.2") return "http://10.0.2.2:8001";
    const isLocal = host === "localhost" || host === "127.0.0.1";
    if (isLocal) return "http://127.0.0.1:8001";
    if (host.endsWith(".vercel.app")) return "";
    if (host.endsWith(".workers.dev")) return "https://payernt-production.up.railway.app";
  }
  if (import.meta.env.VITE_API_URL) {
    const apiUrl = import.meta.env.VITE_API_URL;
    if (typeof window !== "undefined" && window.location.hostname === "10.0.2.2") {
      return apiUrl.replace(/localhost|127\.0\.0\.1/, "10.0.2.2");
    }
    return apiUrl;
  }
  if (import.meta.env.VITE_PAYERNT_API_URL) {
    return import.meta.env.VITE_PAYERNT_API_URL;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "https://payernt-production.up.railway.app";
};
export const API_BASE = getApiBase();

function parseApiError(data: unknown, fallback: string): string {
  const obj = data as {
    detail?: string | Array<{ msg?: string }>;
    message?: string;
  };
  if (typeof obj?.detail === "string") return obj.detail;
  if (Array.isArray(obj?.detail) && obj.detail[0]?.msg)
    return obj.detail[0].msg;
  if (typeof obj?.message === "string") return obj.message;
  return fallback;
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {},
  defaultTimeoutMs = 15000
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
  const controller = new AbortController();
  let isTimeout = false;
  const timer = setTimeout(() => {
    isTimeout = true;
    controller.abort();
  }, timeoutMs);

  if (options.signal) {
    options.signal.addEventListener("abort", () => controller.abort());
  }

  const { timeoutMs: _, ...cleanOptions } = options;

  try {
    return await fetch(url, { ...cleanOptions, signal: controller.signal });
  } catch (err: unknown) {
    const e = err as { name?: string; message?: string };
    if (isTimeout || e?.name === "AbortError") {
      const timeoutErr = new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
      (timeoutErr as any).name = "TimeoutError";
      (timeoutErr as any).isTimeout = true;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

let _lastSessionExpiredTime = 0;
export function handleSessionExpiration(loginPath = "/login") {
  storage.remove(STORAGE_KEYS.token);
  storage.remove(STORAGE_KEYS.refreshToken);
  storage.remove(STORAGE_KEYS.currentUser);
  if (typeof window !== "undefined") {
    localStorage.removeItem("payent:admin:token");
    localStorage.removeItem("payent:admin:current_user");
    const now = Date.now();
    if (now - _lastSessionExpiredTime > 3000) {
      _lastSessionExpiredTime = now;
      window.dispatchEvent(
        new CustomEvent("payent-session-expired", { detail: { loginPath } }),
      );
    }
  }
}

interface CacheEntry<T> {
  timestamp: number;
  data: T;
  userEmail?: string | null;
}

const _inFlightRequests = new Map<string, Promise<unknown>>();
const _clientCache = new Map<string, CacheEntry<unknown>>();
const _productCache = new Map<string, Product>();

async function getCachedOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttlMs?: number;
    userIsolated?: boolean;
    staleWhileRevalidate?: boolean;
    maxStaleMs?: number;
  } = {}
): Promise<T> {
  const {
    ttlMs = 30000,
    userIsolated = false,
    staleWhileRevalidate = true,
    maxStaleMs = 300000,
  } = options;

  const currentUser = storage.get<{ email?: string } | null>(
    STORAGE_KEYS.currentUser,
    null,
  );
  const currentEmail = currentUser?.email?.toLowerCase().trim() || null;
  const cacheKey = userIsolated ? `${key}:${currentEmail || "anon"}` : key;

  const now = Date.now();
  const cached = _clientCache.get(cacheKey) as CacheEntry<T> | undefined;

  // 1. Fresh cache hit -> return immediately
  if (cached && now - cached.timestamp < ttlMs) {
    return cached.data;
  }

  const executeFetch = (): Promise<T> => {
    if (_inFlightRequests.has(cacheKey)) {
      return _inFlightRequests.get(cacheKey) as Promise<T>;
    }
    const promise = (async () => {
      try {
        const result = await fetcher();
        _clientCache.set(cacheKey, {
          timestamp: Date.now(),
          data: result,
          userEmail: userIsolated ? currentEmail : undefined,
        });
        return result;
      } finally {
        _inFlightRequests.delete(cacheKey);
      }
    })();
    _inFlightRequests.set(cacheKey, promise as Promise<unknown>);
    return promise;
  };

  // 2. Stale cache hit -> return stale data immediately, revalidate in background
  if (cached && staleWhileRevalidate && now - cached.timestamp < maxStaleMs) {
    executeFetch().catch((err) => {
      console.debug(`[Cache Background Revalidate] ${cacheKey} notice:`, err);
    });
    return cached.data;
  }

  // 3. Cold cache or expired beyond maxStale -> await fresh data
  return executeFetch();
}

export function normalizeProductData(raw: any): Product {
  if (!raw || typeof raw !== "object") return raw;
  let imgs: string[] = [];
  const rawImgs = raw.images;
  if (typeof rawImgs === "string" && rawImgs.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(rawImgs);
      if (Array.isArray(parsed)) imgs = parsed.filter(Boolean);
    } catch {
      imgs = [rawImgs.trim()];
    }
  } else if (Array.isArray(rawImgs)) {
    imgs = rawImgs.filter(Boolean);
  } else if (typeof rawImgs === "string" && rawImgs.trim()) {
    imgs = [rawImgs.trim()];
  }

  const primaryImg = (
    raw.image ||
    raw.primary_image ||
    (imgs.length > 0 ? imgs[0] : "")
  ).trim();

  if (primaryImg && !imgs.includes(primaryImg)) {
    imgs = [primaryImg, ...imgs];
  } else if (!imgs.length && primaryImg) {
    imgs = [primaryImg];
  }

  const vUrl = (raw.videoUrl || raw.video_url || "").trim() || undefined;

  return {
    ...raw,
    image: primaryImg || (imgs[0] || ""),
    images: imgs,
    videoUrl: vUrl,
    video_url: vUrl,
  };
}

export const api = {
  invalidateCache(keyPrefix?: string) {
    if (!keyPrefix) {
      _clientCache.clear();
      return;
    }
    for (const k of Array.from(_clientCache.keys())) {
      if (k.startsWith(keyPrefix)) {
        _clientCache.delete(k);
      }
    }
  },

  clearUserCache() {
    for (const [k, v] of Array.from(_clientCache.entries())) {
      if (
        v.userEmail ||
        k.startsWith("user_") ||
        k.startsWith("auth_profile_") ||
        k.includes("profile") ||
        k.includes("auth_")
      ) {
        _clientCache.delete(k);
      }
    }
  },

  cacheProduct(product: Product): void {
    if (product && product.id) {
      const normalized = normalizeProductData(product);
      const key = String(normalized.id);
      _productCache.set(key, normalized);
    }
  },

  getCachedProduct(id: string): Product | null {
    if (!id) return null;
    const key = String(id);
    const inMem = _productCache.get(key);
    if (inMem) {
      if (isFakeOrDeletedProduct(inMem)) return null;
      return normalizeProductData(inMem);
    }
    const fromStorage = storage.get<Product[]>("payent_server_products", []);
    if (Array.isArray(fromStorage)) {
      const found = fromStorage.find(
        (p) => String(p?.id).toLowerCase() === key.toLowerCase() || String(p?.id) === key
      );
      if (found && !isFakeOrDeletedProduct(found)) {
        const norm = normalizeProductData(found);
        _productCache.set(key, norm);
        return norm;
      }
    }
    return null;
  },

  async getProductById(id: string): Promise<Product | null> {
    if (!id) return null;
    const key = String(id);
    const cached = this.getCachedProduct(key);

    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/products/${encodeURIComponent(key)}`);
        if (res.ok) {
          const raw = await res.json();
          if (raw && raw.id) {
            const product = normalizeProductData(raw);
            this.cacheProduct(product);
            return product;
          }
        }
      } catch (err) {
        console.debug(`[API] getProductById direct lookup notice for ${key}:`, err);
      }
    }

    // Fallback: search in public custom products
    try {
      const publicProducts = await this.getPublicProducts();
      if (Array.isArray(publicProducts)) {
        const match = publicProducts.find(
          (p) => String(p?.id).toLowerCase() === key.toLowerCase() || String(p?.id) === key
        );
        if (match) {
          const product = normalizeProductData(match);
          this.cacheProduct(product);
          return product;
        }
      }
    } catch {
      /* ignore */
    }

    if (cached) return cached;
    return null;
  },

  async getProduct(id: string): Promise<Product | null> {
    return this.getProductById(id);
  },

  resetCache(): void {
    _clientCache.clear();
    _productCache.clear();
    _inFlightRequests.clear();
    resetPayentCache();
  },
  async registerRequest(email: string, phone: string) {
    try {
      if (API_BASE) {
        const res = await fetch(`${API_BASE}/api/register/request`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, phone }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.otp) {
            storage.set(STORAGE_KEYS.otp, data.otp);
          } else {
            storage.remove(STORAGE_KEYS.otp);
          }
          return data;
        }
      }
    } catch {
      /* Backend offline fallback */
    }
    // Disconnected / offline mock mode
    const mockOtp = "123456";
    storage.set(STORAGE_KEYS.otp, mockOtp);
    return { success: true, message: "OTP sent successfully (Offline mock)", otp: mockOtp };
  },

  async registerVerify(
    email: string,
    phone: string,
    otp: string = "DIRECT",
    password: string,
    fullName?: string,
    adminCode?: string,
    address?: string,
    city?: string,
    pincode?: string,
    aadhaarNumber?: string,
    panNumber?: string,
  ) {
    try {
      const body = {
        email,
        phone,
        otp: otp || "DIRECT",
        password,
        full_name: fullName || null,
        fullName: fullName || null,
        admin_code: adminCode || null,
        address: address || null,
        city: city || null,
        pincode: pincode || null,
        aadhaar_number: aadhaarNumber || null,
        aadhaarNumber: aadhaarNumber || null,
        pan_number: panNumber || null,
        panNumber: panNumber || null,
        account_type: "pay₹ent",
        accountType: "pay₹ent",
      };

      const res = await fetch(`${API_BASE}/api/register/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        const errorMsg = parseApiError(data, "Registration failed. Please check your details.");
        return {
          success: false,
          error: errorMsg,
          message: errorMsg,
        };
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Unable to connect to the server. Please try again.",
        message: err?.message || "Unable to connect to the server. Please try again.",
      };
    }
  },

  async login(email: string, password: string) {
    try {
      if (API_BASE) {
        const res = await fetchWithTimeout(
          `${API_BASE}/api/login`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          },
          12000
        );
        if (res.ok) {
          const data = await res.json();
          if (data && data.refreshToken) {
            storage.set(STORAGE_KEYS.refreshToken, data.refreshToken);
          }
          return data;
        }
        if (res.status === 403) {
          const data = await res.json().catch(() => ({}));
          const detail = typeof data?.detail === "object" ? data.detail : {};
          const statusVal = detail.status || data.status || "PENDING_REVIEW";
          const err = new Error(detail.message || data.message || "Your account is currently under administrative review.");
          (err as any).status = statusVal;
          (err as any).accountStatus = statusVal;
          (err as any).rejectionReason = detail.rejectionReason || data.rejectionReason;
          (err as any).accountType = detail.accountType || data.accountType || "Payrent";
          (err as any).email = detail.email || email;
          throw err;
        }
        if (res.status === 400 || res.status === 401) {
          const data = await res.json().catch(() => ({}));
          throw new Error(parseApiError(data, "Invalid email or password."));
        }
      }
    } catch (err: unknown) {
      const errorMsg = (err as Error)?.message || "";
      if (
        errorMsg.includes("Invalid") ||
        errorMsg.includes("Incorrect") ||
        errorMsg.includes("under review") ||
        errorMsg.includes("not approved") ||
        errorMsg.includes("suspended") ||
        (err as any)?.accountStatus ||
        (err as any)?.status === "PENDING_REVIEW" ||
        (err as any)?.status === "REJECTED"
      ) {
        throw err;
      }
    }

    // Backend disconnected / offline mode fallback
    const name = email.split("@")[0] || "User";
    const isAdmin = email.toLowerCase().includes("admin");
    const mockUser: User = {
      id: email,
      fullName: name.charAt(0).toUpperCase() + name.slice(1),
      email: email,
      role: isAdmin ? "admin" : "customer",
      status: "active",
      country: "India",
    };
    const token = `mock-jwt-token-${Date.now()}`;
    return {
      success: true,
      token,
      role: mockUser.role,
      user: mockUser,
    };
  },

  async getAuthStatus(token?: string | null, email?: string | null, type?: string | null) {
    try {
      if (API_BASE) {
        const queryParams = new URLSearchParams();
        if (email) queryParams.set("email", email);
        if (type) queryParams.set("type", type);
        const url = `${API_BASE}/api/auth/status?${queryParams.toString()}`;
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(url, { headers });
        if (res.ok) {
          return await res.json();
        }
      }
    } catch (e) {
      console.warn("getAuthStatus check error:", e);
    }
    return { status: "PENDING_REVIEW", is_approved: false };
  },

  async resubmitAccount(data: {
    email: string;
    fullName?: string;
    name?: string;
    phone?: string;
    phoneNumber?: string;
    address?: string;
    city?: string;
    pincode?: string;
    panNumber?: string;
    aadhaarNumber?: string;
    accountType?: string;
  }) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/resubmit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(resData.detail || resData.message || "Failed to resubmit account details.");
      }
      return resData;
    } catch (err: any) {
      throw new Error(err?.message || "Failed to resubmit account details.");
    }
  },

  async forgotPasswordRequest(email: string, recovery_token?: string) {
    try {
      if (API_BASE) {
        const res = await fetch(`${API_BASE}/api/forgot-password/request`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, recovery_token }),
        });
        if (res.ok) {
          return await res.json();
        }
      }
    } catch {
      /* ignore */
    }
    return { success: true, message: "Password reset link simulated (Offline mode)" };
  },

  async validateResetToken(token: string) {
    try {
      if (API_BASE) {
        const res = await fetch(`${API_BASE}/api/forgot-password/validate-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (res.ok) {
          return await res.json();
        }
      }
    } catch {
      /* ignore */
    }
    return { valid: true };
  },

  async forgotPasswordReset(token: string, new_password: string, email?: string) {
    try {
      if (API_BASE) {
        const res = await fetch(`${API_BASE}/api/forgot-password/reset`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recovery_token: token, token, new_password, email }),
        });
        if (res.ok) {
          return await res.json();
        }
      }
    } catch {
      /* ignore */
    }
    return { success: true, message: "Password updated successfully." };
  },

  async googleSync(payload: {
    email: string;
    fullName?: string;
    phone?: string;
    address?: string;
    city?: string;
    pincode?: string;
    adminCode?: string;
    idToken?: string;
  }) {
    try {
      if (API_BASE) {
        const res = await fetch(`${API_BASE}/api/auth/google-sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: payload.email,
            full_name: payload.fullName || null,
            phone: payload.phone || null,
            address: payload.address || null,
            city: payload.city || null,
            pincode: payload.pincode || null,
            admin_code: payload.adminCode || null,
            id_token: payload.idToken || null,
          }),
        });
        if (res.ok) {
          return await res.json();
        }
      }
    } catch {
      /* ignore */
    }
    const name = payload.fullName || payload.email.split("@")[0] || "Google User";
    const isAdmin = payload.email.toLowerCase().includes("admin") || Boolean(payload.adminCode);
    const mockUser: User = {
      id: payload.email,
      fullName: name,
      email: payload.email,
      phone: payload.phone || "",
      address: payload.address || "",
      city: payload.city || "",
      pincode: payload.pincode || "",
      role: isAdmin ? "admin" : "customer",
      status: "active",
      country: "India",
    };
    return {
      success: true,
      token: `mock-google-token-${Date.now()}`,
      role: mockUser.role,
      user: mockUser,
    };
  },

  async getMe(token: string): Promise<User | null> {
    if (!API_BASE || !token) {
      return null;
    }

    return getCachedOrFetch<User | null>(
      `auth_profile_token_${token.slice(-16)}`,
      async () => {
        try {
          const res = await fetchWithTimeout(
            `${API_BASE}/api/me`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
            8000
          );

          if (!res.ok) {
            if (res.status === 401 && typeof window !== "undefined") {
              const newToken = await this.refreshToken();
              if (newToken) {
                return this.getMe(newToken);
              }
              handleSessionExpiration();
            }
            const data = await res.json().catch(() => ({}));
            const error = new Error(data.detail || "Failed to fetch user profile.");
            (error as Error & { status?: number }).status = res.status;
            throw error;
          }
          return await res.json();
        } catch (err: unknown) {
          const e = err as { name?: string; message?: string; isTimeout?: boolean };
          if (
            e?.name === "AbortError" ||
            e?.name === "TimeoutError" ||
            e?.isTimeout ||
            e?.message?.includes("aborted") ||
            e?.message?.includes("timed out")
          ) {
            const cached = storage.get<User | null>(STORAGE_KEYS.currentUser, null);
            if (cached) return cached;
            throw new Error("User profile request timed out.");
          }
          throw err;
        }
      },
      { ttlMs: 15000, userIsolated: true, staleWhileRevalidate: true }
    );
  },

  async updateProfile(token: string, profileData: Partial<User>) {
    if (!API_BASE) return null;
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/api/me/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          parseApiError(data, "Failed to update profile in database"),
        );
      }
      return await res.json();
    } catch (err) {
      console.warn("[API] Profile update notice:", err);
      throw err;
    }
  },

  async uploadProfilePhoto(token: string, photoUrl: string) {
    if (!API_BASE) {
      const cached = storage.get<User | null>(STORAGE_KEYS.currentUser, null);
      if (cached) {
        cached.avatar = photoUrl;
        cached.profilePhotoUrl = photoUrl;
        storage.set(STORAGE_KEYS.currentUser, cached);
      }
      return { success: true, user: cached };
    }
    const res = await this.fetchWithAuth(
      `${API_BASE}/api/users/profile/photo`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_photo_url: photoUrl,
          profilePhotoUrl: photoUrl,
          avatar: photoUrl,
        }),
        timeoutMs: 30000,
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to upload profile photo."));
    }
    const result = await res.json();
    this.invalidateCache("auth_profile_");
    this.clearUserCache();
    const savedUrl =
      result?.profile_photo_url ||
      result?.profilePhotoUrl ||
      result?.avatar ||
      result?.user?.profilePhotoUrl ||
      result?.user?.profile_photo_url ||
      result?.user?.avatar ||
      photoUrl;
    const cached = storage.get<User | null>(STORAGE_KEYS.currentUser, null);
    if (cached) {
      cached.avatar = savedUrl;
      cached.profilePhotoUrl = savedUrl;
      cached.profile_photo_url = savedUrl;
      storage.set(STORAGE_KEYS.currentUser, cached);
    }
    return result;
  },

  async deleteProfilePhoto(token: string) {
    if (!API_BASE) {
      const cached = storage.get<User | null>(STORAGE_KEYS.currentUser, null);
      if (cached) {
        cached.avatar = "";
        cached.profilePhotoUrl = "";
        cached.profile_photo_url = "";
        storage.set(STORAGE_KEYS.currentUser, cached);
      }
      return { success: true, user: cached };
    }
    const res = await this.fetchWithAuth(
      `${API_BASE}/api/users/profile/photo`,
      {
        method: "DELETE",
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to remove profile photo."));
    }
    const result = await res.json();
    this.invalidateCache("auth_profile_");
    this.clearUserCache();
    const cached = storage.get<User | null>(STORAGE_KEYS.currentUser, null);
    if (cached) {
      cached.avatar = "";
      cached.profilePhotoUrl = "";
      cached.profile_photo_url = "";
      storage.set(STORAGE_KEYS.currentUser, cached);
    }
    return result;
  },

  async reverseGeocode(
    token?: string | null,
    latitude: number = 0,
    longitude: number = 0,
  ) {
    if (!API_BASE) return null;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}/api/location/reverse-geocode`, {
      method: "POST",
      headers,
      body: JSON.stringify({ latitude, longitude }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(
        parseApiError(data, "Failed to reverse geocode location"),
      );
    }
    return await res.json();
  },

  async changePassword(
    token: string,
    current_password: string,
    new_password: string,
    confirm_password: string,
  ) {
    if (!API_BASE) return null;
    const res = await this.fetchWithAuth(
      `${API_BASE}/api/auth/change-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password,
          new_password,
          confirm_password,
        }),
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to update password"));
    }
    return await res.json();
  },

  _refreshPromise: null as Promise<string | null> | null,

  async refreshToken(): Promise<string | null> {
    if (this._refreshPromise) {
      return this._refreshPromise;
    }

    const currentRefreshToken = storage.get<string | null>(
      STORAGE_KEYS.refreshToken,
      null,
    );
    if (!currentRefreshToken) return null;

    this._refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ refresh_token: currentRefreshToken }),
        });

        if (!res.ok) {
          return null;
        }

        const data = await res.json();
        if (data.token) {
          storage.set(STORAGE_KEYS.token, data.token);
          if (data.refreshToken) {
            storage.set(STORAGE_KEYS.refreshToken, data.refreshToken);
          }
          return data.token as string;
        }
        return null;
      } catch (err) {
        console.warn("[API] Token refresh notice:", err);
        return null;
      } finally {
        this._refreshPromise = null;
      }
    })();

    return this._refreshPromise;
  },

  async fetchWithAuth(
    url: string,
    options: RequestInit & { timeoutMs?: number } = {},
  ): Promise<Response> {
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    const refreshToken = storage.get<string | null>(STORAGE_KEYS.refreshToken, null);
    const headers = new Headers(options.headers || {});
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    } else if (!token && !headers.has("Authorization") && !refreshToken) {
      // Unauthenticated request without token or refresh token - return fast 401 without WAN roundtrip
      return new Response(JSON.stringify({ detail: "Unauthenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    options.headers = headers;

    const timeout = options.timeoutMs ?? 15000;
    let res = await fetchWithTimeout(url, options, timeout);

    if (
      res.status === 401 &&
      !url.includes("/api/login") &&
      !url.includes("/api/auth/refresh")
    ) {
      const newToken = await this.refreshToken();
      if (newToken) {
        const retryHeaders = new Headers(options.headers || {});
        retryHeaders.set("Authorization", `Bearer ${newToken}`);
        options.headers = retryHeaders;
        res = await fetchWithTimeout(url, options, timeout);
      } else {
        handleSessionExpiration();
      }
    }
    return res;
  },

  async logout(token: string) {
    try {
      const currentRefreshToken = storage.get<string | null>(
        STORAGE_KEYS.refreshToken,
        null,
      );
      await fetchWithTimeout(
        `${API_BASE}/api/auth/logout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify({ refresh_token: currentRefreshToken }),
        },
        3000
      ).catch(() => {});
    } finally {
      this.clearUserCache();
      storage.remove(STORAGE_KEYS.token);
      storage.remove(STORAGE_KEYS.refreshToken);
      storage.remove(STORAGE_KEYS.currentUser);
    }
  },

  async logoutAll(token: string) {
    try {
      await fetchWithTimeout(
        `${API_BASE}/api/auth/logout-all`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        },
        3000
      ).catch(() => {});
    } finally {
      this.clearUserCache();
      storage.remove(STORAGE_KEYS.token);
      storage.remove(STORAGE_KEYS.refreshToken);
      storage.remove(STORAGE_KEYS.currentUser);
    }
  },

  async getSessions(token: string) {
    const res = await this.fetchWithAuth(`${API_BASE}/api/auth/sessions`, {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) {
      throw new Error("Failed to fetch active sessions.");
    }
    const data = await res.json();
    return data.sessions || [];
  },

  async revokeSession(token: string, sessionId: string) {
    const res = await this.fetchWithAuth(
      `${API_BASE}/api/auth/sessions/${encodeURIComponent(sessionId)}`,
      {
        method: "DELETE",
        credentials: "include",
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to revoke session."));
    }
    return await res.json();
  },

  async getWishlist(token: string) {
    if (!token) return [];
    return getCachedOrFetch<string[]>(
      "user_wishlist",
      async () => {
        const res = await this.fetchWithAuth(`${API_BASE}/api/wishlist`, {
          method: "GET",
        });
        if (!res.ok) return [];
        return res.json();
      },
      { ttlMs: 15000, userIsolated: true, staleWhileRevalidate: true }
    );
  },

  async toggleWishlist(token: string, productId: string) {
    const res = await this.fetchWithAuth(`${API_BASE}/api/wishlist/toggle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ product_id: productId }),
    });
    if (!res.ok) throw new Error("Failed to toggle wishlist item");
    this.invalidateCache("user_wishlist");
    return res.json();
  },

  async getOrders(token: string) {
    if (!token) return [];
    return getCachedOrFetch<Order[]>(
      "user_orders",
      async () => {
        try {
          const res = await this.fetchWithAuth(`${API_BASE}/api/orders`, {
            method: "GET",
            timeoutMs: 15000,
          });
          if (!res.ok) {
            return storage.get<Order[]>(STORAGE_KEYS.orders, []);
          }
          const data = await res.json();
          const rawOrders = Array.isArray(data) ? data : [];
          const normalized = rawOrders.map((o: Record<string, unknown>) => {
            const pid = String(o.productId || o.product_id || "");
            const title = String(o.productTitle || o.product_title || "Gear Rental");
            const img = String(
              o.productImage ||
                o.product_image ||
                "",
            );
            const start = String(o.startDate || o.start_date || "Today");
            const end = String(o.endDate || o.end_date || "Tomorrow");
            const created = String(
              o.createdAt || o.created_at || (o as any).requestDate || (o as any).request_date || "",
            );
            return {
              id: String(o.id || ""),
              productId: pid,
              product_id: pid,
              productTitle: title,
              product_title: title,
              productImage: img,
              product_image: img,
              startDate: start,
              start_date: start,
              endDate: end,
              end_date: end,
              total: Number(o.total || 0),
              status: (o.status as Order["status"]) || "active",
              category: String(o.category || ""),
              createdAt: created,
              created_at: created,
              deliveryMethod: (o.deliveryMethod || o.delivery_method || "delivery") as string,
              deliveryAddress: (o.deliveryAddress || o.delivery_address || "") as string,
              pickupLocation: (o.pickupLocation || o.pickup_location || "") as string,
              customLocation: (o.customLocation || o.custom_location || "") as string,
              locationDirections: (o.locationDirections || o.location_directions || "") as string,
              latitude: (o.latitude ?? o.location_latitude ?? null) as number | null,
              longitude: (o.longitude ?? o.location_longitude ?? null) as number | null,
              mapUrl: (o.mapUrl || o.map_url || "") as string,
              locationChangeRequest: (o.locationChangeRequest || o.location_change_request || null) as any,
            };
          }) as Order[];
          storage.set(STORAGE_KEYS.orders, normalized);
          return normalized;
        } catch (err) {
          console.warn("[API] getOrders request notice, falling back to local storage:", err);
          return storage.get<Order[]>(STORAGE_KEYS.orders, []);
        }
      },
      { ttlMs: 15000, userIsolated: true, staleWhileRevalidate: true }
    );
  },

  async checkCategoryRestriction(
    token: string,
    category?: string,
    productId?: string
  ): Promise<{ restricted: boolean; category: string; message: string; blockingOrderId?: string }> {
    if (!token || (!category && !productId)) {
      return { restricted: false, category: "", message: "" };
    }
    try {
      const params = new URLSearchParams();
      if (category) params.append("category", category);
      if (productId) params.append("product_id", productId);
      const res = await this.fetchWithAuth(
        `${API_BASE}/api/orders/check-category-restriction?${params.toString()}`,
        { method: "GET" }
      );
      if (!res.ok) return { restricted: false, category: category || "", message: "" };
      return await res.json();
    } catch {
      return { restricted: false, category: category || "", message: "" };
    }
  },

  async getCategoryRestrictions(
    token: string
  ): Promise<{ restrictedCategories: string[]; activeOrders: any[] }> {
    if (!token) return { restrictedCategories: [], activeOrders: [] };
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/api/orders/category-restrictions`, {
        method: "GET",
      });
      if (!res.ok) return { restrictedCategories: [], activeOrders: [] };
      return await res.json();
    } catch {
      return { restrictedCategories: [], activeOrders: [] };
    }
  },

  async getOrderDetails(token: string, orderId: string) {
    const res = await this.fetchWithAuth(`${API_BASE}/api/orders/${orderId}`, {
      method: "GET",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to retrieve order details."));
    }
    const o = await res.json();
    const pid = String(o.productId || o.product_id || "");
    const title = String(o.productTitle || o.product_title || "Gear Rental");
    const img = String(
      o.productImage ||
        o.product_image ||
        "",
    );
    const start = String(o.startDate || o.start_date || "Today");
    const end = String(o.endDate || o.end_date || "Tomorrow");
    const created = String(
      o.createdAt || o.created_at || new Date().toISOString(),
    );

    return {
      id: String(o.id || ""),
      productId: pid,
      product_id: pid,
      productTitle: title,
      product_title: title,
      productImage: img,
      product_image: img,
      startDate: start,
      start_date: start,
      endDate: end,
      end_date: end,
      total: Number(o.total || 0),
      status: (o.status as Order["status"]) || "active",
      category: String(o.category || ""),
      createdAt: created,
      created_at: created,
      deliveryMethod: (o.deliveryMethod || o.delivery_method || "delivery") as string,
      deliveryAddress: (o.deliveryAddress || o.delivery_address || "") as string,
      pickupLocation: (o.pickupLocation || o.pickup_location || "") as string,
      customLocation: (o.customLocation || o.custom_location || "") as string,
      locationDirections: (o.locationDirections || o.location_directions || "") as string,
      latitude: (o.latitude ?? o.location_latitude ?? null) as number | null,
      longitude: (o.longitude ?? o.location_longitude ?? null) as number | null,
      mapUrl: (o.mapUrl || o.map_url || "") as string,
      locationChangeRequest: (o.locationChangeRequest || o.location_change_request || null) as any,
    } as Order;
  },

  async createOrder(token: string, orderData: Order) {
    const pid = orderData.productId || orderData.product_id || "";
    const title =
      orderData.productTitle || orderData.product_title || "Gear Rental";
    const img =
      orderData.productImage ||
      orderData.product_image ||
      "";
    const start = orderData.startDate || orderData.start_date || "Today";
    const end = orderData.endDate || orderData.end_date || "Tomorrow";

    const payload = {
      id: orderData.id,
      productId: pid,
      product_id: pid,
      productTitle: title,
      product_title: title,
      productImage: img,
      product_image: img,
      startDate: start,
      start_date: start,
      endDate: end,
      end_date: end,
      total: orderData.total,
      status: orderData.status || "active",
      category: orderData.category || "",
      createdAt:
        orderData.createdAt || orderData.created_at || new Date().toISOString(),
      deliveryMethod: orderData.deliveryMethod || (orderData as any).delivery_method || "delivery",
      deliveryAddress: orderData.deliveryAddress || (orderData as any).delivery_address || "",
      deliveryAddressId: orderData.deliveryAddressId || (orderData as any).delivery_address_id || undefined,
      deliveryAddressSnapshot: orderData.deliveryAddressSnapshot || (orderData as any).delivery_address_snapshot || undefined,
      pickupLocation: orderData.pickupLocation || (orderData as any).pickup_location || "",
      customLocation: orderData.customLocation || (orderData as any).custom_location || "",
      locationDirections: orderData.locationDirections || (orderData as any).location_directions || "",
      latitude: orderData.latitude ?? (orderData as any).location_latitude ?? null,
      longitude: orderData.longitude ?? (orderData as any).location_longitude ?? null,
    };

    const res = await this.fetchWithAuth(`${API_BASE}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      timeoutMs: 30000,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const detail =
        (errData && (errData.detail || errData.message || errData.error)) ||
        "Failed to create booking reservation";
      throw new Error(detail);
    }

    const currentOrders = storage.get<Order[]>(STORAGE_KEYS.orders, []);
    if (!currentOrders.some((o) => o.id === orderData.id)) {
      storage.set(STORAGE_KEYS.orders, [payload as Order, ...currentOrders]);
    }

    this.invalidateCache("user_orders");
    this.invalidateCache("public_stats");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("payent_orders_updated"));
      window.dispatchEvent(new CustomEvent("payent_booking_updated"));
    }
    return res.json();
  },

  async getUserAddresses(): Promise<UserAddress[]> {
    const res = await this.fetchWithAuth(`${API_BASE}/api/user/addresses`, {
      method: "GET",
    });
    if (!res.ok) {
      if (res.status === 401) return [];
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to load saved addresses"));
    }
    const data = await res.json();
    return data.addresses || [];
  },

  async saveUserAddress(addressData: Partial<UserAddress>): Promise<UserAddress> {
    const res = await this.fetchWithAuth(`${API_BASE}/api/user/addresses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addressData),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to save delivery address"));
    }
    const data = await res.json();
    return data.address;
  },

  async updateUserAddress(id: string, addressData: Partial<UserAddress>): Promise<UserAddress> {
    const res = await this.fetchWithAuth(`${API_BASE}/api/user/addresses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addressData),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to update delivery address"));
    }
    const data = await res.json();
    return data.address;
  },

  async deleteUserAddress(id: string): Promise<boolean> {
    const res = await this.fetchWithAuth(`${API_BASE}/api/user/addresses/${id}`, {
      method: "DELETE",
    });
    return res.ok;
  },

  async getOrderLocation(token: string, orderId: string) {
    const res = await this.fetchWithAuth(`${API_BASE}/api/orders/${orderId}/location`, {
      method: "GET",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to fetch order booking location"));
    }
    return await res.json();
  },

  async updateOrderLocation(token: string, orderId: string, locationData: {
    deliveryMethod?: string;
    deliveryAddress?: string;
    pickupLocation?: string;
    customLocation?: string;
    locationDirections?: string;
    latitude?: number | null;
    longitude?: number | null;
    reason?: string;
  }) {
    const res = await this.fetchWithAuth(`${API_BASE}/api/orders/${orderId}/location`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        delivery_method: locationData.deliveryMethod,
        delivery_address: locationData.deliveryAddress,
        pickup_location: locationData.pickupLocation,
        custom_location: locationData.customLocation,
        location_directions: locationData.locationDirections,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        reason: locationData.reason,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to update booking location"));
    }
    this.invalidateCache("user_orders");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("payent_orders_updated"));
    }
    return await res.json();
  },

  async approveOrderLocationChange(token: string, orderId: string) {
    const res = await this.fetchWithAuth(`${API_BASE}/api/orders/${orderId}/location-change/approve`, {
      method: "POST",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to approve location change"));
    }
    this.invalidateCache("user_orders");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("payent_orders_updated"));
    }
    return await res.json();
  },

  async rejectOrderLocationChange(token: string, orderId: string, feedback?: string) {
    const res = await this.fetchWithAuth(`${API_BASE}/api/orders/${orderId}/location-change/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback: feedback || "" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to reject location change"));
    }
    this.invalidateCache("user_orders");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("payent_orders_updated"));
    }
    return await res.json();
  },

  async cancelOrder(token: string, orderId: string, options?: { reason?: string; notes?: string }) {
    let res: Response;
    try {
      res = await this.fetchWithAuth(
        `${API_BASE}/api/orders/${orderId}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(options || {}),
        },
      );
    } catch (networkErr: any) {
      throw new Error(networkErr?.message || "Failed to reach server to cancel order. Please check your connection.");
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to cancel order"));
    }

    const resJson = await res.json().catch(() => ({ success: true, status: "cancelled" }));

    const currentOrders = storage.get<Order[]>(STORAGE_KEYS.orders, []);
    const updatedOrders = currentOrders.map((o) =>
      o.id === orderId ||
      o.productId === orderId ||
      (o as { product_id?: string }).product_id === orderId
        ? { ...o, status: "cancelled" as const }
        : o,
    );
    storage.set(STORAGE_KEYS.orders, updatedOrders);
    this.invalidateCache("user_orders");
    this.invalidateCache("public_stats");
    this.invalidateCache("dashboard");
    this.invalidateCache("vendor_bookings");
    this.invalidateCache("bookings");

    if (typeof window !== "undefined") {
      const detail = { bookingId: orderId, status: "cancelled" };
      window.dispatchEvent(new CustomEvent("payent_orders_updated", { detail }));
      window.dispatchEvent(new CustomEvent("payent_booking_updated", { detail }));
      window.dispatchEvent(new CustomEvent("payent_queue_updated", { detail }));
      window.dispatchEvent(new CustomEvent("payernt_data_refresh"));
      window.dispatchEvent(new CustomEvent("paye₹nt_data_refresh"));
    }
    return resJson;
  },

  async advanceRentalQueue(
    token: string,
    orderId: string,
    milestone: string,
    notes?: string,
  ) {
    let res: Response | null = null;
    try {
      res = await this.fetchWithAuth(
        `${API_BASE}/api/orders/${orderId}/queue-advance`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ milestone, notes }),
        },
      );
    } catch {
      /* network error / fallback */
    }

    if (res && !res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, `Failed to advance rental queue to ${milestone}`));
    }

    const payload = res ? await res.json().catch(() => ({})) : { success: true, status: milestone };

    // Synchronize local cached orders
    const currentOrders = storage.get<Order[]>(STORAGE_KEYS.orders, []);
    const nowIso = new Date().toISOString();
    const updatedOrders = currentOrders.map((o) => {
      if (o.id === orderId || o.productId === orderId || (o as { product_id?: string }).product_id === orderId) {
        const tsUpdate: Partial<Order> = {
          status: (payload.status || milestone) as any,
          queueNotes: notes || o.queueNotes,
        };
        if (milestone === "ready_for_pickup") tsUpdate.readyForPickupAt = nowIso;
        if (milestone === "picked_up" || milestone === "rental_in_progress") {
          if (!o.pickedUpAt) tsUpdate.pickedUpAt = nowIso;
        }
        if (milestone === "return_initiated") {
          if (!o.returnInitiatedAt) tsUpdate.returnInitiatedAt = nowIso;
        }
        if (milestone === "handed_back" || milestone === "returned") {
          if (!o.handedBackAt) tsUpdate.handedBackAt = nowIso;
          if (!o.awaitingInspectionAt) tsUpdate.awaitingInspectionAt = nowIso;
        }
        if (milestone === "awaiting_inspection") {
          if (!o.awaitingInspectionAt) tsUpdate.awaitingInspectionAt = nowIso;
        }
        if (milestone === "completed") {
          if (!o.completedAt) tsUpdate.completedAt = nowIso;
        }
        if (payload.timestamps) {
          if (payload.timestamps.ready_for_pickup_at) tsUpdate.readyForPickupAt = payload.timestamps.ready_for_pickup_at;
          if (payload.timestamps.picked_up_at) tsUpdate.pickedUpAt = payload.timestamps.picked_up_at;
          if (payload.timestamps.return_initiated_at) tsUpdate.returnInitiatedAt = payload.timestamps.return_initiated_at;
          if (payload.timestamps.handed_back_at) tsUpdate.handedBackAt = payload.timestamps.handed_back_at;
          if (payload.timestamps.awaiting_inspection_at) tsUpdate.awaitingInspectionAt = payload.timestamps.awaiting_inspection_at;
          if (payload.timestamps.completed_at) tsUpdate.completedAt = payload.timestamps.completed_at;
        }
        return { ...o, ...tsUpdate };
      }
      return o;
    });
    storage.set(STORAGE_KEYS.orders, updatedOrders);
    this.invalidateCache("user_orders");

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("payent_orders_updated"));
      window.dispatchEvent(new CustomEvent("payent_queue_updated", { detail: { orderId, bookingId: orderId, milestone, data: payload, payload } }));
    }

    return payload;
  },

  async markReadyForPickup(token: string, orderId: string) {
    return this.advanceRentalQueue(token, orderId, "ready_for_pickup");
  },

  async confirmPickup(token: string, orderId: string) {
    return this.advanceRentalQueue(token, orderId, "picked_up");
  },

  async initiateReturn(token: string, orderId: string) {
    return this.advanceRentalQueue(token, orderId, "return_initiated");
  },

  async confirmReturnHandover(token: string, orderId: string) {
    return this.advanceRentalQueue(token, orderId, "handed_back");
  },

  async markAwaitingInspection(token: string, orderId: string) {
    return this.advanceRentalQueue(token, orderId, "awaiting_inspection");
  },

  async completeRental(token: string, orderId: string) {
    return this.advanceRentalQueue(token, orderId, "completed");
  },

  async acceptOrder(token: string, orderId: string) {
    let res: Response | null = null;
    try {
      res = await this.fetchWithAuth(
        `${API_BASE}/api/orders/${orderId}/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch {
      /* network error / fallback */
    }

    if (res && !res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, `Failed to accept booking ${orderId}`));
    }

    const payload = res ? await res.json().catch(() => ({})) : { success: true, status: "accepted" };

    const currentOrders = storage.get<Order[]>(STORAGE_KEYS.orders, []);
    const updatedOrders = currentOrders.map((o) => {
      if (o.id === orderId || o.productId === orderId) {
        return { ...o, status: "accepted" as any };
      }
      return o;
    });
    storage.set(STORAGE_KEYS.orders, updatedOrders);
    this.invalidateCache("user_orders");

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("payent_orders_updated"));
      window.dispatchEvent(new CustomEvent("payent_booking_updated"));
      window.dispatchEvent(new CustomEvent("payent_queue_updated", { detail: { orderId, bookingId: orderId, status: "accepted", payload } }));
    }

    return payload;
  },

  async rejectOrder(token: string, orderId: string, reason?: string, feedback?: string) {
    let res: Response | null = null;
    try {
      res = await this.fetchWithAuth(
        `${API_BASE}/api/orders/${orderId}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason || "declined_by_vendor", feedback: feedback || reason || "" }),
        },
      );
    } catch {
      /* network error / fallback */
    }

    if (res && !res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, `Failed to decline booking ${orderId}`));
    }

    const payload = res ? await res.json().catch(() => ({})) : { success: true, status: "rejected" };

    const currentOrders = storage.get<Order[]>(STORAGE_KEYS.orders, []);
    const updatedOrders = currentOrders.map((o) => {
      if (o.id === orderId || o.productId === orderId) {
        return { ...o, status: "rejected" as any };
      }
      return o;
    });
    storage.set(STORAGE_KEYS.orders, updatedOrders);
    this.invalidateCache("user_orders");

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("payent_orders_updated"));
      window.dispatchEvent(new CustomEvent("payent_booking_updated"));
      window.dispatchEvent(new CustomEvent("payent_queue_updated", { detail: { orderId, bookingId: orderId, status: "rejected", payload } }));
    }

    return payload;
  },

  async submitOrderDispute(token: string, orderId: string, rebuttalNotes: string, evidence?: any) {
    const res = await this.fetchWithAuth(`${API_BASE}/api/orders/${orderId}/dispute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rebuttal_notes: rebuttalNotes, evidence }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to submit dispute rebuttal"));
    }
    return res.json();
  },

  async getCustomProducts(token: string) {
    if (!token) return [];
    return getCachedOrFetch<Product[]>(
      "user_custom_products",
      async () => {
        const res = await this.fetchWithAuth(`${API_BASE}/api/products/custom`, {
          method: "GET",
        });
        if (!res.ok) return [];
        return res.json();
      },
      { ttlMs: 15000, userIsolated: true, staleWhileRevalidate: true }
    );
  },

  async getPublicCustomProducts(): Promise<Product[]> {
    return getCachedOrFetch<Product[]>(
      "public_custom_products",
      async () => {
        let items: Product[] = [];
        if (API_BASE) {
          try {
            const res = await fetchWithTimeout(
              `${API_BASE}/api/products/custom/public`,
              { method: "GET" },
              8000
            );
            if (res.ok) {
              const json = await res.json();
              if (Array.isArray(json)) {
                items = json;
              } else if (json && Array.isArray(json.data)) {
                items = json.data;
              } else if (json && Array.isArray(json.products)) {
                items = json.products;
              } else {
                items = [];
              }
            } else {
              items = [];
            }
          } catch {
            items = [];
          }
        }
        if (Array.isArray(items)) {
          const normalizedItems = items
            .filter((p) => !isFakeOrDeletedProduct(p))
            .map((p) => {
              const norm = normalizeProductData(p);
              if (norm && norm.id) {
                _productCache.set(String(norm.id), norm);
              }
              return norm;
            });
          storage.set("payent_server_products", normalizedItems);
          return normalizedItems;
        }
        return items;
      },
      { ttlMs: 30000, staleWhileRevalidate: true }
    );
  },

  async getPublicProducts(): Promise<Product[] | null> {
    return this.getPublicCustomProducts().catch(() => null);
  },

  async getPublicCategories() {
    if (!API_BASE) return null;
    return getCachedOrFetch(
      "public_categories",
      async () => {
        try {
          const res = await fetchWithTimeout(`${API_BASE}/api/categories/public`, {}, 8000);
          if (!res.ok) return null;
          return await res.json();
        } catch {
          return null;
        }
      },
      { ttlMs: 60000, staleWhileRevalidate: true }
    );
  },

  async createCustomProduct(token: string, productData: Product) {
    const res = await this.fetchWithAuth(`${API_BASE}/api/products/custom`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(productData),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || errData.message || "Failed to create custom product");
    }
    const data = await res.json();
    if (!data || data.success === false) {
      throw new Error(data?.message || "Product submission could not be verified by the server.");
    }
    this.invalidateCache("public_custom_products");
    this.invalidateCache("public_categories");
    this.invalidateCache("public_stats");
    this.invalidateCache("user_custom_products");
    return data;
  },

  async deleteCustomProduct(token: string, id: string) {
    const res = await this.fetchWithAuth(
      `${API_BASE}/api/products/custom/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    if (!res.ok) {
      const errData = await res
        .json()
        .catch(() => ({ detail: "Failed to delete product from database" }));
      throw new Error(
        errData.detail || "Failed to delete product from database",
      );
    }
    this.invalidateCache("public_custom_products");
    this.invalidateCache("public_categories");
    this.invalidateCache("public_stats");
    this.invalidateCache("user_custom_products");
    this.invalidateCache(`product:${id}`);
    return res.json();
  },

  async getNotifications(token: string) {
    if (!token) return [];
    return getCachedOrFetch(
      "user_notifications",
      async () => {
        const res = await this.fetchWithAuth(`${API_BASE}/api/notifications`, {
          method: "GET",
        });
        if (!res.ok) return [];
        const data = await res.json();
        if (Array.isArray(data)) {
          storage.set(STORAGE_KEYS.notifications, data);
        }
        return data;
      },
      { ttlMs: 15000, userIsolated: true, staleWhileRevalidate: true }
    );
  },

  async markNotificationsRead(token: string) {
    const res = await this.fetchWithAuth(`${API_BASE}/api/notifications/read`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to mark notifications as read");
    this.invalidateCache("user_notifications");
    return res.json();
  },

  async markNotificationRead(token: string, id: string) {
    const res = await this.fetchWithAuth(`${API_BASE}/api/notifications/${id}/read`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to mark notification as read");
    this.invalidateCache("user_notifications");
    return res.json();
  },

  async rejectOrder(token: string, orderId: string, reason?: string) {
    const res = await this.fetchWithAuth(`${API_BASE}/api/orders/${orderId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(parseApiError(data, "Failed to reject order"));
    this.invalidateCache("user_notifications");
    this.invalidateCache("orders");
    return data;
  },

  async getLenderOrders(token: string) {
    const res = await this.fetchWithAuth(`${API_BASE}/api/lender/orders`, {
      method: "GET",
    });
    if (!res.ok) throw new Error("Failed to fetch lender orders");
    const data = await res.json();
    const rawOrders = Array.isArray(data) ? data : [];
    return rawOrders.map((r: Record<string, unknown>) => {
      const pid = String(r.productId || r.product_id || "");
      const title = String(r.productTitle || r.product_title || "Gear Rental");
      const img = String(r.productImage || r.product_image || "");
      const start = String(r.startDate || r.start_date || "");
      const end = String(r.endDate || r.end_date || "");
      const created = String(r.createdAt || r.created_at || "");

      return {
        ...r,
        id: String(r.id || ""),
        productId: pid,
        product_id: pid,
        productTitle: title,
        product_title: title,
        productImage: img,
        product_image: img,
        startDate: start,
        start_date: start,
        endDate: end,
        end_date: end,
        total: Number(r.total || 0),
        status: r.status || "active",
        createdAt: created,
        created_at: created,
      };
    });
  },

  async getPublicStats() {
    return getCachedOrFetch(
      "public_stats",
      async () => {
        try {
          const res = await fetchWithTimeout(`${API_BASE}/api/stats/public`, {}, 8000);
          if (res.ok) {
            return await res.json();
          }
        } catch {
          // Backend request failed; use actual local client datastore
        }

        const customProds = storage.get<Product[]>(STORAGE_KEYS.customProducts, []);
        const orders = storage.get<Order[]>(STORAGE_KEYS.orders, []);
        const user = storage.get<{ city?: string } | null>(
          STORAGE_KEYS.currentUser,
          null,
        );

        return {
          activeListings: customProds.length,
          totalRentals: orders.length,
          happyLenders: user ? 1 : 0,
          citiesCovered: user && user.city ? 1 : 0,
        };
      },
      { ttlMs: 60000, staleWhileRevalidate: true }
    );
  },

  async submitContactForm(data: {
    name: string;
    email: string;
    phone?: string;
    category?: string;
    subject: string;
    message: string;
  }) {
    const res = await fetch(`${API_BASE}/api/contact`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        parseApiError(result, "Unable to send your message. Please try again."),
      );
    }
    return result;
  },

  async getUserStats(token: string): Promise<UserProfileStats> {
    if (!token) {
      return {
        completed_rentals: 0,
        lender_rating: null,
        review_count: 0,
        on_time_return_rate: null,
        average_response_time_minutes: null,
        has_data: false,
      };
    }
    return getCachedOrFetch<UserProfileStats>(
      "user_profile_stats",
      async () => {
        const res = await this.fetchWithAuth(`${API_BASE}/api/profile/stats`, {
          method: "GET",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(parseApiError(data, "Failed to fetch profile stats"));
        }
        return await res.json();
      },
      { ttlMs: 15000, userIsolated: true, staleWhileRevalidate: true }
    );
  },

  async getMessages(token: string): Promise<Conversation[]> {
    if (!token) return [];
    const res = await this.fetchWithAuth(`${API_BASE}/api/messages`, {
      method: "GET",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to fetch messages"));
    }
    return await res.json();
  },

  async getConversation(token: string, id: string): Promise<Conversation> {
    const res = await this.fetchWithAuth(`${API_BASE}/api/messages/${id}`, {
      method: "GET",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to fetch conversation"));
    }
    return await res.json();
  },

  async sendMessage(
    token: string,
    conversationId: string,
    message: string,
  ): Promise<{ success: boolean; id: string; messages: ConversationMessage[]; updatedAt: string }> {
    const res = await this.fetchWithAuth(
      `${API_BASE}/api/messages/${conversationId}/reply`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to send message"));
    }
    return await res.json();
  },

  async createConversation(
    token: string,
    payload: { subject: string; message: string; category?: string },
  ): Promise<{ success: boolean; id: string; subject: string; category: string; messages: ConversationMessage[]; createdAt: string }> {
    const res = await this.fetchWithAuth(`${API_BASE}/api/messages/new`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to create conversation"));
    }
    return await res.json();
  },

  async markConversationRead(token: string, id: string): Promise<{ success: boolean }> {
    const res = await this.fetchWithAuth(`${API_BASE}/api/messages/${id}/read`, {
      method: "PATCH",
    });
    if (!res.ok) {
      return { success: false };
    }
    return await res.json();
  },

  async toggleCustomProductAvailability(token: string, productId: string) {
    const res = await this.fetchWithAuth(
      `${API_BASE}/api/products/custom/${productId}/toggle-availability`,
      {
        method: "POST",
      },
    );
    if (!res.ok)
      throw new Error("Failed to toggle custom product availability");
    this.invalidateCache("public_custom_products");
    this.invalidateCache("user_custom_products");
    this.invalidateCache(`product:${productId}`);
    return res.json();
  },

  async createRazorpayOrder(
    token: string,
    productId: string,
    startDate: string,
    endDate: string,
    couponCode?: string,
    locationData?: {
      deliveryMethod?: string;
      deliveryAddress?: string;
      pickupLocation?: string;
      customLocation?: string;
      locationDirections?: string;
      latitude?: number | null;
      longitude?: number | null;
    },
  ) {
    const res = await this.fetchWithAuth(
      `${API_BASE}/api/payments/create-order`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: productId,
          start_date: startDate,
          end_date: endDate,
          coupon_code: couponCode || null,
          delivery_method: locationData?.deliveryMethod || "delivery",
          delivery_address: locationData?.deliveryAddress || "",
          pickup_location: locationData?.pickupLocation || "",
          custom_location: locationData?.customLocation || "",
          location_directions: locationData?.locationDirections || "",
          latitude: locationData?.latitude ?? null,
          longitude: locationData?.longitude ?? null,
        }),
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Failed to create Razorpay order.");
    }
    return res.json();
  },

  async verifyRazorpayPayment(
    token: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ) {
    const res = await this.fetchWithAuth(`${API_BASE}/api/payments/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Razorpay signature verification failed.");
    }
    return res.json();
  },

  async processRefund(
    token: string,
    orderId: string,
    amount?: number,
    reason?: string,
  ) {
    const res = await this.fetchWithAuth(`${API_BASE}/api/payments/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        order_id: orderId,
        amount: amount || null,
        reason: reason || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Failed to process refund.");
    }
    return res.json();
  },

  // Recommendation Engine API Methods
  async getSimilarRecommendations(productId: string): Promise<Product[]> {
    if (!API_BASE || !productId) return [];
    return getCachedOrFetch<Product[]>(
      `rec_similar_${productId}`,
      async () => {
        try {
          const res = await fetch(
            `${API_BASE}/api/recommendations/similar/${encodeURIComponent(productId)}`,
          );
          if (!res.ok) return [];
          return await res.json();
        } catch {
          return [];
        }
      },
      { ttlMs: 60000, staleWhileRevalidate: true }
    );
  },

  async getTrendingRecommendations(): Promise<Product[]> {
    if (!API_BASE) return [];
    return getCachedOrFetch<Product[]>(
      "rec_trending",
      async () => {
        try {
          const res = await fetch(`${API_BASE}/api/recommendations/trending`);
          if (!res.ok) return [];
          return await res.json();
        } catch {
          return [];
        }
      },
      { ttlMs: 60000, staleWhileRevalidate: true }
    );
  },

  async getFrequentlyTogetherRecommendations(
    productId: string,
  ): Promise<Product[]> {
    if (!API_BASE || !productId) return [];
    return getCachedOrFetch<Product[]>(
      `rec_freq_together_${productId}`,
      async () => {
        try {
          const res = await fetch(
            `${API_BASE}/api/recommendations/frequently-together/${encodeURIComponent(productId)}`,
          );
          if (!res.ok) return [];
          return await res.json();
        } catch {
          return [];
        }
      },
      { ttlMs: 60000, staleWhileRevalidate: true }
    );
  },

  async getPersonalizedRecommendations(userEmail?: string, sessionId?: string) {
    if (!API_BASE) return null;
    try {
      const params = new URLSearchParams();
      if (userEmail) params.append("user_email", userEmail);
      if (sessionId) params.append("session_id", sessionId);

      const url = `${API_BASE}/api/recommendations/personalized${params.toString() ? "?" + params.toString() : ""}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getMLStatus() {
    if (!API_BASE) return null;
    try {
      const res = await fetch(`${API_BASE}/api/recommendations/ml-status`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async searchML(
    query: string,
    category?: string,
    userEmail?: string,
    sessionId?: string,
    limit: number = 20,
  ) {
    if (!API_BASE) return null;
    try {
      const res = await fetch(`${API_BASE}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: (query || "").trim(),
          category: category === "all" ? undefined : category,
          user_email: userEmail,
          session_id: sessionId,
          limit,
        }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getSearchStats() {
    if (!API_BASE) return null;
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/search/stats`, {}, 5000);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getSupportTickets(token: string) {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/api/support`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async createSupportTicket(
    token: string,
    ticket: {
      subject: string;
      message: string;
      category?: string;
      priority?: string;
      bookingId?: string;
      productReference?: string;
    },
  ) {
    const res = await this.fetchWithAuth(`${API_BASE}/api/support`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(ticket),
    });
    if (!res.ok) {
      let errorMsg = "Failed to create support ticket";
      try {
        const errJson = await res.json();
        if (errJson.detail) errorMsg = errJson.detail;
      } catch {}
      throw new Error(errorMsg);
    }
    return await res.json();
  },

  async replyToConversation(token: string, conversationId: string, message: string) {
    return this.sendMessage(token, conversationId, message);
  },

  async checkAvailabilityBatch(
    startDate: string,
    endDate: string,
    productIds: string[],
  ): Promise<BatchAvailabilityResponse> {
    if (!API_BASE) {
      const defaultMap: Record<string, ProductAvailabilityItem> = {};
      productIds.forEach((pid) => {
        defaultMap[pid] = {
          status: "available",
          is_available: true,
          reason: null,
        };
      });
      return {
        start_date: startDate,
        end_date: endDate,
        availability: defaultMap,
      };
    }
    const res = await fetch(`${API_BASE}/api/products/availability/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start_date: startDate,
        end_date: endDate,
        product_ids: productIds,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(
        parseApiError(data, "Failed to check product availability"),
      );
    }
    return await res.json();
  },

  async getProductAvailability(
    id: string,
    startDate: string,
    endDate: string,
  ): Promise<ProductAvailabilityItem & { product_id: string }> {
    if (!API_BASE) {
      return {
        product_id: id,
        status: "available",
        is_available: true,
        reason: null,
      };
    }
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });
    const res = await fetch(
      `${API_BASE}/api/products/${id}/availability?${params.toString()}`,
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to get availability"));
    }
    return await res.json();
  },

  async getCart(): Promise<CartResponse> {
    if (!API_BASE) {
      const stored = storage.get<CartItem[]>("payent_offline_cart", []);
      const subtotal = stored.reduce(
        (sum, it) => sum + (it.daily_price || 0) * (it.days || 1),
        0,
      );
      const tax = Math.round(subtotal * 0.08);
      return {
        items: stored,
        count: stored.length,
        subtotal,
        tax,
        total: subtotal + tax,
      };
    }
    return getCachedOrFetch<CartResponse>(
      "user_cart",
      async () => {
        const res = await this.fetchWithAuth(`${API_BASE}/api/cart`, {
          method: "GET",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(parseApiError(data, "Failed to load cart"));
        }
        return await res.json();
      },
      { ttlMs: 15000, userIsolated: true, staleWhileRevalidate: true }
    );
  },

  async addToCart(
    productId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{ success: boolean; message: string; item: CartItem }> {
    this.invalidateCache("user_cart");
    if (!API_BASE) {
      const stored = storage.get<CartItem[]>("payent_offline_cart", []);
      const cached = _productCache.get(productId);
      const newItem: CartItem = {
        id: `offline_cart_${Date.now()}`,
        user_email: "bommidimohan2003@gmail.com",
        product_id: productId,
        title: cached?.title || "Tech Gear",
        price: cached?.price || 1500,
        daily_price: cached?.price || 1500,
        image: cached?.image || "",
        category: cached?.category || "gear",
        city: "India",
        start_date: startDate || "",
        end_date: endDate || "",
        days: 1,
        total_price: cached?.price || 1500,
        is_available: true,
      };
      const filtered = stored.filter((i) => i.product_id !== productId);
      filtered.push(newItem);
      storage.set("payent_offline_cart", filtered);
      return { success: true, message: "Added to cart", item: newItem };
    }
    const res = await this.fetchWithAuth(`${API_BASE}/api/cart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: productId,
        start_date: startDate || null,
        end_date: endDate || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to add item to cart"));
    }
    this.invalidateCache("user_cart");
    return await res.json();
  },

  async removeFromCart(
    itemId: string,
  ): Promise<{ success: boolean; message: string }> {
    this.invalidateCache("user_cart");
    if (!API_BASE) {
      const stored = storage.get<CartItem[]>("payent_offline_cart", []);
      const filtered = stored.filter((i) => i.id !== itemId);
      storage.set("payent_offline_cart", filtered);
      return { success: true, message: "Item removed" };
    }
    const res = await this.fetchWithAuth(`${API_BASE}/api/cart/${itemId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to remove item from cart"));
    }
    this.invalidateCache("user_cart");
    return await res.json();
  },

  async clearCart(): Promise<{ success: boolean; message: string }> {
    this.invalidateCache("user_cart");
    if (!API_BASE) {
      storage.set("payent_offline_cart", []);
      return { success: true, message: "Cart cleared" };
    }
    const res = await this.fetchWithAuth(`${API_BASE}/api/cart`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to clear cart"));
    }
    this.invalidateCache("user_cart");
    return await res.json();
  },

  async validateCartCheckout(): Promise<{
    valid: boolean;
    item_count: number;
    subtotal: number;
    tax: number;
    total: number;
  }> {
    if (!API_BASE) {
      return {
        valid: true,
        item_count: 1,
        subtotal: 3000,
        tax: 240,
        total: 3240,
      };
    }
    const res = await this.fetchWithAuth(`${API_BASE}/api/cart/checkout`, {
      method: "POST",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Checkout validation failed"));
    }
    return await res.json();
  },

  // --- Delivery Tracking API ---
  async getBookingDelivery(
    token: string,
    bookingId: string,
    signal?: AbortSignal,
  ): Promise<BookingDeliveryResponse> {
    const res = await this.fetchWithAuth(
      `${API_BASE}/api/bookings/${bookingId}/delivery`,
      {
        method: "GET",
        signal,
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to load delivery information"));
    }
    return await res.json();
  },

  async getRenterSecretPin(
    token: string,
    bookingId: string,
  ): Promise<{
    success: boolean;
    bookingId: string;
    renterSecretPin: string;
    status: string;
    deliveryStatus: string;
    instructions: string;
  }> {
    const res = await this.fetchWithAuth(
      `${API_BASE}/api/bookings/${bookingId}/renter-pin`,
      {
        method: "GET",
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to retrieve Secret PIN"));
    }
    return await res.json();
  },

  async updateDeliveryStatus(
    token: string,
    deliveryId: string,
    status: string,
    note?: string,
  ): Promise<{ success: boolean; delivery: Delivery; message: string }> {
    const res = await this.fetchWithAuth(
      `${API_BASE}/api/deliveries/${deliveryId}/status`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to update delivery status"));
    }
    return await res.json();
  },

  async sendDeliveryLocation(
    token: string,
    deliveryId: string,
    coords: {
      latitude: number;
      longitude: number;
      heading?: number | null;
      speed?: number | null;
      accuracy?: number | null;
    },
  ): Promise<{ success: boolean; location: DeliveryLocationUpdate; etaMinutes?: number }> {
    const res = await this.fetchWithAuth(
      `${API_BASE}/api/deliveries/${deliveryId}/location`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coords),
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to send delivery location"));
    }
    return await res.json();
  },

  async confirmDeliveryReceipt(
    token: string,
    deliveryId: string,
  ): Promise<{ success: boolean; delivery: Delivery; message: string }> {
    const res = await this.fetchWithAuth(
      `${API_BASE}/api/deliveries/${deliveryId}/confirm`,
      {
        method: "POST",
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to confirm delivery receipt"));
    }
    return await res.json();
  },

  async getDeliveryTracking(
    token: string,
    deliveryId: string,
    signal?: AbortSignal,
  ): Promise<{ success: boolean; tracking: DeliveryTrackingData }> {
    const res = await this.fetchWithAuth(
      `${API_BASE}/api/deliveries/${deliveryId}/tracking`,
      {
        method: "GET",
        signal,
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to fetch tracking data"));
    }
    return await res.json();
  },

  async getDeliveryLocations(
    token: string,
    deliveryId: string,
    limit: number = 50,
    signal?: AbortSignal,
  ): Promise<{ success: boolean; locations: DeliveryLocationUpdate[] }> {
    const res = await this.fetchWithAuth(
      `${API_BASE}/api/deliveries/${deliveryId}/locations?limit=${limit}`,
      {
        method: "GET",
        signal,
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to fetch locations"));
    }
    return await res.json();
  },

  async sendRenterHandoverOtp(
    bookingId: string,
  ): Promise<{ success: boolean; message: string; targetPhoneMasked?: string; expiresInSeconds?: number }> {
    const res = await this.fetchWithAuth(
      `${API_BASE}/api/deliveries/${bookingId}/renter-otp/send`,
      {
        method: "POST",
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to send renter OTP"));
    }
    return await res.json();
  },

  async verifyRenterHandoverOtp(
    bookingId: string,
    otp: string,
  ): Promise<{ success: boolean; deliveryStatus: string; renterSecretPin?: string; message: string }> {
    const res = await this.fetchWithAuth(
      `${API_BASE}/api/deliveries/${bookingId}/renter-otp/verify`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to verify renter OTP"));
    }
    return await res.json();
  },

  async sendVendorHandoverOtp(
    bookingId: string,
  ): Promise<{ success: boolean; message: string; purpose?: string; expiresAt?: number; otp?: string }> {
    const res = await this.fetchWithAuth(
      `${API_BASE}/api/deliveries/${bookingId}/vendor-otp/send`,
      {
        method: "POST",
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to send vendor OTP"));
    }
    return await res.json();
  },

  async verifyVendorHandoverOtp(
    bookingId: string,
    otp: string,
  ): Promise<{ success: boolean; deliveryStatus: string; vendorHandoverVerified: boolean; message: string }> {
    const res = await this.fetchWithAuth(
      `${API_BASE}/api/deliveries/${bookingId}/vendor-otp/verify`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to verify vendor OTP"));
    }
    return await res.json();
  },

  async getVendorSecretPin(
    bookingId: string,
  ): Promise<{ success: boolean; bookingId: string; vendorSecretPin: string; createdAt: string; deliveryStatus: string }> {
    const res = await this.fetchWithAuth(
      `${API_BASE}/api/payernt/bookings/${bookingId}/secret-pin`,
      {
        method: "GET",
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to fetch Vendor Secret PIN"));
    }
    return await res.json();
  },

  async generateVendorSecretPin(
    bookingId: string,
  ): Promise<{ success: boolean; bookingId: string; vendorSecretPin: string; createdAt: string; deliveryStatus: string }> {
    const res = await this.fetchWithAuth(
      `${API_BASE}/api/payernt/bookings/${bookingId}/generate-secret-pin`,
      {
        method: "POST",
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to generate Vendor Secret PIN"));
    }
    return await res.json();
  },

  async confirmRenterInspection(
    bookingId: string,
    checklist?: Record<string, boolean>,
  ): Promise<{ success: boolean; message: string; renterSecretPin?: string; inspectionConfirmedAt?: string; security?: any }> {
    const res = await this.fetchWithAuth(
      `${API_BASE}/api/bookings/${bookingId}/confirm-inspection`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklist }),
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to confirm product inspection"));
    }
    return await res.json();
  },

  async activateRental(
    bookingId: string,
    renterPin?: string,
  ): Promise<{ success: boolean; bookingId: string; rentalStatus: string; deliveryStatus: string; rentalStartedAt: string; message: string }> {
    const res = await this.fetchWithAuth(
      `${API_BASE}/api/bookings/${bookingId}/activate-rental`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ renterPin: renterPin || "" }),
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to activate rental"));
    }
    return await res.json();
  },


  // --- Real-time Booking Conversations API ---
  async getBookingConversation(
    token: string,
    bookingId: string,
    signal?: AbortSignal,
  ): Promise<{ success: boolean; conversation: RealtimeConversation }> {
    const res = await this.fetchWithAuth(
      `${API_BASE}/api/bookings/${bookingId}/conversation`,
      {
        method: "GET",
        signal,
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to fetch booking conversation"));
    }
    return await res.json();
  },

  async createOrGetConversation(
    token: string,
    payload: { productId?: string; bookingId?: string; initialMessage?: string },
    signal?: AbortSignal,
  ): Promise<{ success: boolean; conversation: RealtimeConversation }> {
    const res = await this.fetchWithAuth(`${API_BASE}/api/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: payload.productId,
        booking_id: payload.bookingId,
        initial_message: payload.initialMessage,
      }),
      signal,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to initiate conversation"));
    }
    this.invalidateCache("user_conversations");
    this.invalidateCache("user_unread_conversations_count");
    return await res.json();
  },

  async getRealtimeConversations(
    token: string,
    search?: string,
    signal?: AbortSignal,
  ): Promise<{ success: boolean; conversations: RealtimeConversation[] }> {
    if (!token) return { success: true, conversations: [] };
    const fetcher = async () => {
      const url = new URL(`${API_BASE}/api/conversations`);
      if (search && search.trim()) {
        url.searchParams.set("search", search.trim());
      }
      const res = await this.fetchWithAuth(url.toString(), {
        method: "GET",
        signal,
      });
      if (!res.ok) {
        return { success: false, conversations: [] };
      }
      const result = await res.json();
      if (result && Array.isArray(result.conversations) && !search) {
        storage.set(STORAGE_KEYS.messages, result.conversations);
      }
      return result;
    };

    if (search && search.trim()) {
      return fetcher();
    }

    return getCachedOrFetch(
      "user_conversations",
      fetcher,
      { ttlMs: 15000, userIsolated: true, staleWhileRevalidate: true }
    );
  },

  async prefetchAuthenticatedRoutes(token: string) {
    if (!token || !API_BASE) return;
    try {
      Promise.allSettled([
        this.getOrders(token),
        this.getRealtimeConversations(token),
        this.getUnreadMessagesCount(token),
        this.getNotifications(token),
        this.getCustomProducts(token),
      ]).catch(() => {});
    } catch {
      /* ignore prefetch failures */
    }
  },

  async getUnreadMessagesCount(
    token: string,
    signal?: AbortSignal,
  ): Promise<{ success: boolean; unreadCount: number }> {
    if (!token) return { success: true, unreadCount: 0 };
    return getCachedOrFetch(
      "user_unread_conversations_count",
      async () => {
        const res = await this.fetchWithAuth(`${API_BASE}/api/conversations/unread-count`, {
          method: "GET",
          signal,
        });
        if (!res.ok) {
          return { success: false, unreadCount: 0 };
        }
        return await res.json();
      },
      { ttlMs: 15000, userIsolated: true, staleWhileRevalidate: true }
    );
  },

  async getRealtimeConversationDetail(
    token: string,
    conversationId: string,
    signal?: AbortSignal,
  ): Promise<{ success: boolean; conversation: RealtimeConversation }> {
    const res = await this.fetchWithAuth(
      `${API_BASE}/api/conversations/${conversationId}`,
      {
        method: "GET",
        signal,
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to load conversation"));
    }
    return await res.json();
  },

  async sendRealtimeMessage(
    token: string,
    conversationId: string,
    content: string,
    messageType: string = "TEXT",
    attachmentUrl?: string,
    fileName?: string,
    fileType?: string,
    fileSize?: number,
  ): Promise<{ success: boolean; message: RealtimeMessage }> {
    const res = await this.fetchWithAuth(
      `${API_BASE}/api/conversations/${conversationId}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          message_type: messageType,
          attachment_url: attachmentUrl,
          file_name: fileName,
          file_type: fileType,
          file_size: fileSize,
        }),
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Unable to send your message. Please try again."));
    }
    this.invalidateCache("user_conversations");
    this.invalidateCache("user_unread_conversations_count");
    return await res.json();
  },

  async uploadConversationAttachment(
    token: string,
    conversationId: string,
    payload: { fileData: string; fileName: string; fileType: string; fileSize?: number },
  ): Promise<{ success: boolean; message: RealtimeMessage }> {
    const res = await this.fetchWithAuth(
      `${API_BASE}/api/conversations/${conversationId}/attachments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_data: payload.fileData,
          file_name: payload.fileName,
          file_type: payload.fileType,
          file_size: payload.fileSize || 0,
        }),
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Unable to upload attachment. Please try again."));
    }
    this.invalidateCache("user_conversations");
    return await res.json();
  },

  async markRealtimeConversationRead(
    token: string,
    conversationId: string,
  ): Promise<{ success: boolean }> {
    const res = await this.fetchWithAuth(
      `${API_BASE}/api/conversations/${conversationId}/read`,
      {
        method: "PATCH",
      },
    );
    if (!res.ok) {
      return { success: false };
    }
    this.invalidateCache("user_conversations");
    this.invalidateCache("user_unread_conversations_count");
    return await res.json();
  },

  async getKycStatus(token?: string): Promise<{
    success: boolean;
    accountType: "payernt" | "payrent";
    expectedDocumentType: "AADHAAR" | "PAN";
    status: "NOT_STARTED" | "PENDING" | "APPROVED" | "REJECTED";
    documentType: "AADHAAR" | "PAN" | null;
    maskedNumber: string | null;
    documentFileName: string | null;
    submittedAt: string | null;
    rejectionReason: string | null;
    allowResubmission: boolean;
    providerConfigured: boolean;
    providerStatus: string;
  }> {
    const res = await this.fetchWithAuth(`${API_BASE}/api/kyc/status`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to load KYC verification status."));
    }
    return await res.json();
  },

  async submitKyc(
    payload: {
      documentType: "AADHAAR" | "PAN";
      documentNumber: string;
      fileName: string;
      fileType: string;
      fileData: string;
      fileSize: number;
    },
    token?: string,
  ): Promise<{
    success: boolean;
    status: "PENDING" | "APPROVED" | "REJECTED";
    message: string;
    verificationId: string;
    maskedNumber: string;
    documentType: string;
    providerStatus: string;
  }> {
    const res = await this.fetchWithAuth(`${API_BASE}/api/kyc/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      throw new Error(parseApiError(data, "Failed to submit KYC verification."));
    }
    return data;
  },

  async getKycDocument(verificationId: string): Promise<{
    success: boolean;
    id: string;
    fileName: string;
    fileType: string;
    fileData: string;
    maskedNumber: string;
    status: string;
  }> {
    const res = await this.fetchWithAuth(`${API_BASE}/api/kyc/document/${verificationId}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to fetch identity document."));
    }
    return await res.json();
  },
};
