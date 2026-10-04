import axios from "axios";

// ----------------------------------------------------------------------
// 1. Interfaces & Types
// ----------------------------------------------------------------------

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: "admin" | "agent" | "user" | "customer" | "both";
  status: "active" | "suspended" | "pending" | "rejected" | "approved";
  verified: boolean;
  avatar: string;
  profilePhotoUrl?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  occupation?: string;
  bio?: string;
  website?: string;
  upiId?: string;
  aadhaarMasked?: string;
  accountType?: string;
  createdAt: string;
  payerntAccount?: {
    accountId: string;
    name: string;
    email: string;
    phone: string;
    aadhaarStatus: string;
    aadhaarMasked: string;
    bankAccountMasked: string;
    bankIfsc: string;
    accountStatus: string;
    verificationStatus: string;
    isVerified: boolean;
    address: string;
    city: string;
    pincode: string;
    avatar: string;
    createdAt: string;
  } | null;
  payrentAccount?: {
    accountId: string;
    fullName: string;
    email: string;
    phone: string;
    panStatus: string;
    panMasked: string;
    accountStatus: string;
    verificationStatus: string;
    isVerified: boolean;
    address: string;
    pincode: string;
    avatar: string;
    createdAt: string;
  } | null;
  products?: Array<{
    id: string;
    title: string;
    category: string;
    price: number;
    status: string;
    available: boolean;
    image: string;
    createdAt: string;
  }>;
  bookings?: Array<{
    id: string;
    productId: string;
    productTitle: string;
    startDate: string;
    endDate: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
  wallet?: {
    walletId: string;
    availableBalance: number;
    pendingAmount: number;
    totalReceived: number;
    totalWithdrawn: number;
    currency: string;
  } | null;
}

export interface AdminAgent {
  id: string;
  fullName: string;
  email: string;
  avatar: string;
  productsCount: number;
  bookingsCount: number;
  revenue: number;
  rating: number;
  status: "active" | "suspended";
  createdAt: string;
}

export interface AdminProduct {
  id: string;
  title: string;
  description: string;
  category: string;
  brand?: string;
  model?: string;
  year?: string | number;
  specifications?: Record<string, any>;
  features?: string[];
  conditionGrade?: string;
  conditionDetails?: Record<string, any>;
  accessories?: string;
  city?: string;
  area?: string;
  pincode?: string;
  pickupInstructions?: string;
  price: number;
  dailyRate?: number;
  weeklyRate?: number | null;
  monthlyRate?: number | null;
  securityDeposit?: number;
  minRentalDays?: number;
  maxRentalDays?: number;
  rating: number;
  reviewsCount: number;
  available: boolean;
  status: "pending" | "approved" | "rejected" | "under_review" | "needs_correction";
  featured: boolean;
  hidden: boolean;
  image: string;
  images: string[];
  documents: string[];
  videoUrl?: string;
  approvedPriceRange?: {
    minPrice: number;
    maxPrice: number;
    unit: "day" | "hour" | "week" | "month";
    approvedAt?: string;
    approvedBy?: string;
  };
  priceHistory?: Array<{
    id: string;
    minPrice: number;
    maxPrice: number;
    unit: string;
    previousMinPrice?: number;
    previousMaxPrice?: number;
    updatedBy: string;
    updatedAt: string;
  }>;
  createdAt: string;
  updatedAt?: string;
  bookings?: Array<{
    id: string;
    startDate: string;
    endDate: string;
    amount: number;
    status: string;
    customerEmail: string;
    customerName: string;
    createdAt: string;
  }>;
  owner: {
    id: string;
    name: string;
    avatar: string;
    rating: number;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    pincode?: string;
    accountStatus?: string;
    verificationStatus?: string;
    isVerified?: boolean;
    productsCount?: number;
    createdAt?: string;
  };
}

export interface AdminCategory {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  count: number;
  color: string; // Tailwind class color or hex
  enabled: boolean;
}

export interface AdminBooking {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  customerId: string;
  customerName: string;
  ownerId: string;
  ownerName: string;
  startDate: string;
  endDate: string;
  amount: number;
  status: "pending" | "active" | "completed" | "cancelled";
  createdAt: string;
}

export interface AdminPayment {
  id: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  amount: number;
  status: "successful" | "refunded" | "failed";
  method: "Credit Card" | "PayPal" | "Apple Pay" | "Bank Transfer";
  invoiceUrl: string;
  createdAt: string;
}

export interface AdminReview {
  id: string;
  productId: string;
  productTitle: string;
  userName: string;
  userAvatar: string;
  rating: number;
  comment: string;
  hidden: boolean;
  createdAt: string;
}

export interface AdminReport {
  id: string;
  reason: string;
  evidence: string;
  productId: string;
  productTitle: string;
  reporterName: string;
  ownerName: string;
  ownerId: string;
  status: "open" | "resolved" | "dismissed";
  createdAt: string;
}

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: string;
}

export interface AdminSupportTicket {
  id: string;
  subject: string;
  category: string;
  status: "open" | "pending" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  userName: string;
  userEmail: string;
  messages: {
    id: string;
    sender: "user" | "admin";
    message: string;
    createdAt: string;
  }[];
  createdAt: string;
}

export interface AdminSettings {
  websiteName: string;
  logoUrl: string;
  theme: "light" | "dark" | "system";
  contactEmail: string;
  contactPhone: string;
  socialFacebook: string;
  socialTwitter: string;
  socialInstagram: string;
  seoTitle: string;
  seoDescription: string;
  homepageBannerText: string;
  footerText: string;
}

export interface AdminActivityLog {
  id: string;
  timestamp: string;
  userName: string;
  action: string;
  module: string;
  ipAddress: string;
}

// ----------------------------------------------------------------------
// 2. Axios Client & Interceptors (Zero Fake Data / Zero Offline Bypass)
// ----------------------------------------------------------------------

const getAdminApiBase = () => {
  let base = "";
  if (typeof window !== "undefined") {
    const win = window as unknown as { PAYENT_API_URL?: string };
    if (win.PAYENT_API_URL) base = win.PAYENT_API_URL;
  }
  if (!base && import.meta.env.VITE_API_URL) {
    base = import.meta.env.VITE_API_URL;
  }
  if (!base && typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "10.0.2.2") base = "http://10.0.2.2:8001";
    else if (host === "localhost" || host === "127.0.0.1") base = "http://127.0.0.1:8001";
    else if (host.endsWith(".vercel.app")) base = "";
    else base = window.location.origin;
  }
  // Strip trailing slashes and trailing /api to prevent /api/api duplication
  base = (base || "").replace(/\/+$/, "");
  if (base.endsWith("/api")) {
    base = base.slice(0, -4);
  }
  return base;
};
const API_BASE = getAdminApiBase();

export const adminApi = axios.create({
  baseURL: `${API_BASE}/api/admin`,
  timeout: 30000,
});

adminApi.interceptors.request.use((config) => {
  let token =
    localStorage.getItem("payent:admin:token") ||
    localStorage.getItem("payent:token") ||
    localStorage.getItem("paye₹nt_token") ||
    localStorage.getItem("payernt_token");

  if (token) {
    token = token.trim();
    if (token.startsWith('"') && token.endsWith('"')) {
      token = token.slice(1, -1).trim();
    }
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const isOfflineMode = () => false;

adminApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    if (status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("payent:admin:token");
      localStorage.removeItem("payent:admin:current_user");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login?redirect=/admin/dashboard";
      }
    }
    return Promise.reject(error);
  }
);
