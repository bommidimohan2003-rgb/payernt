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
      localStorage.getItem("payernt_token") ||
      localStorage.getItem("payent_token") ||
      localStorage.getItem("payent:token");
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
    address: string;
    pincode: string;
    password: string;
    confirmPassword?: string;
  }): Promise<{ success: boolean; account?: PayerntAccount; token?: string; error?: string }> {
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
        return { success: true, account: data.account, token: data.token };
      }
      return {
        success: false,
        error: data.detail || data.message || "Registration failed. Please check your details.",
      };
    } catch (e: any) {
      return { success: false, error: e?.message || "Unable to connect to the server." };
    }
  },

  async login(params: {
    email: string;
    password: string;
  }): Promise<{ success: boolean; account?: PayerntAccount; token?: string; error?: string }> {
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
        if (data.token) {
          localStorage.setItem("paye₹nt_token", data.token);
        }
        return { success: true, account: data.account, token: data.token };
      }
      return {
        success: false,
        error: data.detail || data.message || "Invalid credentials for paye₹nt account.",
      };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || "Unable to reach server. Please check your network connection.",
      };
    }
  },

  async logout(): Promise<{ success: boolean }> {
    try {
      localStorage.removeItem("paye₹nt_token");
      await fetch(`${API_BASE}/api/payernt/auth/logout`, {
        method: "POST",
        headers: getAuthHeaders(),
      }).catch(() => {});
    } catch {}
    return { success: true };
  },

  async getProfile(): Promise<{ success: boolean; profile?: any; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/api/payernt/profile`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, profile: data.profile };
      }
      return { success: false, error: data.detail || "Failed to load profile." };
    } catch (e: any) {
      return { success: false, error: e?.message || "Failed to fetch profile." };
    }
  },

  async updateProfile(updates: any): Promise<{ success: boolean; profile?: any; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/api/payernt/profile`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, profile: data.profile };
      }
      return { success: false, error: data.detail || "Failed to update profile." };
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
      const res = await fetch(`${API_BASE}/api/payernt/products`, {
        method: "POST",
        headers: getAuthHeaders(),
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
        error: data.detail || data.message || "Failed to submit product listing to database.",
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
      const res = await fetch(`${API_BASE}/api/payernt/products`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, products: data.products };
      }
      return { success: false, error: data.detail || "Failed to fetch products." };
    } catch (e: any) {
      return { success: false, error: e?.message || "Network error." };
    }
  },

  async getProductById(id: string): Promise<{ success: boolean; product?: PayerntProduct; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/api/payernt/products/${id}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, product: data.product };
      }
      return { success: false, error: data.detail || "Product not found." };
    } catch (e: any) {
      return { success: false, error: e?.message || "Network error." };
    }
  },

  async updateProduct(id: string, updates: Partial<PayerntProduct>): Promise<{ success: boolean; product?: PayerntProduct; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/api/payernt/products/${id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, product: data.product };
      }
      return { success: false, error: data.detail || "Failed to update product." };
    } catch (e: any) {
      return { success: false, error: e?.message || "Network error." };
    }
  },

  async deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/api/payernt/products/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true };
      }
      return { success: false, error: data.detail || "Failed to delete product." };
    } catch (e: any) {
      return { success: false, error: e?.message || "Network error." };
    }
  },

  async updateProductStatus(id: string, status: string, availabilityStatus?: string): Promise<{ success: boolean; product?: PayerntProduct; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/api/payernt/products/${id}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, availability_status: availabilityStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, product: data.product };
      }
      return { success: false, error: data.detail || "Failed to update product status." };
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
      const res = await fetch(`${API_BASE}/api/payernt/wallet`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          wallet: data.wallet,
          transactions: data.transactions,
          bankAccounts: data.bankAccounts,
        };
      }
      return { success: false, error: data.detail || "Failed to load wallet." };
    } catch (e: any) {
      return { success: false, error: e?.message || "Network error." };
    }
  },

  async getTransactions(): Promise<{ success: boolean; transactions?: WalletTransaction[]; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/api/payernt/wallet/transactions`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, transactions: data.transactions };
      }
      return { success: false, error: data.detail || "Failed to load transactions." };
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
      const res = await fetch(`${API_BASE}/api/payernt/wallet/withdraw`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, message: data.message };
      }
      return { success: false, error: data.detail || "Withdrawal failed." };
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
      const res = await fetch(`${API_BASE}/api/payernt/wallet/bank-accounts`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(bankData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, bankAccount: data.bankAccount };
      }
      return { success: false, error: data.detail || "Failed to add bank account." };
    } catch (e: any) {
      return { success: false, error: e?.message || "Network error." };
    }
  },

  async deleteBankAccount(bankId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/api/payernt/wallet/bank-accounts/${bankId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true };
      }
      return { success: false, error: data.detail || "Failed to delete bank account." };
    } catch (e: any) {
      return { success: false, error: e?.message || "Network error." };
    }
  },

  // ============================================================
  // NOTIFICATIONS
  // ============================================================
  async getNotifications(): Promise<{ success: boolean; notifications?: LenderNotification[]; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/api/payernt/notifications`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, notifications: data.notifications };
      }
      return { success: false, error: data.detail || "Failed to load notifications." };
    } catch (e: any) {
      return { success: false, error: e?.message || "Network error." };
    }
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    try {
      await fetch(`${API_BASE}/api/payernt/notifications/${id}/read`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });
    } catch {}
    return { success: true };
  },

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    try {
      await fetch(`${API_BASE}/api/payernt/notifications/read-all`, {
        method: "POST",
        headers: getAuthHeaders(),
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
      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, messages: data.messages, unreadCount: data.unreadCount ?? 0 };
      }
      return { success: false, messages: [], unreadCount: 0, error: data.detail || "Failed to load messages." };
    } catch (e: any) {
      return { success: false, messages: [], unreadCount: 0, error: e?.message || "Network error." };
    }
  },

  async getUnreadMessagesCount(): Promise<{ success: boolean; unreadCount: number }> {
    try {
      const res = await fetch(`${API_BASE}/api/payernt/messages/unread-count`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, unreadCount: data.unreadCount ?? 0 };
      }
    } catch {}
    return { success: false, unreadCount: 0 };
  },

  async markMessageRead(messageId: string): Promise<{ success: boolean; unreadCount?: number; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/api/payernt/messages/${encodeURIComponent(messageId)}/read`, {
        method: "PATCH",
        headers: getAuthHeaders(),
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
      const res = await fetch(`${API_BASE}/api/payernt/messages`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, message: data.message };
      }
      return { success: false, error: data.detail || "Failed to send message." };
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
      const res = await fetch(`${API_BASE}/api/payernt/messages/admin-send`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, message: data.message };
      }
      return { success: false, error: data.detail || "Failed to send admin message." };
    } catch (e: any) {
      return { success: false, error: e?.message || "Network error." };
    }
  },
};

export default payerntApi;
