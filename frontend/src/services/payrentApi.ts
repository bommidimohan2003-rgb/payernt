import { api } from "@/utils/api";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import type {
  Product,
  Category,
  CartItem,
  CartResponse,
  Order,
  Conversation,
  ConversationMessage,
  User,
  RentalSecurity,
} from "@/types";

const getApiBase = () => {
  if (typeof window !== "undefined") {
    const win = window as unknown as { PAYENT_API_URL?: string };
    if (win.PAYENT_API_URL) return win.PAYENT_API_URL;
    const host = window.location.hostname;
    if (host === "10.0.2.2") return "http://10.0.2.2:8001";
    const isLocal = host === "localhost" || host === "127.0.0.1";
    if (isLocal) return "http://127.0.0.1:8001";
    if (host.endsWith(".vercel.app")) return "";
  }
  if (import.meta.env.VITE_API_URL) {
    const apiUrl = import.meta.env.VITE_API_URL;
    if (typeof window !== "undefined" && window.location.hostname === "10.0.2.2") {
      return apiUrl.replace(/localhost|127\.0\.0\.1/, "10.0.2.2");
    }
    return apiUrl;
  }
  if (import.meta.env.VITE_PAYERNT_API_URL) {
    const apiUrl = import.meta.env.VITE_PAYERNT_API_URL;
    if (typeof window !== "undefined" && window.location.hostname === "10.0.2.2") {
      return apiUrl.replace(/localhost|127\.0\.0\.1/, "10.0.2.2");
    }
    return apiUrl;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
};

const API_BASE = getApiBase();

/**
 * Centralized pay₹ent API Client for Renter / Customer Side.
 * Integrates directly with the existing FastAPI backend and datastore.
 */
export const payrentApi = {
  // ============================================================
  // AUTHENTICATION & PROFILE
  // ============================================================
  async login(email: string, password: string): Promise<{ success: boolean; token?: string; user?: User; error?: string }> {
    try {
      const res = await api.login(email, password);
      return res;
    } catch (err: any) {
      return { success: false, error: err?.message || "Invalid email or password." };
    }
  },

  async register(params: {
    fullName: string;
    email: string;
    panNumber: string;
    phone: string;
    address: string;
    pincode: string;
    password: string;
    city?: string;
  }): Promise<{ success: boolean; token?: string; user?: User; error?: string }> {
    try {
      const panUpper = params.panNumber.toUpperCase().trim();
      const res = await api.registerVerify(
        params.email,
        params.phone,
        "DIRECT",
        params.password,
        params.fullName,
        undefined,
        params.address,
        params.city || "India",
        params.pincode,
        undefined,
        panUpper,
      );
      return res;
    } catch (err: any) {
      return { success: false, error: err?.message || "Registration failed." };
    }
  },

  async checkRegistration(params: {
    name: string;
    mobile: string;
    email: string;
    targetAccountType?: string;
  }): Promise<{
    success: boolean;
    found: boolean;
    "paye₹ntExists"?: boolean;
    "pay₹entExists"?: boolean;
    payerntExists?: boolean;
    payrentExists?: boolean;
    targetAccountExists?: boolean;
    targetAccountType?: string;
    prefill?: {
      name: string;
      email: string;
      mobile: string;
      address: string;
      pincode: string;
      city?: string;
    };
    message?: string;
  }> {
    try {
      const response = await fetch(`${API_BASE}/api/auth/check-registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: params.name,
          mobile: params.mobile,
          email: params.email,
          targetAccountType: params.targetAccountType || "pay₹ent",
        }),
      });
      return await response.json();
    } catch {
      return {
        success: false,
        found: false,
        message: "Unable to check your details. Please try again.",
      };
    }
  },

  async checkCrossSideMobile(phone: string, targetAccountType: string = "pay₹ent"): Promise<{
    success: boolean;
    exists_same_side?: boolean;
    cross_side_eligible?: boolean;
    existing_account_type?: string;
    target_account_type?: string;
    message?: string;
  }> {
    try {
      const response = await fetch(`${API_BASE}/api/auth/cross-side/check-mobile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, targetAccountType }),
      });
      return await response.json();
    } catch {
      return { success: false, message: "Failed to verify mobile status." };
    }
  },

  async sendCrossSideOtp(phone: string, targetAccountType: string = "pay₹ent"): Promise<{
    success: boolean;
    token?: string;
    otp?: string;
    message?: string;
  }> {
    try {
      const response = await fetch(`${API_BASE}/api/auth/cross-side/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, targetAccountType }),
      });
      return await response.json();
    } catch {
      return { success: false, message: "Failed to dispatch verification code." };
    }
  },

  async verifyCrossSideOtp(token: string, otp: string): Promise<{
    success: boolean;
    verified?: boolean;
    verificationToken?: string;
    prefill?: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      pincode?: string;
    };
    requiredDocument?: string;
    message?: string;
  }> {
    try {
      const response = await fetch(`${API_BASE}/api/auth/cross-side/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, otp }),
      });
      return await response.json();
    } catch {
      return { success: false, message: "Verification failed." };
    }
  },

  async registerCrossSide(params: {
    verificationToken: string;
    targetAccountType: string;
    email: string;
    name?: string;
    address?: string;
    city?: string;
    pincode?: string;
    panNumber?: string;
    aadhaarNumber?: string;
    password: string;
    confirmPassword?: string;
  }): Promise<{ success: boolean; token?: string; user?: User; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/api/auth/cross-side/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, error: data.detail || data.message || "Registration failed." };
      }
      if (data.token) {
        storage.set(STORAGE_KEYS.token, data.token);
        if (data.user) {
          storage.set(STORAGE_KEYS.currentUser, data.user);
        }
      }
      return { success: true, token: data.token, user: data.user };
    } catch (err: any) {
      return { success: false, error: err?.message || "Registration failed." };
    }
  },

  async logout(): Promise<void> {
    try {
      await api.logout();
    } catch {
      storage.remove(STORAGE_KEYS.token);
      storage.remove(STORAGE_KEYS.currentUser);
    }
  },

  async getMe(token?: string): Promise<User | null> {
    const t = token || storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!t) return null;
    return await api.getMe(t);
  },

  async updateProfile(updates: Partial<User>): Promise<User | null> {
    return await api.updateProfile(updates as any);
  },

  // ============================================================
  // PRODUCTS & EXPLORE
  // ============================================================
  async getProducts(): Promise<Product[]> {
    return await api.getPublicProducts();
  },

  async getProduct(id: string): Promise<Product | null> {
    return await api.getProduct(id);
  },

  async getCategories(): Promise<Category[]> {
    return await api.getPublicCategories();
  },

  // ============================================================
  // CART
  // ============================================================
  async getCart(): Promise<CartResponse> {
    return await api.getCart();
  },

  async addToCart(productId: string, startDate?: string, endDate?: string): Promise<CartResponse> {
    return await api.addToCart(productId, startDate, endDate);
  },

  async removeFromCart(productId: string): Promise<CartResponse> {
    return await api.removeFromCart(productId);
  },

  async clearCart(): Promise<void> {
    return await api.clearCart();
  },

  // ============================================================
  // WISHLIST
  // ============================================================
  async getWishlist(): Promise<string[]> {
    return await api.getWishlist();
  },

  async addWishlist(productId: string): Promise<string[]> {
    return await api.toggleWishlist(productId);
  },

  async removeWishlist(productId: string): Promise<string[]> {
    return await api.toggleWishlist(productId);
  },

  // ============================================================
  // BOOKINGS & RENTAL SECURITY
  // ============================================================
  async createBooking(params: {
    productId: string;
    startDate: string;
    endDate: string;
    deliveryAddress?: string;
  }): Promise<{ success: boolean; booking?: any; order?: Order; error?: string }> {
    try {
      const order = await api.createOrder({
        productId: params.productId,
        startDate: params.startDate,
        endDate: params.endDate,
        deliveryAddress: params.deliveryAddress || "",
      });
      return { success: true, order };
    } catch (err: any) {
      return { success: false, error: err?.message || "Booking failed." };
    }
  },

  async getBookings(): Promise<Order[]> {
    return await api.getOrders();
  },

  async getBookingSecurity(bookingId: string): Promise<{ success: boolean; security?: RentalSecurity; error?: string }> {
    try {
      const token = storage.get<string | null>(STORAGE_KEYS.token, null);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/bookings/${bookingId}/security`, { headers });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to fetch security record." };
    }
  },

  async verifyRenterPin(bookingId: string, pin: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const token = storage.get<string | null>(STORAGE_KEYS.token, null);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/bookings/${bookingId}/security/renter-pin`, {
        method: "POST",
        headers,
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err?.message || "Renter PIN verification failed." };
    }
  },

  async verifyVendorPin(bookingId: string, pin: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const token = storage.get<string | null>(STORAGE_KEYS.token, null);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/bookings/${bookingId}/security/vendor-pin`, {
        method: "POST",
        headers,
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err?.message || "Vendor PIN verification failed." };
    }
  },

  async verifyOtp(bookingId: string, otp: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${bookingId}/security/otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err?.message || "OTP verification failed." };
    }
  },

  // ============================================================
  // MESSAGES & CONVERSATIONS
  // ============================================================
  async getConversations(): Promise<Conversation[]> {
    return await api.getConversations();
  },

  async getMessages(conversationId: string): Promise<ConversationMessage[]> {
    return await api.getMessages(conversationId);
  },

  async sendMessage(params: {
    receiverEmail: string;
    content: string;
    productId?: string;
    conversationId?: string;
  }): Promise<ConversationMessage> {
    return await api.sendMessage(params);
  },

  // ============================================================
  // NOTIFICATIONS
  // ============================================================
  async getNotifications(): Promise<any[]> {
    return await api.getNotifications();
  },

  async markNotificationRead(id: string): Promise<void> {
    return await api.markNotificationRead(id);
  },
};

export default payrentApi;
