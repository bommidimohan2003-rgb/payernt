import { adminApi } from "./api";

export interface PinVerifiedProduct {
  id: string;
  name: string;
  category: string;
  dailyRate: number;
  securityDeposit: number;
  status: string;
  image?: string;
  vendor: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

export interface PinVerifiedBooking {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  amount?: number;
}

export interface PinVerifiedRenter {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface PinVerificationResult {
  verificationId: string;
  verifiedAt: string;
  outcome: string;
  product: PinVerifiedProduct;
  booking: PinVerifiedBooking;
  renter: PinVerifiedRenter;
  securityStatus: string;
}

export interface PinVerificationHistoryItem {
  id: string;
  timestamp: string;
  adminName: string;
  maskedPin: string;
  outcome: "MATCHED" | "FAILED" | string;
  productId: string;
  productName: string;
  productCategory: string;
  productStatus: string;
  bookingId: string;
  bookingStatus: string;
  renterName: string;
  vendorName: string;
}

export interface PinVerificationHistoryResponse {
  success: boolean;
  total: number;
  page: number;
  limit: number;
  items: PinVerificationHistoryItem[];
}

export const pinVerificationService = {
  async verifyPin(pin: string): Promise<PinVerificationResult> {
    const res = await adminApi.post<{
      success: boolean;
      message: string;
      data: PinVerificationResult;
    }>("/verify-pin", { pin });
    return res.data.data;
  },

  async getHistory(
    page: number = 1,
    limit: number = 20,
    search?: string
  ): Promise<PinVerificationHistoryResponse> {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", limit.toString());
    if (search) params.set("q", search);

    const res = await adminApi.get<PinVerificationHistoryResponse>(
      `/verify-pin/history?${params.toString()}`
    );
    return res.data;
  },
};
