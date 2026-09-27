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
        localStorage.removeItem("payent:signed_out");
        localStorage.setItem("payent:admin:token", response.data.token);
        localStorage.setItem(
          "payent:admin:current_user",
          JSON.stringify(userPayload),
        );
        localStorage.setItem("payent:token", response.data.token);
        localStorage.setItem("payent:currentUser", JSON.stringify(userPayload));
        window.dispatchEvent(new Event("payent:admin:profile-updated"));
        window.dispatchEvent(new CustomEvent("payent:storage_change"));
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
      window.dispatchEvent(new CustomEvent("payent:storage_change"));
      window.location.href = "/";
    }
  },

  async getMe(): Promise<AdminUser> {
    const response = await adminApi.get("/auth/me");
    return response.data;
  },

  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    const adminToken = localStorage.getItem("payent:admin:token");
    if (adminToken) return true;
    const currentUserRaw = localStorage.getItem("payent:currentUser");
    if (currentUserRaw) {
      try {
        const u = JSON.parse(currentUserRaw);
        return u?.role === "admin";
      } catch {
        return false;
      }
    }
    return false;
  },

  getCurrentUser(): AdminUser | null {
    if (typeof window !== "undefined") {
      const adminUser = localStorage.getItem("payent:admin:current_user");
      if (adminUser) {
        try {
          const u = JSON.parse(adminUser);
          if (u && (u.email || u.fullName)) {
            return {
              id: u.email || u.id || "",
              fullName: u.fullName || u.email?.split("@")[0] || "Administrator",
              email: u.email || "",
              phone: u.phone || "",
              role: (u.role as AdminUser["role"]) || "admin",
              status: u.status || "active",
              verified: true,
              avatar:
                u.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName || u.email || "Admin")}&background=10b981&color=fff`,
              createdAt: u.createdAt || new Date().toISOString(),
            };
          }
        } catch {
          // fallback
        }
      }

      const currentUserRaw = localStorage.getItem("payent:currentUser");
      if (currentUserRaw) {
        try {
          const u = JSON.parse(currentUserRaw);
          if (u && (u.email || u.fullName) && u.role === "admin") {
            return {
              id: u.email || u.id || "",
              fullName: u.fullName || u.email?.split("@")[0] || "Administrator",
              email: u.email || "",
              phone: u.phone || "",
              role: "admin",
              status: u.status || "active",
              verified: true,
              avatar:
                u.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName || u.email || "Admin")}&background=10b981&color=fff`,
              createdAt: u.createdAt || new Date().toISOString(),
            };
          }
        } catch {
          // fallback
        }
      }
    }

    return null;
  },
};
