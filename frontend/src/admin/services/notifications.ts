import {
  adminApi,
  AdminNotification,
  AdminSupportTicket,
  AdminReport,
  AdminReview,
  AdminSettings,
  AdminActivityLog,
} from "./api";

export interface DashboardStats {
  totalUsers: number;
  totalAgents: number;
  totalProducts: number;
  pendingProducts: number;
  approvedProducts: number;
  rejectedProducts: number;
  totalCategories: number;
  bookingsToday: number;
  monthlyBookings: number;
  revenueToday: number;
  monthlyRevenue: number;
  pendingReports: number;
  unreadNotifications: number;
  websiteVisitors: number;
}

export interface DashboardCharts {
  revenueChart: { name: string; revenue: number }[];
  bookingChart: { name: string; bookings: number }[];
  userGrowth: { name: string; users: number }[];
  productGrowth: { name: string; products: number }[];
  categoryDistribution: { name: string; value: number }[];
  topProducts: { name: string; rentals: number; revenue: number }[];
}

export interface DashboardActivity {
  id: string;
  type: string;
  title: string;
  detail: string;
  time: string;
  icon: string;
}

export const notificationsService = {
  // Notifications
  async getNotifications(): Promise<AdminNotification[]> {
    const response = await adminApi.get("/notifications");
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  },

  async markAllRead(): Promise<void> {
    await adminApi.post("/notifications/mark-read");
  },

  async deleteNotification(id: string): Promise<void> {
    await adminApi.delete(`/notifications/${encodeURIComponent(id)}`);
  },

  // Support Tickets
  async getSupportTickets(): Promise<AdminSupportTicket[]> {
    const response = await adminApi.get("/support");
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  },

  async replyToTicket(
    id: string,
    message: string,
  ): Promise<AdminSupportTicket> {
    const response = await adminApi.post(`/support/${encodeURIComponent(id)}/reply`, { message });
    return response.data;
  },

  async updateTicketStatus(
    id: string,
    status: AdminSupportTicket["status"],
  ): Promise<AdminSupportTicket> {
    const response = await adminApi.post(`/support/${encodeURIComponent(id)}/status`, { status });
    return response.data;
  },

  // Reports
  async getReports(): Promise<AdminReport[]> {
    const response = await adminApi.get("/reports");
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  },

  async resolveReport(id: string): Promise<AdminReport> {
    const response = await adminApi.post(`/reports/${encodeURIComponent(id)}/resolve`);
    return response.data;
  },

  async dismissReport(id: string): Promise<AdminReport> {
    const response = await adminApi.post(`/reports/${encodeURIComponent(id)}/dismiss`);
    return response.data;
  },

  async suspendProductReport(id: string): Promise<AdminReport> {
    const response = await adminApi.post(`/reports/${encodeURIComponent(id)}/suspend-product`);
    return response.data;
  },

  async banUserReport(id: string): Promise<AdminReport> {
    const response = await adminApi.post(`/reports/${encodeURIComponent(id)}/ban-user`);
    return response.data;
  },

  // Reviews
  async getReviews(): Promise<AdminReview[]> {
    const response = await adminApi.get("/reviews");
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  },

  async deleteReview(id: string): Promise<void> {
    await adminApi.delete(`/reviews/${encodeURIComponent(id)}`);
  },

  async toggleHideReview(id: string): Promise<AdminReview> {
    const response = await adminApi.post(`/reviews/${encodeURIComponent(id)}/toggle-hide`);
    return response.data;
  },

  // Settings
  async getSettings(): Promise<AdminSettings> {
    const response = await adminApi.get("/settings");
    if (response.data) return response.data;
    return {
      websiteName: "Payent",
      logoUrl: "/brand/payent-logo-icon.png",
      theme: "dark",
      contactEmail: "support@payent.in",
      contactPhone: "+1 (800) 555-GEAR",
      socialFacebook: "https://facebook.com/payent",
      socialTwitter: "https://twitter.com/payent",
      socialInstagram: "https://instagram.com/payent",
      seoTitle: "Payent — Premium Tech Gear Rental Marketplace",
      seoDescription:
        "Rent professional video gear, cameras, laptops, drones, and consoles. Safe, secure, and fully insured.",
      homepageBannerText: "Unlock premium gear at a fraction of the cost.",
      footerText: "© 2026 Payent Inc. All rights reserved.",
    };
  },

  async updateSettings(data: Partial<AdminSettings>): Promise<AdminSettings> {
    const response = await adminApi.post("/settings", data);
    return response.data;
  },

  // Profile & Password
  async updateProfile(data: {
    fullName?: string;
    email?: string;
    phone?: string;
    avatar?: string;
  }): Promise<unknown> {
    const response = await adminApi.post("/profile", data);
    return response.data;
  },

  async updatePassword(data: {
    currentPassword?: string;
    newPassword?: string;
  }): Promise<unknown> {
    const response = await adminApi.post("/profile/password", data);
    return response.data;
  },

  // Activity Logs
  async getActivityLogs(): Promise<AdminActivityLog[]> {
    const response = await adminApi.get("/activity-logs");
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  },

  // Dashboard Stats & Analytics
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await adminApi.get("/dashboard/stats");
    if (response.data && typeof response.data === "object") {
      return response.data as DashboardStats;
    }
    throw new Error("Invalid stats response from server");
  },

  async getDashboardCharts(period = "30"): Promise<DashboardCharts> {
    const days = parseInt(period, 10) || 30;
    const response = await adminApi.get(`/dashboard/charts?days=${days}`);
    if (response.data && typeof response.data === "object") {
      return response.data as DashboardCharts;
    }
    throw new Error("Invalid charts response from server");
  },

  async getDashboardActivities(): Promise<DashboardActivity[]> {
    const response = await adminApi.get("/dashboard/activities");
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  },

  async resetAnalytics(): Promise<void> {
    await adminApi.post("/dashboard/reset-analytics");
  },
};
