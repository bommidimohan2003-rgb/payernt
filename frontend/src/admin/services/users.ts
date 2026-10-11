import { adminApi, AdminUser, AdminAgent } from "./api";

export const isFakeUserEmail = (email?: string): boolean => {
  if (!email) return false;
  const em = email.toLowerCase().trim();
  const fakeDomains = ["@example.com", "@test.com", "@payent.com", "@payent.io", "@fake.com"];
  if (fakeDomains.some((d) => em.endsWith(d))) return true;
  const fakePrefixes = [
    "test_", "fake_", "vendor_", "lender_", "both_", "shared_",
    "p10_", "p10a_", "audit_", "reset_test_", "ephem_", "stranger_",
    "competitor_", "attacker@", "second_admin@", "nonexistent_"
  ];
  if (fakePrefixes.some((p) => em.startsWith(p))) return true;
  if (["secure_vendor@payent.io", "admin@payent.com", "mohan@payent.in", "mohan@payent.io", "offline_user@payent.in"].includes(em)) {
    return true;
  }
  return false;
};

export const usersService = {
  async getUsers(): Promise<AdminUser[]> {
    const response = await adminApi.get("/users");
    if (response.data && Array.isArray(response.data)) {
      return response.data.filter((u: AdminUser) => !isFakeUserEmail(u.email));
    }
    return [];
  },

  async getUserDetails(id: string): Promise<AdminUser> {
    const response = await adminApi.get(`/users/${encodeURIComponent(id)}`);
    return response.data;
  },

  async getUserById(id: string): Promise<AdminUser> {
    return this.getUserDetails(id);
  },

  async updateUser(id: string, data: Partial<AdminUser>): Promise<AdminUser> {
    const response = await adminApi.put(`/users/${encodeURIComponent(id)}`, data);
    return response.data;
  },

  async approveUser(id: string, type?: string): Promise<AdminUser> {
    const url = type
      ? `/users/${encodeURIComponent(id)}/approve?type=${encodeURIComponent(type)}`
      : `/users/${encodeURIComponent(id)}/approve`;
    const response = await adminApi.patch(url);
    return response.data?.user || response.data;
  },

  async rejectUser(id: string, reason?: string, type?: string): Promise<AdminUser> {
    const url = type
      ? `/users/${encodeURIComponent(id)}/reject?type=${encodeURIComponent(type)}`
      : `/users/${encodeURIComponent(id)}/reject`;
    const response = await adminApi.patch(url, { reason, accountType: type });
    return response.data?.user || response.data;
  },

  async deleteUser(id: string): Promise<void> {
    await adminApi.delete(`/users/${encodeURIComponent(id)}`);
  },

  async suspendUser(id: string): Promise<AdminUser> {
    const response = await adminApi.post(`/users/${encodeURIComponent(id)}/suspend`);
    return response.data?.user || response.data;
  },

  async activateUser(id: string): Promise<AdminUser> {
    const response = await adminApi.post(`/users/${encodeURIComponent(id)}/activate`);
    return response.data?.user || response.data;
  },

  async getAgents(): Promise<AdminAgent[]> {
    const response = await adminApi.get("/agents");
    if (response.data && Array.isArray(response.data)) {
      return response.data.filter((a: AdminAgent) => !isFakeUserEmail(a.email));
    }
    return [];
  },

  async suspendAgent(id: string): Promise<AdminAgent> {
    const response = await adminApi.post(`/agents/${encodeURIComponent(id)}/suspend`);
    return response.data;
  },

  async deleteAgent(id: string): Promise<void> {
    await adminApi.delete(`/agents/${encodeURIComponent(id)}`);
  },
};
