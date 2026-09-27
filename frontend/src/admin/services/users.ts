import { adminApi, AdminUser, AdminAgent } from "./api";

export const usersService = {
  async getUsers(): Promise<AdminUser[]> {
    const response = await adminApi.get("/users");
    if (response.data && Array.isArray(response.data)) {
      return response.data;
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

  async approveUser(id: string): Promise<AdminUser> {
    const response = await adminApi.patch(`/users/${encodeURIComponent(id)}/approve`);
    return response.data?.user || response.data;
  },

  async rejectUser(id: string, reason?: string): Promise<AdminUser> {
    const response = await adminApi.patch(`/users/${encodeURIComponent(id)}/reject`, { reason });
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
      return response.data;
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
