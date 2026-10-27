import { adminApi, AdminUser, API_BASE } from "./api";
import axios from "axios";

export const authService = {
  async login(
    email: string,
    password: string,
  ): Promise<{ success: boolean; token: string; user: AdminUser }> {
    const response = await adminApi.post("/auth/login", { email, password });
    if (response.data?.token) {
      const userPayload: AdminUser = response.data.user || {
        id: email,
        fullName: email.split("@")[0],
        email: email,
        phone: "",
        role: "admin",
        status: "active",
        verified: true,
        avatar: "",
        createdAt: new Date().toISOString(),
      };

      if (typeof window !== "undefined") {
        localStorage.removeItem("payent:admin:logged_out");
        localStorage.removeItem("payent:signed_out");
        localStorage.setItem("payent:admin:token", response.data.token);
        localStorage.setItem(
          "payent:admin:current_user",
          JSON.stringify(userPayload),
        );
        window.dispatchEvent(new Event("payent:admin:profile-updated"));
      }
      return { success: true, token: response.data.token, user: userPayload };
    }
    return response.data;
  },

  async registerAdmin(data: {
    email: string;
    password: string;
    fullName?: string;
    adminCode?: string;
  }): Promise<{ success: boolean; message: string }> {
    const response = await adminApi.post("/auth/register", {
      email: data.email,
      password: data.password,
      full_name: data.fullName,
      admin_code: data.adminCode,
    });
    return response.data;
  },

  async logout(): Promise<void> {
    const adminToken = typeof window !== "undefined" ? localStorage.getItem("payent:admin:token") : null;
    const generalToken = typeof window !== "undefined" ? localStorage.getItem("payent:token") : null;

    // 1. Invalidate backend sessions
    try {
      await adminApi.post("/auth/logout").catch(() => {});
    } catch {}

    try {
      const tok = adminToken || generalToken;
      if (tok) {
        await axios.post(`${API_BASE}/api/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${tok}` },
          withCredentials: true,
        }).catch(() => {});
      }
    } catch {}

    // 2. Clear client storage completely
    if (typeof window !== "undefined") {
      // Clear admin session & keys
      localStorage.removeItem("payent:admin:token");
      localStorage.removeItem("payent:admin:current_user");
      localStorage.removeItem("payent:admin:logged_out");
      localStorage.removeItem("payent:admin:bookings");
      localStorage.removeItem("payent:admin:payments");
      localStorage.removeItem("payent:admin:users");
      localStorage.removeItem("payent:admin:products");

      // Clear customer & vendor credentials to prevent session bleed
      localStorage.removeItem("payent:token");
      localStorage.removeItem("payent:currentUser");
      localStorage.removeItem("payent:refreshToken");
      localStorage.removeItem("pay₹ent_session");
      localStorage.removeItem("pay₹ent_account");
      localStorage.removeItem("paye₹nt_token");
      localStorage.removeItem("payernt_token");
      localStorage.removeItem("paye₹nt_refresh_token");
      localStorage.removeItem("payernt_refresh_token");
      localStorage.removeItem("paye₹nt_session");
      localStorage.removeItem("payernt_session");
      localStorage.removeItem("paye₹nt_account");
      localStorage.removeItem("payernt_account");
      localStorage.removeItem("paye₹nt_active_user");
      localStorage.removeItem("payernt_active_user");

      // Set explicit signed_out flag to notify cross-tab listeners
      localStorage.setItem("payent:signed_out", "true");

      // 3. Dispatch global state reset events
      window.dispatchEvent(new Event("payent:admin:profile-updated"));
      window.dispatchEvent(new CustomEvent("payent:storage_change"));
      window.dispatchEvent(new CustomEvent("paye₹nt_auth_change", { detail: null }));

      // 4. Navigate cleanly to the intended public login entry point
      window.location.replace("/login");
    }
  },

  async getMe(): Promise<AdminUser> {
    const response = await adminApi.get("/auth/me");
    return response.data;
  },

  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    const adminUser = this.getCurrentUser();
    return adminUser !== null && (adminUser.role === "admin" || (adminUser as any).role === "superadmin");
  },

  async verifyAdminSession(): Promise<{ isValid: boolean; user: AdminUser | null; isForbidden?: boolean }> {
    if (typeof window === "undefined") return { isValid: false, user: null };

    const token =
      localStorage.getItem("payent:admin:token") ||
      localStorage.getItem("payent:token") ||
      localStorage.getItem("paye₹nt_token") ||
      localStorage.getItem("payernt_token");

    if (!token) {
      return { isValid: false, user: null };
    }

    try {
      const response = await adminApi.get("/auth/me");
      if (response.data && (response.data.role === "admin" || response.data.role === "superadmin")) {
        const adminPayload: AdminUser = {
          id: response.data.id || response.data.email,
          fullName:
            response.data.fullName ||
            response.data.full_name ||
            response.data.email?.split("@")[0] ||
            "Administrator",
          email: response.data.email,
          phone: response.data.phone || "",
          role: "admin",
          status: response.data.status || "active",
          verified: true,
          avatar:
            response.data.avatar || response.data.profilePhotoUrl || "",
          createdAt: response.data.createdAt || response.data.created_at || new Date().toISOString(),
        };

        localStorage.setItem("payent:admin:token", token);
        localStorage.setItem("payent:admin:current_user", JSON.stringify(adminPayload));
        return { isValid: true, user: adminPayload };
      } else {
        // Authenticated user exists, but does not have admin role
        return { isValid: false, user: null, isForbidden: true };
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403) {
        return { isValid: false, user: null, isForbidden: true };
      }
      if (status === 401) {
        // Stale or invalid credentials - clear local admin tokens
        localStorage.removeItem("payent:admin:token");
        localStorage.removeItem("payent:admin:current_user");
        return { isValid: false, user: null };
      }
      // Offline fallback: if network error (not 401/403) and user is cached
      const cached = this.getCurrentUser();
      if (cached && (cached.role === "admin" || (cached as any).role === "superadmin")) {
        return { isValid: true, user: cached };
      }
      return { isValid: false, user: null };
    }
  },

  getCurrentUser(): AdminUser | null {
    if (typeof window === "undefined") return null;

    // 1. Direct admin storage (Must have a valid token)
    const adminToken = localStorage.getItem("payent:admin:token");
    const adminUserStr = localStorage.getItem("payent:admin:current_user");
    if (adminToken && adminUserStr) {
      try {
        const u = JSON.parse(adminUserStr);
        if (u && (u.role === "admin" || u.role === "superadmin")) {
          return {
            id: u.email || u.id || "",
            fullName: u.fullName || u.name || u.email?.split("@")[0] || "Administrator",
            email: u.email || "",
            phone: u.phone || "",
            role: "admin",
            status: u.status || "active",
            verified: true,
            avatar: u.profilePhotoUrl || u.avatar || "",
            createdAt: u.createdAt || new Date().toISOString(),
          };
        }
      } catch {}
    }

    // 2. Payrent user storage (if role === 'admin' or 'superadmin')
    const customerUserStr = localStorage.getItem("payent:currentUser");
    const customerToken = localStorage.getItem("payent:token");
    if (customerUserStr && customerToken) {
      try {
        const u = JSON.parse(customerUserStr);
        if (u && (u.role === "admin" || u.role === "superadmin")) {
          localStorage.setItem("payent:admin:token", customerToken);
          const adminPayload: AdminUser = {
            id: u.email || u.id || "",
            fullName: u.fullName || u.name || u.email?.split("@")[0] || "Administrator",
            email: u.email || "",
            phone: u.phone || "",
            role: "admin",
            status: u.status || "active",
            verified: true,
            avatar: u.profilePhotoUrl || u.avatar || "",
            createdAt: u.createdAt || new Date().toISOString(),
          };
          localStorage.setItem("payent:admin:current_user", JSON.stringify(adminPayload));
          return adminPayload;
        }
      } catch {}
    }

    // 3. Payernt vendor storage (if role === 'admin' or 'superadmin')
    const payerntAccountStr = localStorage.getItem("paye₹nt_account") || localStorage.getItem("payernt_account");
    const payerntToken = localStorage.getItem("paye₹nt_token") || localStorage.getItem("payernt_token");
    if (payerntAccountStr && payerntToken) {
      try {
        const u = JSON.parse(payerntAccountStr);
        if (u && (u.role === "admin" || u.role === "superadmin")) {
          localStorage.setItem("payent:admin:token", payerntToken);
          const adminPayload: AdminUser = {
            id: u.email || u.id || u.accountId || "",
            fullName: u.name || u.fullName || u.email?.split("@")[0] || "Administrator",
            email: u.email || "",
            phone: u.phone || "",
            role: "admin",
            status: u.status || "active",
            verified: true,
            avatar: u.profilePhotoUrl || u.avatar || "",
            createdAt: u.createdAt || new Date().toISOString(),
          };
          localStorage.setItem("payent:admin:current_user", JSON.stringify(adminPayload));
          return adminPayload;
        }
      } catch {}
    }

    return null;
  },
};
