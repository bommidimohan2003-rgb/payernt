import { adminApi, AdminUser } from "./api";

const DEFAULT_ADMIN: AdminUser = {
  id: "admin_payent_current",
  fullName: "Mohan Bommidi",
  email: "mohan@payent.in",
  phone: "+91 9876543210",
  role: "admin",
  status: "active",
  verified: true,
  avatar: "https://ui-avatars.com/api/?name=Mohan+Bommidi&background=10b981&color=fff",
  createdAt: new Date().toISOString(),
};

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
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=10b981&color=fff`,
        createdAt: new Date().toISOString(),
      };

      if (typeof window !== "undefined") {
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
    try {
      await adminApi.post("/auth/logout");
    } catch (err) {
      console.warn("Logout endpoint notice:", err);
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("payent:admin:token");
      localStorage.removeItem("payent:admin:current_user");
      window.dispatchEvent(new Event("payent:admin:profile-updated"));
      window.location.href = "/login";
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

  getCurrentUser(): AdminUser | null {
    if (typeof window === "undefined") return null;

    // 1. Direct admin storage
    const adminUserStr = localStorage.getItem("payent:admin:current_user");
    if (adminUserStr) {
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
            avatar:
              u.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName || u.name || u.email || "Admin")}&background=10b981&color=fff`,
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
            avatar:
              u.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName || u.name || u.email || "Admin")}&background=10b981&color=fff`,
            createdAt: new Date().toISOString(),
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
            avatar:
              u.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || u.fullName || u.email || "Admin")}&background=10b981&color=fff`,
            createdAt: new Date().toISOString(),
          };
          localStorage.setItem("payent:admin:current_user", JSON.stringify(adminPayload));
          return adminPayload;
        }
      } catch {}
    }

    return null;
  },
};
