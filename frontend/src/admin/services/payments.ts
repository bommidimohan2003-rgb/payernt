import { adminApi, AdminPayment } from "./api";

export const paymentsService = {
  async getPayments(): Promise<AdminPayment[]> {
    try {
      const response = await adminApi.get("/payments");
      if (response.data && Array.isArray(response.data)) {
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("payent:admin:payments", JSON.stringify(response.data));
          } catch {}
        }
        return response.data;
      }
    } catch (err) {
      console.warn("[paymentsService] Failed to fetch payments from API, checking local admin cache:", err);
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem("payent:admin:payments");
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

  async refundPayment(id: string): Promise<AdminPayment> {
    const response = await adminApi.post(`/payments/${encodeURIComponent(id)}/refund`);
    return response.data;
  },
};
