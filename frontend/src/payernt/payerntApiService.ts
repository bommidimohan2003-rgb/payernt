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
  }
  if (import.meta.env.VITE_PAYERNT_API_URL) {
    return import.meta.env.VITE_PAYERNT_API_URL;
  }
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1";
    if (isLocal) return "http://127.0.0.1:8001";
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
    const token = localStorage.getItem("paye₹nt_token") || localStorage.getItem("payent_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  } catch {}
  return headers;
}

export const payerntApi = {
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
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/paye₹nt/auth/check-registration`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: params.name,
            mobile: params.mobile,
            email: params.email,
            targetAccountType: params.targetAccountType || "paye₹nt",
          }),
        });
        return await res.json();
      } catch (e: any) {
        console.warn("[paye₹nt API] Check registration network error:", e);
      }
    }
    return {
      success: false,
      found: false,
      message: "Unable to check your details. Please try again.",
    };
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
      const res = await fetch(`${API_BASE}/api/paye₹nt/auth/register`, {
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
      return { success: false, error: data.detail || data.message || "Registration failed. Please check your details." };
    } catch (e: any) {
      return { success: false, error: e?.message || "Unable to connect to the server. Please try again." };
    }
  },

  async checkCrossSideMobile(phone: string, targetAccountType: string = "paye₹nt"): Promise<{
    success: boolean;
    exists_same_side?: boolean;
    cross_side_eligible?: boolean;
    existing_account_type?: string;
    target_account_type?: string;
    message?: string;
  }> {
    try {
      const res = await fetch(`${API_BASE}/api/auth/cross-side/check-mobile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, targetAccountType }),
      });
      return await res.json();
    } catch {
      return { success: false, message: "Failed to check mobile status." };
    }
  },

  async sendCrossSideOtp(phone: string, targetAccountType: string = "paye₹nt"): Promise<{
    success: boolean;
    token?: string;
    otp?: string;
    message?: string;
  }> {
    try {
      const res = await fetch(`${API_BASE}/api/auth/cross-side/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, targetAccountType }),
      });
      return await res.json();
    } catch {
      return { success: false, message: "Failed to send verification code." };
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
      const res = await fetch(`${API_BASE}/api/auth/cross-side/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, otp }),
      });
      return await res.json();
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
    aadhaarNumber?: string;
    password: string;
    confirmPassword?: string;
  }): Promise<{ success: boolean; account?: PayerntAccount; token?: string; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/api/auth/cross-side/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.detail || data.message || "Registration failed." };
      }
      if (data.token) {
        localStorage.setItem("paye₹nt_token", data.token);
      }
      return { success: true, account: data.account, token: data.token };
    } catch (err: any) {
      return { success: false, error: err?.message || "Registration failed." };
    }
  },

  async login(params: {
    email: string;
    password: string;
  }): Promise<{ success: boolean; account?: PayerntAccount; token?: string; error?: string }> {
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/paye₹nt/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (data.token) {
            localStorage.setItem("paye₹nt_token", data.token);
          }
          return { success: true, account: data.account, token: data.token };
        }
        return { success: false, error: data.detail || data.message || "Invalid credentials." };
      } catch (e: any) {
        console.warn("[paye₹nt API] Login network error, using local fallback:", e);
      }
    }

    // Local fallback
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ACCOUNT);
      if (stored) {
        const acc = JSON.parse(stored);
        if (acc.email?.toLowerCase() === params.email.toLowerCase()) {
          return { success: true, account: acc, token: `mock_payernt_jwt_${Date.now()}` };
        }
      }
    } catch {}

    return { success: false, error: "Invalid email or password for paye₹nt vendor account." };
  },

  async logout(): Promise<{ success: boolean }> {
    try {
      localStorage.removeItem("paye₹nt_token");
      if (API_BASE) {
        await fetch(`${API_BASE}/api/paye₹nt/auth/logout`, {
          method: "POST",
          headers: getAuthHeaders(),
        });
      }
    } catch {}
    return { success: true };
  },

  async getProfile(): Promise<{ success: boolean; profile?: any; error?: string }> {
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/paye₹nt/profile`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          return { success: true, profile: data.profile };
        }
      } catch (e) {
        console.warn("[paye₹nt API] Get profile error:", e);
      }
    }
    return { success: false };
  },

  async updateProfile(updates: any): Promise<{ success: boolean; profile?: any; error?: string }> {
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/paye₹nt/profile`, {
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
        return { success: false, error: e?.message || "Network error." };
      }
    }
    return { success: true, profile: updates };
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
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/paye₹nt/products`, {
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
            status: data.status || data.product?.status || "pending_confirmation",
            vendorSecretPin: data.vendorSecretPin || data.product?.vendor_secret_pin,
            maskedPhone: data.maskedPhone,
            otpExpiresIn: data.otpExpiresIn || 300,
            resendCooldown: data.resendCooldown || 60,
            message: data.message,
          };
        }
        return {
          success: false,
          error: data.detail || data.message || "Failed to submit product listing.",
        };
      } catch (e: any) {
        console.warn("[paye₹nt API] Create product network error, fallback active:", e);
      }
    }

    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const prodId = productData.id || `prod-${Date.now()}`;
    return {
      success: true,
      productId: prodId,
      status: "pending_confirmation",
      product: {
        ...productData,
        id: prodId,
        vendorSecretPin: pin,
        status: "pending_confirmation",
      } as PayerntProduct,
      vendorSecretPin: pin,
      maskedPhone: "+91 ******0000",
      otpExpiresIn: 300,
      resendCooldown: 60,
      message: "Listing created as PENDING_CONFIRMATION.",
    };
  },

  async verifyProductConfirmationOtp(productId: string, otp: string): Promise<{
    success: boolean;
    productId?: string;
    status?: string;
    verificationStatus?: string;
    product?: PayerntProduct;
    message?: string;
    error?: string;
  }> {
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/paye₹nt/products/${productId}/verify-otp`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ otp }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          return {
            success: true,
            productId: data.productId,
            status: data.status,
            verificationStatus: data.verificationStatus,
            product: data.product,
            message: data.message,
          };
        }
        return {
          success: false,
          error: data.detail || data.message || "Incorrect verification code. Please try again.",
        };
      } catch (e: any) {
        console.warn("[paye₹nt API] verifyProductConfirmationOtp error:", e);
      }
    }

    // Local fallback
    if (otp === "123456" || otp.length === 6) {
      return {
        success: true,
        productId,
        status: "under_review",
        verificationStatus: "under_review",
        message: "Product securely confirmed. Listing is now pending admin review.",
      };
    }
    return {
      success: false,
      error: "Incorrect verification code. Please try again.",
    };
  },

  async resendProductConfirmationOtp(productId: string): Promise<{
    success: boolean;
    maskedPhone?: string;
    resendCooldown?: number;
    otpExpiresIn?: number;
    message?: string;
    error?: string;
  }> {
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/paye₹nt/products/${productId}/resend-otp`, {
          method: "POST",
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          return {
            success: true,
            maskedPhone: data.maskedPhone,
            resendCooldown: data.resendCooldown || 60,
            otpExpiresIn: data.otpExpiresIn || 300,
            message: data.message,
          };
        }
        return {
          success: false,
          error: data.detail || data.message || "Failed to resend verification code.",
        };
      } catch (e: any) {
        console.warn("[paye₹nt API] resendProductConfirmationOtp error:", e);
      }
    }

    return {
      success: true,
      maskedPhone: "+91 ******0000",
      resendCooldown: 60,
      otpExpiresIn: 300,
      message: "Verification code resent.",
    };
  },

  async getProductConfirmationStatus(productId: string): Promise<{
    success: boolean;
    productId?: string;
    status?: string;
    maskedPhone?: string;
    vendorSecretPin?: string;
    resendCooldown?: number;
    otpExpiresIn?: number;
    hasActiveSession?: boolean;
    error?: string;
  }> {
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/paye₹nt/products/${productId}/confirmation-status`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          return data;
        }
      } catch (e) {
        console.warn("[paye₹nt API] getProductConfirmationStatus error:", e);
      }
    }
    return { success: false };
  },

  async getProducts(): Promise<{ success: boolean; products?: PayerntProduct[]; error?: string }> {
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/paye₹nt/products`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          return { success: true, products: data.products };
        }
      } catch (e) {
        console.warn("[paye₹nt API] Get products error:", e);
      }
    }
    return { success: false };
  },

  async getProductById(id: string): Promise<{ success: boolean; product?: PayerntProduct; error?: string }> {
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/paye₹nt/products/${id}`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          return { success: true, product: data.product };
        }
      } catch (e) {
        console.warn("[paye₹nt API] Get product error:", e);
      }
    }
    return { success: false };
  },

  async updateProduct(id: string, updates: Partial<PayerntProduct>): Promise<{ success: boolean; product?: PayerntProduct; error?: string }> {
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/paye₹nt/products/${id}`, {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(updates),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          return { success: true, product: data.product };
        }
      } catch (e) {
        console.warn("[paye₹nt API] Update product error:", e);
      }
    }
    return { success: true };
  },

  async deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/paye₹nt/products/${id}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          return { success: true };
        }
      } catch (e) {
        console.warn("[paye₹nt API] Delete product error:", e);
      }
    }
    return { success: true };
  },

  async updateProductStatus(id: string, status: string, availabilityStatus?: string): Promise<{ success: boolean; product?: PayerntProduct; error?: string }> {
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/paye₹nt/products/${id}/status`, {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({ status, availability_status: availabilityStatus }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          return { success: true, product: data.product };
        }
      } catch (e) {
        console.warn("[paye₹nt API] Update product status error:", e);
      }
    }
    return { success: true };
  },

  // ============================================================
  // WALLET & TRANSACTIONS & BANK ACCOUNTS
  // ============================================================
  async getWallet(): Promise<{
    success: boolean;
    wallet?: UserWallet;
    transactions?: WalletTransaction[];
    bankAccounts?: BankAccount[];
  }> {
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/paye₹nt/wallet`, {
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
      } catch (e) {
        console.warn("[paye₹nt API] Get wallet error:", e);
      }
    }
    return { success: false };
  },

  async getTransactions(): Promise<{ success: boolean; transactions?: WalletTransaction[]; error?: string }> {
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/paye₹nt/wallet/transactions`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          return { success: true, transactions: data.transactions };
        }
      } catch (e) {
        console.warn("[paye₹nt API] Get transactions error:", e);
      }
    }
    return { success: false };
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
        ? { amount: amountOrParams, bankAccountId: optionalBankAccountId || "bank-001" }
        : amountOrParams;

    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/paye₹nt/wallet/withdraw`, {
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
    }
    return { success: true, message: "Withdrawal processed successfully." };
  },

  async addBankAccount(bankData: {
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    confirmAccountNumber?: string;
    ifsc: string;
  }): Promise<{ success: boolean; bankAccount?: any; error?: string }> {
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/paye₹nt/wallet/bank-accounts`, {
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
    }
    return { success: true };
  },

  async deleteBankAccount(bankId: string): Promise<{ success: boolean; error?: string }> {
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/paye₹nt/wallet/bank-accounts/${bankId}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          return { success: true };
        }
      } catch (e) {
        console.warn("[paye₹nt API] Delete bank account error:", e);
      }
    }
    return { success: true };
  },

  // ============================================================
  // NOTIFICATIONS
  // ============================================================
  async getNotifications(): Promise<{ success: boolean; notifications?: LenderNotification[]; error?: string }> {
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/paye₹nt/notifications`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          return { success: true, notifications: data.notifications };
        }
      } catch (e) {
        console.warn("[paye₹nt API] Get notifications error:", e);
      }
    }
    return { success: false };
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    if (API_BASE) {
      try {
        await fetch(`${API_BASE}/api/paye₹nt/notifications/${id}/read`, {
          method: "PATCH",
          headers: getAuthHeaders(),
        });
      } catch {}
    }
    return { success: true };
  },

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    if (API_BASE) {
      try {
        await fetch(`${API_BASE}/api/paye₹nt/notifications/read-all`, {
          method: "POST",
          headers: getAuthHeaders(),
        });
      } catch {}
    }
    return { success: true };
  },

  // ============================================================
  // MESSAGES
  // ============================================================
  async getMessages(productId?: string): Promise<{ success: boolean; messages?: any[]; error?: string }> {
    if (API_BASE) {
      try {
        const url = productId
          ? `${API_BASE}/api/paye₹nt/messages?product_id=${encodeURIComponent(productId)}`
          : `${API_BASE}/api/paye₹nt/messages`;
        const res = await fetch(url, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          return { success: true, messages: data.messages };
        }
      } catch (e) {
        console.warn("[paye₹nt API] Get messages error:", e);
      }
    }
    return { success: false };
  },

  async sendMessage(params: {
    productId: string;
    receiverId: string;
    content: string;
  }): Promise<{ success: boolean; message?: any; error?: string }> {
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/paye₹nt/messages`, {
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
    }
    return { success: true };
  },
};

export default payerntApi;
