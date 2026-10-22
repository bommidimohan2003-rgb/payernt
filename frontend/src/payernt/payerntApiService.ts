import type {
  PayerntAccount,
  PayerntProduct,
  UserWallet,
  WalletTransaction,
  BankAccount,
  LenderNotification,
} from "./types";
import { STORAGE_KEY_SESSION, STORAGE_KEY_ACCOUNT } from "./store";

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
  if (import.meta.env.VITE_PAYERNT_API_URL) {
    const apiUrl = import.meta.env.VITE_PAYERNT_API_URL;
    if (typeof window !== "undefined" && window.location.hostname === "10.0.2.2") {
      return apiUrl.replace(/localhost|127\.0\.0\.1/, "10.0.2.2");
    }
    return apiUrl;
  }
  if (import.meta.env.VITE_API_URL) {
    const apiUrl = import.meta.env.VITE_API_URL;
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

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  try {
    let token =
      localStorage.getItem("paye₹nt_token") ||
      localStorage.getItem("payernt_token");
    if (token) {
      token = token.trim();
      if (token.startsWith('"') && token.endsWith('"')) {
        token = token.slice(1, -1).trim();
      }
      headers["Authorization"] = `Bearer ${token}`;
    }
  } catch {}
  return headers;
}

export function handlePayerntUnauthorized() {
  try {
    localStorage.removeItem("paye₹nt_token");
    localStorage.removeItem("payernt_token");
    localStorage.removeItem("paye₹nt_refresh_token");
    localStorage.removeItem("payernt_refresh_token");
    localStorage.removeItem(STORAGE_KEY_SESSION);
    localStorage.removeItem(STORAGE_KEY_ACCOUNT);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("paye₹nt_auth_change", { detail: null }));
    }
  } catch {}
}

async function fetchWithPayerntAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const authHeaders = getAuthHeaders();
  const headers = {
    ...authHeaders,
    ...(options.headers as Record<string, string> || {}),
  };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    handlePayerntUnauthorized();
  }
  return res;
}

export function extractApiErrorMessage(data: any, fallback: string): string {
  if (!data) return fallback;
  if (typeof data === "string") return data.trim() || fallback;

  const detail = data.detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail.trim();
  }

  // Handle FastAPI / Pydantic validation errors (array of { loc, msg, type, ctx })
  if (Array.isArray(detail) && detail.length > 0) {
    const formatted = detail
      .map((item: any) => {
        if (!item) return null;
        if (typeof item === "string") return item;
        if (typeof item === "object") {
          const locParts = Array.isArray(item.loc)
            ? item.loc.filter((p: any) => p !== "body" && p !== "query" && p !== "path")
            : [];
          const field = locParts.join(".");
          const msg = item.msg || item.message || JSON.stringify(item);
          return field ? `${field}: ${msg}` : msg;
        }
        return String(item);
      })
      .filter(Boolean);
    if (formatted.length > 0) {
      return formatted.join("; ");
    }
  }

  if (detail && typeof detail === "object") {
    if (typeof detail.message === "string" && detail.message.trim()) return detail.message.trim();
    if (typeof detail.error === "string" && detail.error.trim()) return detail.error.trim();
    if (typeof detail.msg === "string" && detail.msg.trim()) return detail.msg.trim();
    if (typeof detail.rejectionReason === "string" && detail.rejectionReason.trim()) return detail.rejectionReason.trim();
  }

  if (typeof data.message === "string" && data.message.trim()) return data.message.trim();
  if (typeof data.error === "string" && data.error.trim()) return data.error.trim();

  return fallback;
}

