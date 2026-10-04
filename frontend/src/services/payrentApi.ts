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
      const token = storage.get<string | null>(STORAGE_KEYS.token, null);
      if (token) await api.logout(token);
    } catch {
      // Ignore
    } finally {
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
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) return null;
    return (await api.updateProfile(token, updates as any)) as User | null;
  },

  // ============================================================
  // PRODUCTS & EXPLORE
  // ============================================================
  async getProducts(): Promise<Product[]> {
    const prods = await api.getPublicProducts();
    return prods || [];
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
    const items = storage.get<CartItem[]>(STORAGE_KEYS.cart, []);
    const subtotal = items.reduce(
      (acc, item) => acc + (item.pricePerDay || item.daily_price || item.price || 0) * (item.days || 1) * (item.quantity || 1),
      0
    );
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + tax;
    return {
      items,
      count: items.length,
      subtotal,
      tax,
      total,
    };
  },

  async addToCart(productId: string, startDate?: string, endDate?: string): Promise<CartResponse> {
    const prod = await api.getProduct(productId);
    const currentItems = storage.get<CartItem[]>(STORAGE_KEYS.cart, []);
    const dailyPrice = Number(prod?.price || 0);
    const newItem: CartItem = {
      id: `cart_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      user_email: storage.get<{ email?: string } | null>(STORAGE_KEYS.currentUser, null)?.email || "guest",
      product_id: productId,
      productId,
      title: prod?.title || "Gear Item",
      productTitle: prod?.title || "Gear Item",
      price: dailyPrice,
      daily_price: dailyPrice,
      pricePerDay: dailyPrice,
      image: prod?.image || prod?.images?.[0] || "",
      productImage: prod?.image || prod?.images?.[0] || "",
      category: prod?.category || "Gear",
      city: prod?.city || "Bangalore",
      days: 1,
      quantity: 1,
      start_date: startDate || new Date().toISOString(),
      startDate: startDate || new Date().toISOString(),
      end_date: endDate || new Date(Date.now() + 86400000).toISOString(),
      endDate: endDate || new Date(Date.now() + 86400000).toISOString(),
      total_price: dailyPrice,
      is_available: true,
    };
    const updated = [...currentItems.filter((i) => (i.productId || i.product_id) !== productId), newItem];
    storage.set(STORAGE_KEYS.cart, updated);
    return await this.getCart();
  },

  async removeFromCart(productId: string): Promise<CartResponse> {
    const currentItems = storage.get<CartItem[]>(STORAGE_KEYS.cart, []);
    const updated = currentItems.filter((i) => (i.productId || i.product_id) !== productId);
    storage.set(STORAGE_KEYS.cart, updated);
    return await this.getCart();
  },

  async clearCart(): Promise<void> {
    storage.set(STORAGE_KEYS.cart, []);
  },

  // ============================================================
  // WISHLIST
  // ============================================================
  async getWishlist(): Promise<string[]> {
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) return storage.get<string[]>(STORAGE_KEYS.wishlist, []);
    return await api.getWishlist(token);
  },

  async addWishlist(productId: string): Promise<string[]> {
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) {
      const list = storage.get<string[]>(STORAGE_KEYS.wishlist, []);
      if (!list.includes(productId)) {
        const next = [...list, productId];
        storage.set(STORAGE_KEYS.wishlist, next);
        return next;
      }
      return list;
    }
    return await api.toggleWishlist(token, productId);
  },

  async removeWishlist(productId: string): Promise<string[]> {
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) {
      const list = storage.get<string[]>(STORAGE_KEYS.wishlist, []);
      const next = list.filter((id) => (id !== productId));
      storage.set(STORAGE_KEYS.wishlist, next);
      return next;
    }
    return await api.toggleWishlist(token, productId);
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
      const token = storage.get<string | null>(STORAGE_KEYS.token, null);
      if (!token) throw new Error("Authentication required");
      const order = await api.createOrder(token, {
        id: `ord_${Date.now()}`,
        productId: params.productId,
        productTitle: "Gear Rental",
        productImage: "",
        startDate: params.startDate,
        endDate: params.endDate,
        total: 0,
        status: "active",
        createdAt: new Date().toISOString(),
      });
      return { success: true, order };
    } catch (err: any) {
      return { success: false, error: err?.message || "Booking failed." };
    }
  },

  async getBookings(): Promise<Order[]> {
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) return storage.get<Order[]>(STORAGE_KEYS.orders, []);
    return await api.getOrders(token);
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
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) return [];
    return await api.getMessages(token);
  },

  async getMessages(conversationId: string): Promise<ConversationMessage[]> {
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) return [];
    const conv = await api.getConversation(token, conversationId);
    return conv?.messages || [];
  },

  async sendMessage(params: {
    receiverEmail: string;
    content: string;
    productId?: string;
    conversationId?: string;
  }): Promise<ConversationMessage> {
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) throw new Error("Authentication required");
    if (params.conversationId) {
      await api.sendRealtimeMessage(token, params.conversationId, params.content);
    }
    return {
      id: `msg_${Date.now()}`,
      sender: "me",
      senderType: "user",
      content: params.content,
      timestamp: new Date().toISOString(),
    };
  },

  // ============================================================
  // NOTIFICATIONS
  // ============================================================
  async getNotifications(): Promise<any[]> {
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) return [];
    return await api.getNotifications(token);
  },

  async markNotificationRead(id?: string): Promise<void> {
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) return;
    await api.markNotificationsRead(token);
  },
};

export default payrentApi;
