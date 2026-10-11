import { adminApi, AdminBooking } from "./api";

export const bookingsService = {
  async getBookings(): Promise<AdminBooking[]> {
    try {
      const response = await adminApi.get("/bookings");
      if (response.data && Array.isArray(response.data)) {
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("payent:admin:bookings", JSON.stringify(response.data));
          } catch {}
        }
        return response.data;
      }
    } catch (err) {
      console.warn("[bookingsService] Failed to fetch bookings from API, checking local admin cache:", err);
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem("payent:admin:bookings");
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          } catch {}
        }
      }
      throw err;
    }
    return [];
  },

  async cancelBooking(id: string): Promise<AdminBooking> {
    const response = await adminApi.post(`/bookings/${encodeURIComponent(id)}/cancel`);
    return response.data;
  },

  async completeBooking(id: string): Promise<AdminBooking> {
    const response = await adminApi.post(`/bookings/${encodeURIComponent(id)}/complete`);
    return response.data;
  },

  async refundBooking(id: string): Promise<AdminBooking> {
    const response = await adminApi.post(`/bookings/${encodeURIComponent(id)}/refund`);
    return response.data;
  },

  async processBooking(id: string): Promise<{ success: boolean; bookingId: string; deliveryStatus: string }> {
    const response = await adminApi.post(`/bookings/${encodeURIComponent(id)}/process`);
    return response.data;
  },

  async notifyVendor(id: string): Promise<{ success: boolean; bookingId: string; deliveryStatus: string; vendorNotified: boolean }> {
    const response = await adminApi.post(`/bookings/${encodeURIComponent(id)}/notify-vendor`);
    return response.data;
  },

  async assignDelivery(id: string, payload: { deliveryBoyId?: string; deliveryBoyName?: string; deliveryBoyPhone?: string }): Promise<{ success: boolean; bookingId: string; deliveryBoyName?: string; deliveryBoyPhone?: string }> {
    const response = await adminApi.post(`/bookings/${encodeURIComponent(id)}/assign-delivery`, payload);
    return response.data;
  },
};