export const payerntApi = {
  // ============================================================
  // AUTHENTICATION & CROSS-ACCOUNT VERIFICATION
  // ============================================================
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
      const res = await fetch(`${API_BASE}/api/payernt/auth/check-registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: params.name,
          mobile: params.mobile,
          email: params.email,
          targetAccountType: params.targetAccountType || "paye₹nt",
        }),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return {
        success: false,
        found: false,
        message: e?.message || "Unable to check registration details with server.",
      };
    }
  },

  async register(params: {
    name: string;
    email: string;
    aadhaarNumber: string;
    phoneNumber: string;
    address?: string;
    pincode?: string;
    password: string;
    confirmPassword?: string;
  }): Promise<{
    success: boolean;
    status?: string;
    accountType?: string;
    account?: PayerntAccount;
    token?: string;
    error?: string;
    message?: string;
  }> {
    try {
      const res = await fetch(`${API_BASE}/api/payernt/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        if (data.token) {
          localStorage.setItem("paye₹nt_token", data.token);
        }
        return {
          success: true,
          status: data.status || "PENDING_REVIEW",
          accountType: "Payernt",
          account: data.account,
          token: data.token,
          message: data.message,
        };
      }
      return {
        success: false,
        error: extractApiErrorMessage(data, "Registration failed. Please check your details."),
      };
    } catch (e: any) {
      return { success: false, error: e?.message || "Unable to connect to the server." };
    }
  },

  async login(params: {
    email: string;
    password: string;
  }): Promise<{
    success: boolean;
    status?: string;
    accountType?: string;
    rejectionReason?: string;
    account?: PayerntAccount;
    token?: string;
    error?: string;
  }> {
    try {
      const res = await fetch(`${API_BASE}/api/payernt/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: (params.email || "").trim().toLowerCase(),
          password: params.password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        // 1. Invalidate Payrent customer state (single active user-side session)
        try {
          localStorage.removeItem("payent:token");
          localStorage.removeItem("payent:currentUser");
          localStorage.removeItem("payent:refreshToken");
          localStorage.removeItem("pay₹ent_session");
          localStorage.removeItem("pay₹ent_account");
          localStorage.removeItem("payent_token");
          window.dispatchEvent(new CustomEvent("payent:storage_change"));
        } catch {}

        if (data.token) {
          localStorage.setItem("paye₹nt_token", data.token);
        }
        if (data.refreshToken) {
          localStorage.setItem("paye₹nt_refresh_token", data.refreshToken);
        }
        return { success: true, account: data.account, token: data.token };
      }
      if (res.status === 403) {
        const detail = typeof data?.detail === "object" && !Array.isArray(data?.detail) ? data.detail : {};
        return {
          success: false,
          status: detail.status || data.status || "PENDING_REVIEW",
          accountType: detail.accountType || data.accountType || "Payernt",
          rejectionReason: detail.rejectionReason || data.rejectionReason,
          error: extractApiErrorMessage(data, "Your Payernt account is currently under review."),
        };
      }
      return {
        success: false,
        error: extractApiErrorMessage(data, "Invalid email or password for Payernt account."),
      };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || "Unable to reach server. Please check your network connection.",
      };
    }
  },

  async resubmit(params: {
    name?: string;
    email: string;
    aadhaarNumber?: string;
    phoneNumber?: string;
    address?: string;
    pincode?: string;
  }): Promise<{ success: boolean; status?: string; message?: string; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/api/payernt/auth/resubmit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: params.name,
          email: params.email,
          aadhaarNumber: params.aadhaarNumber,
          phoneNumber: params.phoneNumber,
          address: params.address,
          pincode: params.pincode,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return { success: true, status: data.status || "PENDING_REVIEW", message: data.message };
      }
      return { success: false, error: extractApiErrorMessage(data, "Failed to resubmit details.") };
    } catch (e: any) {
      return { success: false, error: e?.message || "Unable to connect to the server." };
    }
  },

  async getStatus(email: string): Promise<{
    status: string;
    is_approved: boolean;
    accountType?: string;
    rejectionReason?: string;
  }> {
    try {
      const res = await fetch(`${API_BASE}/api/auth/status?email=${encodeURIComponent(email)}&type=payernt`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Payernt status fetch error:", e);
    }
    return { status: "PENDING_REVIEW", is_approved: false, accountType: "Payernt" };
  },

  async logout(): Promise<{ success: boolean }> {
    try {
      localStorage.removeItem("paye₹nt_token");
      localStorage.removeItem("payernt_token");
      localStorage.removeItem("paye₹nt_refresh_token");
      localStorage.removeItem("payernt_refresh_token");
      localStorage.removeItem(STORAGE_KEY_SESSION);
      localStorage.removeItem(STORAGE_KEY_ACCOUNT);
      await fetchWithPayerntAuth(`${API_BASE}/api/payernt/auth/logout`, {
        method: "POST",
      }).catch(() => {});
    } catch {}
    return { success: true };
  },

  async getProfile(): Promise<{ success: boolean; profile?: any; error?: string }> {
    try {
      const res = await fetchWithPayerntAuth(`${API_BASE}/api/payernt/profile`);
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, profile: data.profile };
      }
      return { success: false, error: extractApiErrorMessage(data, "Failed to load profile.") };
    } catch (e: any) {
      return { success: false, error: e?.message || "Failed to fetch profile." };
    }
  },

  async updateProfile(updates: any): Promise<{ success: boolean; profile?: any; error?: string }> {
    try {
      const res = await fetchWithPayerntAuth(`${API_BASE}/api/payernt/profile`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, profile: data.profile };
      }
      return { success: false, error: extractApiErrorMessage(data, "Failed to update profile.") };
    } catch (e: any) {
      return { success: false, error: e?.message || "Network error while updating profile." };
    }
  },

  // ============================================================
  // PRODUCTS
  // ============================================================
  async createProduct(productData: Partial<PayerntProduct>): Promise<{
    success: boolean;
    product?: PayerntProduct;
    productId?: string;
    status?: string;
    vendorSecretPin?: string;
    maskedPhone?: string;
    otpExpiresIn?: number;
    resendCooldown?: number;
    message?: string;
    error?: string;
  }> {
    try {
      const res = await fetchWithPayerntAuth(`${API_BASE}/api/payernt/products`, {
        method: "POST",
        body: JSON.stringify(productData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          product: data.product,
          productId: data.productId || data.product?.id,
          status: data.status || data.product?.status || "under_review",
          vendorSecretPin: data.vendorSecretPin || data.product?.vendor_secret_pin,
          maskedPhone: data.maskedPhone,
          otpExpiresIn: data.otpExpiresIn || 300,
          resendCooldown: data.resendCooldown || 60,
          message: data.message,
        };
      }
      return {
        success: false,
        error: extractApiErrorMessage(data, "Failed to submit product listing to database."),
      };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || "Network error while submitting product.",
      };
    }
  },

  async getProducts(): Promise<{ success: boolean; products?: PayerntProduct[]; error?: string }> {
    try {
      const res = await fetchWithPayerntAuth(`${API_BASE}/api/payernt/products`);
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, products: data.products };
      }
      return { success: false, error: extractApiErrorMessage(data, "Failed to fetch products.") };
    } catch (e: any) {
      return { success: false, error: e?.message || "Network error." };
    }
  },

  async getProductById(id: string): Promise<{ success: boolean; product?: PayerntProduct; error?: string }> {
    try {
      const res = await fetchWithPayerntAuth(`${API_BASE}/api/payernt/products/${id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, product: data.product };
      }
      return { success: false, error: extractApiErrorMessage(data, "Product not found.") };
    } catch (e: any) {
      return { success: false, error: e?.message || "Network error." };
    }
  },

  async updateProduct(id: string, updates: Partial<PayerntProduct>): Promise<{ success: boolean; product?: PayerntProduct; error?: string }> {
    try {
      const res = await fetchWithPayerntAuth(`${API_BASE}/api/payernt/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, product: data.product };
      }
      return { success: false, error: extractApiErrorMessage(data, "Failed to update product.") };
    } catch (e: any) {
      return { success: false, error: e?.message || "Network error." };
    }
  },

  async deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetchWithPayerntAuth(`${API_BASE}/api/payernt/products/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true };
      }
      return { success: false, error: extractApiErrorMessage(data, "Failed to delete product.") };
    } catch (e: any) {
      return { success: false, error: e?.message || "Network error." };
    }
  },

  async updateProductStatus(id: string, status: string, availabilityStatus?: string): Promise<{ success: boolean; product?: PayerntProduct; error?: string }> {
    try {
      const res = await fetchWithPayerntAuth(`${API_BASE}/api/payernt/products/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, availability_status: availabilityStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, product: data.product };
      }
      return { success: false, error: extractApiErrorMessage(data, "Failed to update product status.") };
    } catch (e: any) {
      return { success: false, error: e?.message || "Network error." };
    }
  },

  // ============================================================
  // WALLET & TRANSACTIONS & BANK ACCOUNTS
  // ============================================================
  async getWallet(): Promise<{
    success: boolean;
    wallet?: UserWallet;
    transactions?: WalletTransaction[];
    bankAccounts?: BankAccount[];
    error?: string;
  }> {
    try {
      const res = await fetchWithPayerntAuth(`${API_BASE}/api/payernt/wallet`);
      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          wallet: data.wallet,
          transactions: data.transactions,
          bankAccounts: data.bankAccounts,
        };
      }
      return { success: false, error: extractApiErrorMessage(data, "Failed to load wallet.") };
    } catch (e: any) {
      return { success: false, error: e?.message || "Network error." };
    }
  },

  async getTransactions(): Promise<{ success: boolean; transactions?: WalletTransaction[]; error?: string }> {
    try {
      const res = await fetchWithPayerntAuth(`${API_BASE}/api/payernt/wallet/transactions`);
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, transactions: data.transactions };
      }
      return { success: false, error: extractApiErrorMessage(data, "Failed to load transactions.") };
    } catch (e: any) {
      return { success: false, error: e?.message || "Network error." };
    }
  },

  async withdraw(
    amountOrParams: number | { amount: number; bankAccountId: string },
    optionalBankAccountId?: string
  ): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    const payload =
      typeof amountOrParams === "number"
        ? { amount: amountOrParams, bankAccountId: optionalBankAccountId || "" }
        : amountOrParams;

    try {
      const res = await fetchWithPayerntAuth(`${API_BASE}/api/payernt/wallet/withdraw`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, message: data.message };
      }
      return { success: false, error: extractApiErrorMessage(data, "Withdrawal failed.") };
    } catch (e: any) {
      return { success: false, error: e?.message || "Network error during withdrawal." };
    }
  },

  async addBankAccount(bankData: {
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    confirmAccountNumber?: string;
    ifsc: string;
  }): Promise<{ success: boolean; bankAccount?: any; error?: string }> {
    try {
      const res = await fetchWithPayerntAuth(`${API_BASE}/api/payernt/wallet/bank-accounts`, {
        method: "POST",
        body: JSON.stringify(bankData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, bankAccount: data.bankAccount };
      }
      return { success: false, error: extractApiErrorMessage(data, "Failed to add bank account.") };
    } catch (e: any) {
      return { success: false, error: e?.message || "Network error." };
    }
  },

  async deleteBankAccount(bankId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetchWithPayerntAuth(`${API_BASE}/api/payernt/wallet/bank-accounts/${bankId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true };
      }
      return { success: false, error: extractApiErrorMessage(data, "Failed to delete bank account.") };
    } catch (e: any) {
      return { success: false, error: e?.message || "Network error." };
    }
  },

  // ============================================================
  // NOTIFICATIONS
  // ============================================================
  async getNotifications(): Promise<{ success: boolean; notifications?: LenderNotification[]; error?: string }> {
    try {
      const res = await fetchWithPayerntAuth(`${API_BASE}/api/payernt/notifications`);
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, notifications: data.notifications };
      }
      return { success: false, error: extractApiErrorMessage(data, "Failed to load notifications.") };
    } catch (e: any) {
      return { success: false, error: e?.message || "Network error." };
    }
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    try {
      await fetchWithPayerntAuth(`${API_BASE}/api/payernt/notifications/${id}/read`, {
        method: "PATCH",
      });
    } catch {}
    return { success: true };
  },

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    try {
      await fetchWithPayerntAuth(`${API_BASE}/api/payernt/notifications/read-all`, {
        method: "POST",
      });
    } catch {}
    return { success: true };
  },

  // ============================================================
  // MESSAGES (ADMIN / PRODUCT BASED)
  // ============================================================
  async getMessages(productId?: string): Promise<{ success: boolean; messages?: any[]; unreadCount?: number; error?: string }> {
    try {
      const url = productId
        ? `${API_BASE}/api/payernt/messages?product_id=${encodeURIComponent(productId)}`
        : `${API_BASE}/api/payernt/messages`;
      const res = await fetchWithPayerntAuth(url);
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, messages: data.messages, unreadCount: data.unreadCount ?? 0 };
      }
      return { success: false, messages: [], unreadCount: 0, error: extractApiErrorMessage(data, "Failed to load messages.") };
    } catch (e: any) {
      return { success: false, messages: [], unreadCount: 0, error: e?.message || "Network error." };
    }
  },

  async getUnreadMessagesCount(): Promise<{ success: boolean; unreadCount: number }> {
    try {
      const res = await fetchWithPayerntAuth(`${API_BASE}/api/payernt/messages/unread-count`);
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, unreadCount: data.unreadCount ?? 0 };
      }
    } catch {}
    return { success: false, unreadCount: 0 };
  },

  async markMessageRead(messageId: string): Promise<{ success: boolean; unreadCount?: number; error?: string }> {
    try {
      const res = await fetchWithPayerntAuth(`${API_BASE}/api/payernt/messages/${encodeURIComponent(messageId)}/read`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, unreadCount: data.unreadCount };
      }
    } catch {}
    return { success: false };
  },

  async sendMessage(params: {
    productId: string;
    receiverId: string;
    content: string;
  }): Promise<{ success: boolean; message?: any; error?: string }> {
    try {
      const res = await fetchWithPayerntAuth(`${API_BASE}/api/payernt/messages`, {
        method: "POST",
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, message: data.message };
      }
      return { success: false, error: extractApiErrorMessage(data, "Failed to send message.") };
    } catch (e: any) {
      return { success: false, error: e?.message || "Network error." };
    }
  },

  async sendAdminMessage(params: {
    recipientAccountId: string;
    productId?: string;
    title: string;
    content: string;
    messageType?: string;
    senderAdminId?: string;
    senderName?: string;
    productName?: string;
    productCategory?: string;
  }): Promise<{ success: boolean; message?: any; error?: string }> {
    try {
      const res = await fetchWithPayerntAuth(`${API_BASE}/api/payernt/messages/admin-send`, {
        method: "POST",
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, message: data.message };
      }
      return { success: false, error: extractApiErrorMessage(data, "Failed to send admin message.") };
    } catch (e: any) {
      return { success: false, error: e?.message || "Network error." };
    }
  },

  // ============================================================
  // AUTHORITATIVE DASHBOARD, BOOKINGS & EARNINGS APIS
  // ============================================================
  async getDashboard(): Promise<{
    success: boolean;
    dashboard?: any;
    wallet?: any;
    earnings?: any;
    listings?: any;
    rentals?: any;
    bookings?: any[];
    products?: any[];
    recentActivity?: any[];
    notifications?: any;
    messages?: any;
    error?: string;
  }> {
    try {
      const res = await fetchWithPayerntAuth(`${API_BASE}/api/payernt/dashboard`);
      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          dashboard: data.dashboard,
          wallet: data.wallet,
          earnings: data.earnings,
          listings: data.listings,
          rentals: data.rentals,
          bookings: data.bookings ?? [],
          products: data.products ?? [],
          recentActivity: data.recentActivity ?? [],
          notifications: data.notifications,
          messages: data.messages,
        };
      }
      return {
        success: false,
        error: extractApiErrorMessage(data, "Failed to load dashboard data."),
      };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || "Unable to connect to dashboard API.",
      };
    }
  },

  async getBookings(limit: number = 50): Promise<{
    success: boolean;
    bookings?: any[];
    total?: number;
    error?: string;
  }> {
    try {
      const res = await fetchWithPayerntAuth(`${API_BASE}/api/payernt/bookings?limit=${limit}`);
      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          bookings: data.bookings ?? [],
          total: data.total ?? (data.bookings ?? []).length,
        };
      }
      return {
        success: false,
        bookings: [],
        total: 0,
        error: extractApiErrorMessage(data, "Failed to load bookings."),
      };
    } catch (e: any) {
      return {
        success: false,
        bookings: [],
        total: 0,
        error: e?.message || "Network error loading bookings.",
      };
    }
  },

  async cancelBooking(
    bookingId: string,
    reasonCode: string,
    feedback?: string
  ): Promise<{
    success: boolean;
    message?: string;
    booking?: any;
    cancellation?: any;
    error?: string;
  }> {
    try {
      const res = await fetchWithPayerntAuth(`${API_BASE}/api/payernt/bookings/${bookingId}/cancel`, {
        method: "POST",
        body: JSON.stringify({
          reasonCode,
          feedback: feedback?.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          message: data.message || "Booking cancelled successfully.",
          booking: data.booking,
          cancellation: data.cancellation,
        };
      }
      return {
        success: false,
        error: extractApiErrorMessage(data, "Failed to cancel booking."),
      };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || "Network error while cancelling booking.",
      };
    }
  },

  async getProductAvailabilityConfig(productId: string): Promise<{
    success: boolean;
    config?: {
      productId: string;
      allowHalfDay: boolean;
      morningSlotEnabled: boolean;
      afternoonSlotEnabled: boolean;
      fullDaySlotEnabled: boolean;
      halfDayRate: number;
      dailyRate: number;
      bufferMinutes: number;
      blockedDates: string[];
    };
    error?: string;
  }> {
    try {
      const res = await fetchWithPayerntAuth(`${API_BASE}/api/payernt/products/${productId}/availability-config`);
      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          config: data,
        };
      }
      return {
        success: false,
        error: extractApiErrorMessage(data, "Failed to load availability config."),
      };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || "Network error loading availability config.",
      };
    }
  },

  async updateProductAvailabilityConfig(
    productId: string,
    config: {
      allowHalfDay?: boolean;
      morningSlotEnabled?: boolean;
      afternoonSlotEnabled?: boolean;
      fullDaySlotEnabled?: boolean;
      halfDayRate?: number;
      bufferMinutes?: number;
      blockedDates?: string[];
    }
  ): Promise<{
    success: boolean;
    config?: any;
    message?: string;
    error?: string;
  }> {
    try {
      const res = await fetchWithPayerntAuth(`${API_BASE}/api/payernt/products/${productId}/availability-config`, {
        method: "POST",
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          config: data.config,
          message: data.message || "Availability configuration updated.",
        };
      }
      return {
        success: false,
        error: extractApiErrorMessage(data, "Failed to update availability config."),
      };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || "Network error updating availability config.",
      };
    }
  },

  async getEarningsSummary(): Promise<{
    success: boolean;
    total?: number;
    availableBalance?: number;
    pendingAmount?: number;
    totalWithdrawn?: number;
    currency?: string;
    error?: string;
  }> {
    try {
      const res = await fetchWithPayerntAuth(`${API_BASE}/api/payernt/earnings/summary`);
      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          total: data.total ?? 0,
          availableBalance: data.availableBalance ?? 0,
          pendingAmount: data.pendingAmount ?? 0,
          totalWithdrawn: data.totalWithdrawn ?? 0,
          currency: data.currency ?? "INR",
        };
      }
      return {
        success: false,
        error: extractApiErrorMessage(data, "Failed to load earnings summary."),
      };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || "Network error loading earnings summary.",
      };
    }
  },

  async prepareProductForDelivery(bookingId: string): Promise<{
    success: boolean;
    bookingId?: string;
    deliveryStatus?: string;
    vendorSecretPin?: string;
    message?: string;
    error?: string;
  }> {
    try {
      const res = await fetchWithPayerntAuth(`${API_BASE}/api/payernt/bookings/${encodeURIComponent(bookingId)}/prepare`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          bookingId: data.bookingId,
          deliveryStatus: data.deliveryStatus,
          vendorSecretPin: data.vendorSecretPin,
          message: data.message,
        };
      }
      return {
        success: false,
        error: extractApiErrorMessage(data, "Failed to prepare product for delivery."),
      };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || "Network error while preparing product for delivery.",
      };
    }
  },

  async sendVendorHandoverOtp(bookingId: string): Promise<{
    success: boolean;
    message?: string;
    targetPhoneMasked?: string;
    expiresInSeconds?: number;
    error?: string;
  }> {
    try {
      const res = await fetchWithPayerntAuth(`${API_BASE}/api/deliveries/${encodeURIComponent(bookingId)}/vendor-otp/send`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          message: data.message,
          targetPhoneMasked: data.targetPhoneMasked,
          expiresInSeconds: data.expiresInSeconds,
        };
      }
      return {
        success: false,
        error: extractApiErrorMessage(data, "Failed to send vendor handover OTP."),
      };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || "Network error while sending vendor handover OTP.",
      };
    }
  },

  async verifyVendorHandoverOtp(bookingId: string, otp: string): Promise<{
    success: boolean;
    deliveryStatus?: string;
    message?: string;
    error?: string;
  }> {
    try {
      const res = await fetchWithPayerntAuth(`${API_BASE}/api/deliveries/${encodeURIComponent(bookingId)}/vendor-otp/verify`, {
        method: "POST",
        body: JSON.stringify({ otp }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          deliveryStatus: data.deliveryStatus,
          message: data.message,
        };
      }
      return {
        success: false,
        error: extractApiErrorMessage(data, "Failed to verify vendor handover OTP."),
      };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || "Network error while verifying vendor handover OTP.",
      };
    }
  },
};

export default payerntApi;

