import { adminApi, AdminUser, AdminAgent } from "./api";

export const REAL_USER_EMAILS = new Set([
  "shinyshakhina08@gmail.com",
  "vasnathchikkala@gmail.com",
  "bommidimohan304@gmail.com",
  "yernikumar1438@gmail.com",
  "bommidimohan2003@gmail.com",
]);

export const isFakeUserEmail = (email?: string): boolean => {
  if (!email) return true;
  const em = email.toLowerCase().trim();
  if (REAL_USER_EMAILS.has(em)) return false;
  const testDomains = ["@example.com", "@test.com", "@fake.com", "@mock.com", "@mailinator.com"];
  if (testDomains.some((d) => em.endsWith(d))) return true;
  const testPrefixes = ["fake_", "test_", "audit_", "ephem_", "reset_test_"];
  if (testPrefixes.some((p) => em.startsWith(p))) return true;
  return false;
};

export const usersService = {
  async getUsers(): Promise<AdminUser[]> {
    const response = await adminApi.get("/users");
    if (response.data && Array.isArray(response.data)) {
      const seen = new Set<string>();
      const uniqueUsers: AdminUser[] = [];
      for (const u of response.data) {
        if (!u.email || isFakeUserEmail(u.email)) continue;
        const em = u.email.toLowerCase().trim();
        if (seen.has(em)) continue;
        seen.add(em);
        uniqueUsers.push(u);
      }
      return uniqueUsers;
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
      const seen = new Set<string>();
      const uniqueAgents: AdminAgent[] = [];
      for (const a of response.data) {
        if (!a.email || isFakeUserEmail(a.email)) continue;
        const em = a.email.toLowerCase().trim();
        if (seen.has(em)) continue;
        seen.add(em);
        uniqueAgents.push(a);
      }
      return uniqueAgents;
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
