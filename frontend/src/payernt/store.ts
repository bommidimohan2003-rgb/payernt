import { useState, useEffect, useCallback, useRef } from "react";
import type {
  PayerntProduct,
  RentalRequest,
  EarningTransaction,
  LenderNotification,
  LenderProfile,
  VerificationStatus,
  ProductAvailability,
  RentalRequestStatus,
  DemoUser,
  UserWallet,
  WalletTransaction,
  BankAccount,
  PayerntAccount,
  PayerntMessage,
} from "./types";
import { payerntApi } from "./payerntApiService";
import { isFakeOrDeletedProduct } from "@/utils/productFilters";
import { normalizePayerntProduct } from "./productUtils";

export const STORAGE_KEY_PRODUCTS = "paye₹nt_products";
export const STORAGE_KEY_SESSION = "paye₹nt_session";
export const STORAGE_KEY_ACCOUNT = "paye₹nt_account";
export const STORAGE_KEY_ACCOUNTS = "paye₹nt_accounts";
export const STORAGE_KEY_WALLET = "paye₹nt_wallet";
export const STORAGE_KEY_THEME = "paye₹nt_theme";
export const STORAGE_KEY_ACTIVE_USER = "paye₹nt_active_demo_user";
export const STORAGE_KEY_MESSAGES = "paye₹nt_messages";
const STORAGE_KEY_DRAFT = "paye₹nt_product_draft";
const STORAGE_KEY_REQUESTS = "paye₹nt_rental_requests";
const STORAGE_KEY_EARNINGS = "paye₹nt_earnings";
const STORAGE_KEY_NOTIFS = "paye₹nt_notifications";
const STORAGE_KEY_PROFILE = "paye₹nt_profile";

export const DEMO_USERS: DemoUser[] = [];

export const INITIAL_PRODUCTS: PayerntProduct[] = [];

export const INITIAL_REQUESTS: RentalRequest[] = [
  {
    id: "ord-fx3-cinema-782",
    productId: "prod-sony-fx3",
    productTitle: "Sony FX3 Cinema Camera Kit",
    productImage:
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600",
    category: "Cameras",
    renter: {
      name: "Arjun Verma",
      avatar: "",
      profilePhotoUrl: "",
      profile_photo_url: "",
      rating: 4.9,
      completedRentals: 6,
      phone: "+91 98765 43210",
      email: "arjun.creator@payent.com",
      city: "Bengaluru",
    },
    startDate: "2026-10-26",
    endDate: "2026-10-29",
    totalDays: 3,
    dailyRate: 3500,
    grossRental: 10500,
    platformFee: 525,
    netEarnings: 9975,
    securityDeposit: 5000,
    status: "confirmed",
    requestDate: "2026-10-26T10:15:00.000Z",
    createdAt: "2026-10-26T10:15:00.000Z",
    created_at: "2026-10-26T10:15:00.000Z",
    paymentStatus: "paid_to_escrow",
    confirmedAt: "2026-10-26T10:15:00.000Z",
    deliveryMethod: "delivery",
    deliveryAddress:
      "Flat 402, Green Glen Layout, Bellandur, Bengaluru, Karnataka 560103",
    locationDirections: "Near Central Mall, gate buzzer #402",
    latitude: 12.926,
    longitude: 77.6762,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=12.926,77.6762",
  },
];

export const INITIAL_EARNINGS: EarningTransaction[] = [];

export const INITIAL_NOTIFICATIONS: LenderNotification[] = [];

export const INITIAL_PROFILE: LenderProfile = {
  id: "vendor_user",
  accountId: "",
  accountType: "paye₹nt",
  name: "",
  email: "",
  phone: "",
  avatar: "",
  profilePhotoUrl: "",
  profile_photo_url: "",
  city: "",
  area: "",
  address: "",
  pincode: "",
  aadhaarMasked: "",
  isKycVerified: false,
  kycVerificationDate: "",
  trustScore: 5.0,
  totalGearListed: 0,
  activeRentalsCount: 0,
  lifetimeEarnings: 0,
  payoutUpi: "",
  payoutBank: {
    accountHolder: "",
    accountNumber: "",
    ifsc: "",
    bankName: "",
  },
};

export const INITIAL_WALLET: UserWallet = {
  userId: "",
  accountId: "",
  accountType: "paye₹nt",
  availableBalance: 0,
  pendingBalance: 0,
  totalReceived: 0,
  totalWithdrawn: 0,
  transactions: [],
  bankAccounts: [],
};

// Custom React Hook for Payernt Store
export function usePayerntStore() {
  // paye₹nt Account & Session State
  const [activeAccount, setActiveAccount] = useState<PayerntAccount | null>(
    null,
  );
  const [isLoadingBookings, setIsLoadingBookings] = useState<boolean>(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);

  const getStoredToken = () => {
    if (typeof window === "undefined") return null;
    try {
      const raw =
        localStorage.getItem("paye₹nt_token") ||
        localStorage.getItem("payernt_token") ||
        localStorage.getItem("payent:token") ||
        localStorage.getItem("payent_token") ||
        localStorage.getItem("payent_auth_token") ||
        localStorage.getItem("token");
      if (!raw) return null;
      let t = raw.trim();
      if (t.startsWith('"') && t.endsWith('"')) t = t.slice(1, -1).trim();
      return t || null;
    } catch {
      return null;
    }
  };

  const getRehydratedAccount = (): PayerntAccount | null => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ACCOUNT);
      if (stored) {
        return JSON.parse(stored);
      }
      const rawUser =
        localStorage.getItem("payent:currentUser") ||
        localStorage.getItem("payent_user") ||
        localStorage.getItem("pay₹ent_account");
      if (rawUser) {
        const u = JSON.parse(rawUser);
        if (u?.email) {
          return {
            id: u.id || `PAYERNT_USER_${u.email}`,
            accountId: u.id || `PAYERNT_USER_${u.email}`,
            accountType: "paye₹nt",
            name: u.fullName || u.name || u.email.split("@")[0],
            email: u.email,
            phone: u.phone || "",
            role: u.role || "vendor",
            status: "active",
            avatar: u.avatar || u.profilePhotoUrl || "",
          } as unknown as PayerntAccount;
        }
      }
    } catch {}
    return null;
  };

  const isAuthenticated = !!(
    (activeAccount ||
      (typeof window !== "undefined" && getRehydratedAccount())) &&
    typeof window !== "undefined" &&
    getStoredToken()
  );

  useEffect(() => {
    // Load stored account on client mount
    try {
      const token = getStoredToken();
      let accountToSet = null;
      const stored = localStorage.getItem(STORAGE_KEY_ACCOUNT);
      if (stored) {
        accountToSet = JSON.parse(stored);
      } else {
        accountToSet = getRehydratedAccount();
      }
      if (accountToSet && token) {
        setActiveAccount(accountToSet);
      }
      const storedUser = localStorage.getItem(STORAGE_KEY_ACTIVE_USER);
      if (storedUser) setActiveUserId(storedUser);

      const storedDraft = localStorage.getItem(STORAGE_KEY_DRAFT);
      if (storedDraft) setDraftProduct(JSON.parse(storedDraft));

      const storedRequests = localStorage.getItem(STORAGE_KEY_REQUESTS);
      if (storedRequests) {
        const parsed = JSON.parse(storedRequests);
        if (Array.isArray(parsed)) {
          setRentalRequests(parsed.filter((r) => !r.id?.startsWith("req-89")));
        }
      }

      const storedEarnings = localStorage.getItem(STORAGE_KEY_EARNINGS);
      if (storedEarnings) {
        const parsed = JSON.parse(storedEarnings);
        if (Array.isArray(parsed)) {
          setEarningsTransactions(
            parsed.filter((t) => !t.id?.startsWith("tx-70")),
          );
        }
      }

      const storedNotifs = localStorage.getItem(STORAGE_KEY_NOTIFS);
      if (storedNotifs) {
        const parsed = JSON.parse(storedNotifs);
        if (Array.isArray(parsed)) {
          setNotifications(parsed.filter((n) => n.id !== "notif-1"));
        }
      }

      const storedMsgs = localStorage.getItem(STORAGE_KEY_MESSAGES);
      if (storedMsgs) {
        const parsed = JSON.parse(storedMsgs);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
          setUnreadMessagesCount(
            parsed.filter((m) => !m.read && !m.is_read).length,
          );
        }
      }

      const storedProf = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (storedProf) setProfile(JSON.parse(storedProf));

      const storedWallet = localStorage.getItem(STORAGE_KEY_WALLET);
      if (storedWallet) {
        const parsed = JSON.parse(storedWallet);
        if (parsed) {
          const cleanTx = (parsed.transactions || []).filter(
            (tx: any) => !tx.id?.startsWith("wtx-00"),
          );
          const cleanBank = (parsed.bankAccounts || []).filter(
            (b: any) => !b.id?.startsWith("bank-00"),
          );
          setWallet({
            ...parsed,
            transactions: cleanTx,
            bankAccounts: cleanBank,
          });
        }
      }
    } catch {}

    const handleAuthChange = (e: any) => {
      const detail = e.detail;
      if (detail === null) {
        setActiveAccount(null);
      } else if (detail) {
        setActiveAccount(detail);
      } else {
        const token =
          localStorage.getItem("paye₹nt_token") ||
          localStorage.getItem("payernt_token");
        const stored = localStorage.getItem(STORAGE_KEY_ACCOUNT);
        if (stored && token) {
          try {
            setActiveAccount(JSON.parse(stored));
          } catch {
            setActiveAccount(null);
          }
        } else {
          setActiveAccount(null);
        }
      }
    };
    window.addEventListener("paye₹nt_auth_change", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);
    return () => {
      window.removeEventListener("paye₹nt_auth_change", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  const [activeUserId, setActiveUserId] = useState<string>("vendor_active");

  const activeUser: DemoUser = activeAccount
    ? {
        id: activeAccount.accountId,
        name: activeAccount.name,
        fullName: activeAccount.name,
        email: activeAccount.email,
        phone: activeAccount.phone || "",
        avatar: activeAccount.profilePhotoUrl || activeAccount.avatar || "",
        profilePhotoUrl:
          activeAccount.profilePhotoUrl ||
          activeAccount.profile_photo_url ||
          activeAccount.avatar ||
          "",
        profile_photo_url:
          activeAccount.profilePhotoUrl ||
          activeAccount.profile_photo_url ||
          activeAccount.avatar ||
          "",
        city: activeAccount.address?.split(",")[0]?.trim() || "India",
        role: "Vendor",
      }
    : {
        id: "guest",
        name: "Guest",
        fullName: "Guest",
        email: "",
        phone: "",
        avatar: "",
        profilePhotoUrl: "",
        profile_photo_url: "",
        city: "",
        role: "Guest",
      };

  const isMockItem = (item?: any) => {
    if (!item) return true;
    if (typeof item === "string") {
      return (
        item.startsWith("mock-") ||
        item.startsWith("fake-") ||
        item.startsWith("dummy-") ||
        item === "test-gear-1" ||
        isFakeOrDeletedProduct({ id: item })
      );
    }
    return isFakeOrDeletedProduct(item);
  };

  const [wallet, setWallet] = useState<UserWallet>(INITIAL_WALLET);
  const [products, setProducts] = useState<PayerntProduct[]>([]);
  const [draftProduct, setDraftProduct] =
    useState<Partial<PayerntProduct> | null>(null);
  const [rentalRequests, setRentalRequests] =
    useState<RentalRequest[]>(INITIAL_REQUESTS);
  const [earningsTransactions, setEarningsTransactions] =
    useState<EarningTransaction[]>(INITIAL_EARNINGS);
  const [notifications, setNotifications] = useState<LenderNotification[]>(
    INITIAL_NOTIFICATIONS,
  );
  const [messages, setMessages] = useState<PayerntMessage[]>([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [profile, setProfile] = useState<LenderProfile>(INITIAL_PROFILE);

  // Authoritative Dashboard Synchronization States
  const [isLoadingDashboard, setIsLoadingDashboard] = useState<boolean>(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [backendDashboard, setBackendDashboard] = useState<any>(null);
  const [backendActivities, setBackendActivities] = useState<
    Array<{ id: string; title: string; timestamp: string; amount?: string }>
  >([]);

  // Login handler
  const login = useCallback((account: PayerntAccount) => {
    // 1. Enforce single active user-side session: Invalidate Payrent customer state
    try {
      localStorage.removeItem("payent:token");
      localStorage.removeItem("payent:currentUser");
      localStorage.removeItem("payent:refreshToken");
      localStorage.removeItem("pay₹ent_session");
      localStorage.removeItem("pay₹ent_account");
      localStorage.removeItem("payent_token");
      window.dispatchEvent(new CustomEvent("payent:storage_change"));
    } catch {}

    setActiveAccount(account);
    try {
      localStorage.setItem(
        STORAGE_KEY_SESSION,
        `session_${account.accountId || (account as any).id}_${Date.now()}`,
      );
      localStorage.setItem(STORAGE_KEY_ACCOUNT, JSON.stringify(account));
    } catch {}
    const aadhaarVal =
      account.aadhaarNumber ||
      (account as any).aadhaar_number ||
      (account as any).aadhaarMasked ||
      "";
    setProfile((prev) => ({
      ...prev,
      id: account.accountId || (account as any).id,
      accountId: account.accountId || (account as any).id,
      accountType: "paye₹nt",
      name: account.name,
      email: account.email,
      phone: account.phone,
      address: account.address,
      pincode: account.pincode,
      aadhaarMasked: aadhaarVal,
      avatar: account.profilePhotoUrl || account.avatar || prev.avatar,
      profilePhotoUrl:
        account.profilePhotoUrl ||
        account.profile_photo_url ||
        account.avatar ||
        prev.profilePhotoUrl ||
        "",
      profile_photo_url:
        account.profilePhotoUrl ||
        account.profile_photo_url ||
        account.avatar ||
        prev.profile_photo_url ||
        "",
    }));
    window.dispatchEvent(
      new CustomEvent("paye₹nt_auth_change", { detail: account }),
    );

    if (account.role === "admin" || (account as any).role === "superadmin") {
      const vendorToken =
        localStorage.getItem("paye₹nt_token") ||
        localStorage.getItem("payernt_token");
      if (vendorToken) {
        localStorage.setItem("payent:admin:token", vendorToken);
      }
      localStorage.setItem(
        "payent:admin:current_user",
        JSON.stringify({
          id: account.accountId || (account as any).id,
          fullName: account.name,
          email: account.email,
          role: "admin",
          status: "active",
          verified: true,
        }),
      );
      window.dispatchEvent(new Event("payent:admin:profile-updated"));
    }
  }, []);

  // Logout handler
  const logout = useCallback(() => {
    setActiveAccount(null);
    try {
      payerntApi.logout().catch(() => {});
      localStorage.removeItem("paye₹nt_token");
      localStorage.removeItem("payernt_token");
      localStorage.removeItem("paye₹nt_refresh_token");
      localStorage.removeItem("payernt_refresh_token");
      localStorage.removeItem(STORAGE_KEY_SESSION);
      localStorage.removeItem(STORAGE_KEY_ACCOUNT);
      localStorage.removeItem("payent:admin:token");
      localStorage.removeItem("payent:admin:current_user");
      localStorage.setItem("payent:signed_out", "true");
    } catch {}
    window.dispatchEvent(new Event("payent:admin:profile-updated"));
    window.dispatchEvent(
      new CustomEvent("paye₹nt_auth_change", { detail: null }),
    );
    window.dispatchEvent(new CustomEvent("payent:storage_change"));
  }, []);

  // Sync to localStorage and broadcast updates
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
    } catch {}
  }, [products]);

  useEffect(() => {
    try {
      const walletKey = activeAccount
        ? `paye₹nt_wallet_${activeAccount.accountId}`
        : STORAGE_KEY_WALLET;
      localStorage.setItem(walletKey, JSON.stringify(wallet));
    } catch {}
  }, [wallet, activeAccount]);

  useEffect(() => {
    try {
      if (draftProduct) {
        localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(draftProduct));
      } else {
        localStorage.removeItem(STORAGE_KEY_DRAFT);
      }
    } catch {}
  }, [draftProduct]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_REQUESTS,
        JSON.stringify(rentalRequests),
      );
    } catch {}
  }, [rentalRequests]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_EARNINGS,
        JSON.stringify(earningsTransactions),
      );
    } catch {}
  }, [earningsTransactions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
    } catch {}
  }, [profile]);

  // Listen to cross-component product sync events
  useEffect(() => {
    const handleSync = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_PRODUCTS);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setProducts(
              parsed
                .filter((p: any) => !isMockItem(p.id))
                .map(normalizePayerntProduct),
            );
          }
        }
      } catch {}
    };

    window.addEventListener("payent_products_updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("payent_products_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const inFlightDashboardRef = useRef<Promise<any> | null>(null);
  const inFlightBookingsRef = useRef<Promise<any> | null>(null);
  const inFlightProductsRef = useRef<Promise<any> | null>(null);
  const inFlightWalletRef = useRef<Promise<any> | null>(null);
  const inFlightNotifsRef = useRef<Promise<any> | null>(null);
  const inFlightMessagesRef = useRef<Promise<any> | null>(null);
  const lastDashboardFetchRef = useRef<number>(0);
  const lastBookingsFetchRef = useRef<number>(0);
  const lastProductsFetchRef = useRef<number>(0);
  const lastWalletFetchRef = useRef<number>(0);
  const lastNotifsFetchRef = useRef<number>(0);
  const lastMessagesFetchRef = useRef<number>(0);
  const CACHE_TTL_MS = 15000;

  const mapRawBookingToRentalRequest = useCallback((b: any): RentalRequest => {
    const daily = Number(b.amount || b.daily_rate || b.dailyRate || 500);
    const rawStatus = String(b.status || b.bookingStatus || "")
      .toLowerCase()
      .trim();
    let parsedStatus: RentalRequestStatus = "approved";
    if (
      b.cancellation ||
      b.cancelled_at ||
      b.cancelledAt ||
      rawStatus === "cancelled" ||
      rawStatus === "canceled"
    ) {
      parsedStatus = "cancelled";
    } else if (rawStatus === "order confirmed" || rawStatus === "confirmed") {
      parsedStatus = "confirmed";
    } else if (
      rawStatus === "pending" ||
      rawStatus === "requested" ||
      rawStatus === "submitted" ||
      rawStatus === "security_pending"
    ) {
      parsedStatus = "pending";
    } else if (
      rawStatus === "ready for pickup" ||
      rawStatus === "ready_for_pickup"
    ) {
      parsedStatus = "ready_for_pickup";
    } else if (rawStatus === "picked up" || rawStatus === "picked_up") {
      parsedStatus = "picked_up";
    } else if (
      rawStatus === "rental in progress" ||
      rawStatus === "rental_in_progress" ||
      rawStatus === "active" ||
      b.rentalStarted
    ) {
      parsedStatus = "active";
    } else if (
      rawStatus === "return initiated" ||
      rawStatus === "return_initiated"
    ) {
      parsedStatus = "return_initiated";
    } else if (
      rawStatus === "item handed back to owner" ||
      rawStatus === "handed_back" ||
      rawStatus === "handed back"
    ) {
      parsedStatus = "handed_back";
    } else if (
      rawStatus === "awaiting owner inspection" ||
      rawStatus === "awaiting_inspection" ||
      rawStatus === "inspection"
    ) {
      parsedStatus = "awaiting_inspection";
    } else if (
      rawStatus === "rental completed" ||
      rawStatus === "completed" ||
      rawStatus === "returned"
    ) {
      parsedStatus = "completed";
    } else if (rawStatus === "rejected" || rawStatus === "declined") {
      parsedStatus = "rejected";
    } else if (rawStatus === "handover") {
      parsedStatus = "handover";
    } else if (rawStatus === "accepted") {
      parsedStatus = "accepted";
    } else {
      parsedStatus = (b.status || "approved") as RentalRequestStatus;
    }

    return {
      id: b.bookingId || b.id,
      productId: b.productId,
      productTitle: b.productTitle || "Tech Gear",
      productImage: b.productImage || "",
      category: b.category || "Tech Gear",
      renter: {
        name:
          b.renterName ||
          (b.renterEmail ? b.renterEmail.split("@")[0] : "Verified Renter"),
        avatar: "",
        profilePhotoUrl: "",
        profile_photo_url: "",
        rating: 5.0,
        completedRentals: 1,
        phone: "",
        email: b.renterEmail || "",
        city: "",
      },
      startDate: b.startDate || "",
      endDate: b.endDate || "",
      totalDays: 3,
      dailyRate: daily,
      grossRental: daily * 3,
      platformFee: 0,
      netEarnings: daily * 3,
      securityDeposit: 0,
      cancellation:
        b.cancellation ||
        (b.cancellationReason
          ? {
              reasonCode: b.cancellationReason,
              reason: b.cancellationReason,
              feedback: b.cancellationFeedback,
              cancelledAt: b.cancelledAt,
              cancelledBy: b.cancelledBy,
            }
          : undefined),
      status: parsedStatus,
      requestDate:
        b.createdAt || b.created_at || b.requestDate || b.request_date || "",
      createdAt:
        b.createdAt || b.created_at || b.requestDate || b.request_date || "",
      created_at:
        b.created_at || b.createdAt || b.requestDate || b.request_date || "",
      paymentStatus:
        parsedStatus === "completed" ? "settled_to_lender" : "paid_to_escrow",
      confirmedAt:
        b.confirmedAt || b.confirmed_at || b.createdAt || b.created_at,
      readyForPickupAt: b.readyForPickupAt || b.ready_for_pickup_at,
      pickedUpAt: b.pickedUpAt || b.picked_up_at,
      returnInitiatedAt: b.returnInitiatedAt || b.return_initiated_at,
      handedBackAt: b.handedBackAt || b.handed_back_at,
      awaitingInspectionAt: b.awaitingInspectionAt || b.awaiting_inspection_at,
      completedAt: b.completedAt || b.completed_at,
      queueNotes: b.queueNotes || b.queue_notes,
      deliveryMethod: b.deliveryMethod || b.delivery_method || "delivery",
      deliveryAddress: b.deliveryAddress || b.delivery_address || "",
      pickupLocation: b.pickupLocation || b.pickup_location || "",
      customLocation: b.customLocation || b.custom_location || "",
      locationDirections: b.locationDirections || b.location_directions || "",
      latitude: b.latitude ?? b.location_latitude ?? null,
      longitude: b.longitude ?? b.location_longitude ?? null,
      mapUrl:
        b.mapUrl ||
        b.map_url ||
        (b.latitude && b.longitude
          ? `https://www.google.com/maps/search/?api=1&query=${b.latitude},${b.longitude}`
          : b.deliveryAddress
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.deliveryAddress)}`
            : ""),
      locationChangeRequest:
        b.locationChangeRequest || b.location_change_request || null,
    };
  }, []);

  const fetchBookings = useCallback(
    async (force: boolean = false) => {
      const token = getStoredToken();
      let currentAcc = activeAccount || getRehydratedAccount();
      if (!currentAcc && token) {
        currentAcc = getRehydratedAccount();
        if (currentAcc) setActiveAccount(currentAcc);
      }
      if (!token) {
        setIsLoadingBookings(false);
        setBookingsError(
          "Authentication required. Please sign in to view your bookings.",
        );
        return;
      }
      if (!force && Date.now() - lastBookingsFetchRef.current < CACHE_TTL_MS)
        return;
      if (inFlightBookingsRef.current && !force)
        return inFlightBookingsRef.current;

      setIsLoadingBookings(true);
      setBookingsError(null);

      const promise = (async () => {
        try {
          const bookingsRes = await payerntApi.getBookings(50);
          lastBookingsFetchRef.current = Date.now();
          if (bookingsRes.success && Array.isArray(bookingsRes.bookings)) {
            const mapped = bookingsRes.bookings.map(
              mapRawBookingToRentalRequest,
            );
            setRentalRequests(mapped);
            setBookingsError(null);
          } else {
            const errMsg =
              bookingsRes.error || "Failed to load bookings from server.";
            setBookingsError(errMsg);
          }
        } catch (err: any) {
          console.warn("[paye₹nt Store] fetchBookings error:", err);
          setBookingsError(
            err?.message || "Failed to load bookings from server.",
          );
        } finally {
          setIsLoadingBookings(false);
          inFlightBookingsRef.current = null;
        }
      })();
      inFlightBookingsRef.current = promise;
      return promise;
    },
    [activeAccount, mapRawBookingToRentalRequest],
  );

  const fetchProducts = useCallback(
    async (force: boolean = false) => {
      if (!activeAccount || !isAuthenticated) return;
      if (!force && Date.now() - lastProductsFetchRef.current < CACHE_TTL_MS)
        return;
      if (inFlightProductsRef.current && !force)
        return inFlightProductsRef.current;
      const promise = (async () => {
        try {
          const prodRes = await payerntApi.getProducts();
          lastProductsFetchRef.current = Date.now();
          if (prodRes.success && Array.isArray(prodRes.products)) {
            setProducts(
              prodRes.products
                .filter((p) => !isMockItem(p.id))
                .map(normalizePayerntProduct),
            );
          }
        } catch (err) {
          console.warn("[paye₹nt Store] fetchProducts error:", err);
        } finally {
          inFlightProductsRef.current = null;
        }
      })();
      inFlightProductsRef.current = promise;
      return promise;
    },
    [activeAccount, isAuthenticated],
  );

  const fetchWallet = useCallback(
    async (force: boolean = false) => {
      if (!activeAccount || !isAuthenticated) return;
      if (!force && Date.now() - lastWalletFetchRef.current < CACHE_TTL_MS)
        return;
      if (inFlightWalletRef.current && !force) return inFlightWalletRef.current;
      const promise = (async () => {
        try {
          const walletRes = await payerntApi.getWallet();
          lastWalletFetchRef.current = Date.now();
          if (walletRes.success && walletRes.wallet) {
            const w = walletRes.wallet as any;
            setWallet((prev) => ({
              ...prev,
              availableBalance: Number(
                w.available_balance ??
                  w.availableBalance ??
                  prev.availableBalance,
              ),
              pendingBalance: Number(
                w.pending_amount ?? w.pendingBalance ?? prev.pendingBalance,
              ),
              totalReceived: Number(
                w.total_received ?? w.totalReceived ?? prev.totalReceived,
              ),
              totalWithdrawn: Number(
                w.total_withdrawn ?? w.totalWithdrawn ?? prev.totalWithdrawn,
              ),
              bankAccounts: Array.isArray(walletRes.bankAccounts)
                ? (walletRes.bankAccounts as any).filter(
                    (b: any) => !b.id?.startsWith("bank-00"),
                  )
                : prev.bankAccounts,
              transactions: Array.isArray(walletRes.transactions)
                ? (walletRes.transactions as any).filter(
                    (t: any) => !t.id?.startsWith("wtx-00"),
                  )
                : prev.transactions,
            }));
          }
        } catch (err) {
          console.warn("[paye₹nt Store] fetchWallet error:", err);
        } finally {
          inFlightWalletRef.current = null;
        }
      })();
      inFlightWalletRef.current = promise;
      return promise;
    },
    [activeAccount, isAuthenticated],
  );

  const fetchNotifications = useCallback(
    async (force: boolean = false) => {
      if (!activeAccount || !isAuthenticated) return;
      if (!force && Date.now() - lastNotifsFetchRef.current < CACHE_TTL_MS)
        return;
      if (inFlightNotifsRef.current && !force) return inFlightNotifsRef.current;
      const promise = (async () => {
        try {
          const notifRes = await payerntApi.getNotifications();
          lastNotifsFetchRef.current = Date.now();
          if (notifRes.success && Array.isArray(notifRes.notifications)) {
            setNotifications(
              notifRes.notifications.filter((n) => n.id !== "notif-1"),
            );
          }
        } catch (err) {
          console.warn("[paye₹nt Store] fetchNotifications error:", err);
        } finally {
          inFlightNotifsRef.current = null;
        }
      })();
      inFlightNotifsRef.current = promise;
      return promise;
    },
    [activeAccount, isAuthenticated],
  );

  const fetchMessages = useCallback(
    async (productId?: string, force: boolean = false) => {
      if (!activeAccount?.accountId) return;
      if (
        !force &&
        !productId &&
        Date.now() - lastMessagesFetchRef.current < CACHE_TTL_MS
      )
        return;
      if (inFlightMessagesRef.current && !force)
        return inFlightMessagesRef.current;
      const promise = (async () => {
        try {
          const res = await payerntApi.getMessages(productId);
          if (!productId) lastMessagesFetchRef.current = Date.now();
          if (res.success && Array.isArray(res.messages)) {
            setMessages(res.messages);
            const count =
              res.unreadCount ??
              res.messages.filter((m: any) => !m.read && !m.is_read).length;
            setUnreadMessagesCount(count);
            try {
              localStorage.setItem(
                STORAGE_KEY_MESSAGES,
                JSON.stringify(res.messages),
              );
            } catch {}
          }
        } catch (err) {
          console.warn("[paye₹nt Store] fetchMessages error:", err);
        } finally {
          inFlightMessagesRef.current = null;
        }
      })();
      inFlightMessagesRef.current = promise;
      return promise;
    },
    [activeAccount?.accountId],
  );

  // Authoritative real paye₹nt backend synchronization
  const refreshDashboard = useCallback(
    async (forceFull: boolean = false) => {
      if (!activeAccount || !isAuthenticated) return;
      if (inFlightDashboardRef.current && !forceFull) {
        return inFlightDashboardRef.current;
      }

      setIsLoadingDashboard(true);
      setDashboardError(null);

      const promise = (async () => {
        try {
          const dashRes = await payerntApi.getDashboard();
          lastDashboardFetchRef.current = Date.now();

          if (dashRes.success && dashRes.dashboard) {
            const d = dashRes.dashboard;
            setBackendDashboard(d);

            // Update wallet balances from dashboard aggregation
            if (d.wallet) {
              setWallet((prev) => ({
                ...prev,
                availableBalance: Number(
                  d.wallet.availableBalance ?? prev.availableBalance,
                ),
                pendingBalance: Number(
                  d.wallet.pendingAmount ?? prev.pendingBalance,
                ),
                totalReceived: Number(
                  d.wallet.totalReceived ?? prev.totalReceived,
                ),
                totalWithdrawn: Number(
                  d.wallet.totalWithdrawn ?? prev.totalWithdrawn,
                ),
              }));
            }

            // Update recent activities
            if (
              Array.isArray(d.recentActivity) &&
              d.recentActivity.length > 0
            ) {
              setBackendActivities(
                d.recentActivity.map((act: any) => ({
                  id: act.id,
                  title: act.title,
                  timestamp: act.timestamp
                    ? new Date(act.timestamp).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })
                    : "Recent",
                  amount: act.amount,
                })),
              );
            }

            // Update products preview if returned
            if (Array.isArray(d.products) && d.products.length > 0) {
              setProducts((prev) => {
                const fetched = d.products
                  .filter((p: any) => !isMockItem(p.id))
                  .map(normalizePayerntProduct);
                const map = new Map<string, PayerntProduct>();
                prev.forEach((p) => map.set(p.id, p));
                fetched.forEach((p: any) =>
                  map.set(p.id, { ...map.get(p.id), ...p }),
                );
                return Array.from(map.values());
              });
            }

            // Update upcoming bookings preview if present
            if (Array.isArray(d.bookings) && d.bookings.length > 0) {
              setRentalRequests((prev) => {
                const mapped = d.bookings.map(mapRawBookingToRentalRequest);
                const map = new Map<string, RentalRequest>();
                prev.forEach((r) => map.set(r.id, r));
                mapped.forEach((r: RentalRequest) => {
                  const existing = map.get(r.id);
                  map.set(r.id, existing ? { ...existing, ...r } : r);
                });
                return Array.from(map.values());
              });
            }

            // Update messages unread count
            if (d.messages?.unread !== undefined) {
              setUnreadMessagesCount(d.messages.unread);
            }
          } else if (dashRes.error) {
            const errorStr =
              typeof dashRes.error === "string"
                ? dashRes.error
                : JSON.stringify(dashRes.error);
            const errLower = errorStr.toLowerCase();
            if (
              errLower.includes("401") ||
              errLower.includes("expired") ||
              errLower.includes("unauthorized") ||
              errLower.includes("revoked") ||
              errLower.includes("forbidden") ||
              errLower.includes("session expired") ||
              errLower.includes("authorization")
            ) {
              setActiveAccount(null);
              setIsLoadingDashboard(false);
              return;
            }
            setDashboardError(errorStr);
          }

          // Always refresh notifications with dashboard
          fetchNotifications(forceFull).catch(() => {});

          if (forceFull) {
            await Promise.allSettled([
              fetchBookings(true),
              fetchProducts(true),
              fetchWallet(true),
              fetchMessages(),
            ]);
          }
        } catch (e: any) {
          console.warn("[paye₹nt Store] Dashboard refresh error:", e);
          setDashboardError(e?.message || "Failed to synchronize with server.");
        } finally {
          setIsLoadingDashboard(false);
          inFlightDashboardRef.current = null;
        }
      })();

      inFlightDashboardRef.current = promise;
      return promise;
    },
    [
      activeAccount,
      isAuthenticated,
      mapRawBookingToRentalRequest,
      fetchBookings,
      fetchProducts,
      fetchWallet,
      fetchNotifications,
      fetchMessages,
    ],
  );

  // Sync real paye₹nt backend state upon authentication and listen for refresh events
  useEffect(() => {
    if (!activeAccount || !isAuthenticated) return;
    refreshDashboard();
    fetchNotifications(true);

    const handleRefresh = () => {
      refreshDashboard();
      fetchNotifications(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const elapsed = Date.now() - lastDashboardFetchRef.current;
        if (elapsed > 15000) {
          refreshDashboard();
          fetchNotifications(true);
        }
      }
    };

    const handleBookingUpdate = (e: any) => {
      const bId = e?.detail?.bookingId || e?.detail?.id;
      const newStatus = e?.detail?.status;
      if (bId && newStatus) {
        setRentalRequests((prev) =>
          prev.map((r) =>
            r.id === bId || (r as any).bookingId === bId
              ? { ...r, status: newStatus as any }
              : r,
          ),
        );
      }
      refreshDashboard(true);
      fetchBookings(true);
      fetchNotifications(true);
    };

    window.addEventListener("paye₹nt_data_refresh", handleRefresh);
    window.addEventListener("payernt_data_refresh", handleRefresh);
    window.addEventListener("payent_orders_updated", handleBookingUpdate);
    window.addEventListener("payent_queue_updated", handleBookingUpdate);
    window.addEventListener("payent_booking_updated", handleBookingUpdate);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const pollInterval = setInterval(() => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "visible"
      ) {
        refreshDashboard(false);
        fetchBookings(true);
        fetchNotifications(true);
      }
    }, 15000);

    return () => {
      window.removeEventListener("paye₹nt_data_refresh", handleRefresh);
      window.removeEventListener("payernt_data_refresh", handleRefresh);
      window.removeEventListener("payent_orders_updated", handleBookingUpdate);
      window.removeEventListener("payent_queue_updated", handleBookingUpdate);
      window.removeEventListener("payent_booking_updated", handleBookingUpdate);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(pollInterval);
    };
  }, [activeAccount, isAuthenticated, refreshDashboard]);

  const switchDemoUser = (userId: string) => {
    const found = DEMO_USERS.find((u) => u.id === userId);
    if (!found) return;
    setActiveUserId(userId);
    setProfile((prev) => ({
      ...prev,
      id: found.id,
      name: found.fullName || found.name,
      email: found.email,
      phone: found.phone,
      avatar: found.profilePhotoUrl || found.avatar || "",
      profilePhotoUrl:
        found.profilePhotoUrl || found.profile_photo_url || found.avatar || "",
      profile_photo_url:
        found.profilePhotoUrl || found.profile_photo_url || found.avatar || "",
      city: found.city,
    }));
    window.dispatchEvent(
      new CustomEvent("payent_user_changed", { detail: found }),
    );
    window.dispatchEvent(new CustomEvent("payent_products_updated"));
  };

  // Actions
  const addProduct = (newProduct: PayerntProduct) => {
    const ownerId = activeAccount?.accountId || activeUser.id;
    const ownerName =
      activeAccount?.name || activeUser.fullName || activeUser.name;
    const ownerEmail = activeAccount?.email || activeUser.email;
    const ownerAvatar =
      activeAccount?.profilePhotoUrl ||
      activeAccount?.profile_photo_url ||
      activeAccount?.avatar ||
      activeUser.profilePhotoUrl ||
      activeUser.profile_photo_url ||
      activeUser.avatar ||
      "";

    const finalized: PayerntProduct = {
      ...newProduct,
      ownerId,
      ownerAccountType: "paye₹nt",
      vendorSecretPin:
        newProduct.vendorSecretPin ||
        Math.floor(1000 + Math.random() * 9000).toString(),
      owner: {
        id: ownerId,
        name: ownerName,
        fullName: ownerName,
        email: ownerEmail,
        avatar: ownerAvatar,
        profilePhotoUrl: ownerAvatar,
        profile_photo_url: ownerAvatar,
        rating: 5.0,
      },
      verificationStatus: "under_review",
      status: "under_review",
      availabilityStatus: "paused",
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setProducts((prev) => {
      const nextList = [finalized, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(nextList));
      } catch {}
      return nextList;
    });

    setDraftProduct(null);

    // Call real paye₹nt backend if not already saved during wizard completion
    if (!(newProduct as any)._alreadySavedOnBackend) {
      payerntApi.createProduct(finalized).catch((err) => {
        console.warn("[paye₹nt Backend] Listing sync warning:", err);
      });
    }

    // Refresh real backend data immediately
    setTimeout(() => {
      refreshDashboard().catch(() => {});
    }, 100);

    // Trigger notification
    const newNotif: LenderNotification = {
      id: `notif-${Date.now()}`,
      title: "Product Submitted for Admin Review ⏳",
      message: `"${finalized.title}" is now Under Admin Review.`,
      type: "info",
      timestamp: "Just now",
      read: false,
      actionRoute: "products",
    };
    setNotifications((prev) => [newNotif, ...prev]);

    window.dispatchEvent(new CustomEvent("payent_products_updated"));
  };

  const saveDraft = (draft: Partial<PayerntProduct>) => {
    setDraftProduct(draft);
  };

  const clearDraft = () => {
    setDraftProduct(null);
  };

  const updateProduct = async (
    id: string,
    updates: Partial<PayerntProduct>,
  ): Promise<{
    success: boolean;
    product?: PayerntProduct;
    error?: string;
  }> => {
    try {
      const res = await payerntApi.updateProduct(id, updates);
      if (res.success && res.product) {
        const canonical = normalizePayerntProduct(res.product);
        setProducts((prev) => {
          const nextList = prev.map((p) => (p.id === id ? canonical : p));
          try {
            localStorage.setItem(
              STORAGE_KEY_PRODUCTS,
              JSON.stringify(nextList),
            );
          } catch {}
          return nextList;
        });
        lastProductsFetchRef.current = 0;
        lastDashboardFetchRef.current = 0;
        window.dispatchEvent(new CustomEvent("payent_products_updated"));
        return { success: true, product: canonical };
      }
      return {
        success: false,
        error: res.error || "Failed to update product.",
      };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || "Network error while updating product.",
      };
    }
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => {
      const nextList = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(nextList));
      } catch {}
      return nextList;
    });
    lastProductsFetchRef.current = 0;
    lastDashboardFetchRef.current = 0;
    payerntApi
      .deleteProduct(id)
      .catch((e) => console.warn("[paye₹nt Backend] deleteProduct sync:", e));
    window.dispatchEvent(new CustomEvent("payent_products_updated"));
  };

  const toggleAvailability = (id: string) => {
    let nextStatus: ProductAvailability = "available";
    setProducts((prev) => {
      const nextList = prev.map((p) => {
        if (p.id !== id) return p;
        nextStatus =
          p.availabilityStatus === "available" ? "paused" : "available";
        return {
          ...p,
          availabilityStatus: nextStatus,
          updatedAt: new Date().toISOString(),
        };
      });
      try {
        localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(nextList));
      } catch {}
      return nextList;
    });
    lastProductsFetchRef.current = 0;
    lastDashboardFetchRef.current = 0;
    payerntApi
      .updateProductStatus(id, "active", nextStatus)
      .catch((e) =>
        console.warn("[paye₹nt Backend] toggleAvailability sync:", e),
      );
    window.dispatchEvent(new CustomEvent("payent_products_updated"));
  };

  // Admin Review / Approval Actions
  const adminApproveProduct = useCallback(
    (id: string) => {
      setProducts((prev) => {
        const nextList = prev.map((p) => {
          if (p.id !== id) return p;
          return {
            ...p,
            verificationStatus: "approved" as VerificationStatus,
            status: "approved",
            availabilityStatus: "available" as ProductAvailability,
            reviewedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        });
        try {
          localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(nextList));
        } catch {}
        return nextList;
      });

      const product = products.find((p) => p.id === id);
      const notif: LenderNotification = {
        id: `notif-${Date.now()}`,
        title: "Product Approved by Admin! 🎉",
        message: `"${product?.title || "Your gear"}" has been approved and is now live on Explore.`,
        type: "success",
        timestamp: "Just now",
        read: false,
        actionRoute: "products",
      };
      setNotifications((prev) => [notif, ...prev]);
      window.dispatchEvent(new CustomEvent("payent_products_updated"));
    },
    [products],
  );

  const adminRejectProduct = useCallback(
    (id: string, notes?: string) => {
      setProducts((prev) => {
        const nextList = prev.map((p) => {
          if (p.id !== id) return p;
          return {
            ...p,
            verificationStatus: "rejected" as VerificationStatus,
            status: "rejected",
            verificationNotes:
              notes || "Listing did not meet platform safety requirements.",
            availabilityStatus: "paused" as ProductAvailability,
            reviewedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        });
        try {
          localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(nextList));
        } catch {}
        return nextList;
      });

      const product = products.find((p) => p.id === id);
      const notif: LenderNotification = {
        id: `notif-${Date.now()}`,
        title: "Product Listing Rejected ❌",
        message: `"${product?.title || "Your gear"}" was rejected by Admin.`,
        type: "alert",
        timestamp: "Just now",
        read: false,
        actionRoute: "products",
      };
      setNotifications((prev) => [notif, ...prev]);
      window.dispatchEvent(new CustomEvent("payent_products_updated"));
    },
    [products],
  );

  const adminRequestCorrection = useCallback(
    (id: string, notes?: string) => {
      setProducts((prev) => {
        const nextList = prev.map((p) => {
          if (p.id !== id) return p;
          return {
            ...p,
            verificationStatus: "needs_correction" as VerificationStatus,
            status: "needs_correction",
            verificationNotes:
              notes || "Please update product serial number photo and details.",
            availabilityStatus: "paused" as ProductAvailability,
            reviewedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        });
        try {
          localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(nextList));
        } catch {}
        return nextList;
      });

      const product = products.find((p) => p.id === id);
      const notif: LenderNotification = {
        id: `notif-${Date.now()}`,
        title: "Correction Requested by Admin ⚠️",
        message: `Admin requested corrections for "${product?.title || "Your gear"}".`,
        type: "warning",
        timestamp: "Just now",
        read: false,
        actionRoute: "products",
      };
      setNotifications((prev) => [notif, ...prev]);
      window.dispatchEvent(new CustomEvent("payent_products_updated"));
    },
    [products],
  );

  const simulateVerificationChange = (
    id: string,
    status: VerificationStatus,
    notes?: string,
  ) => {
    if (status === "approved" || status === "verified") {
      adminApproveProduct(id);
    } else if (status === "rejected") {
      adminRejectProduct(id, notes);
    } else if (status === "needs_correction") {
      adminRequestCorrection(id, notes);
    } else {
      setProducts((prev) => {
        const nextList: PayerntProduct[] = prev.map((p) => {
          if (p.id !== id) return p;
          return {
            ...p,
            verificationStatus: status,
            status: status,
            verificationNotes: notes,
            availabilityStatus: "paused" as ProductAvailability,
            updatedAt: new Date().toISOString(),
          };
        });
        try {
          localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(nextList));
        } catch {}
        return nextList;
      });
      window.dispatchEvent(new CustomEvent("payent_products_updated"));
    }
  };

  // Rental Request Actions
  const handleRequestAction = async (
    requestId: string,
    action: "accept" | "reject" | "cancel",
    reason?: string,
    feedback?: string,
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      let res;
      if (action === "accept") {
        res = await payerntApi.acceptBooking(requestId);
      } else if (action === "cancel") {
        res = await payerntApi.cancelBooking(
          requestId,
          reason || "NO_LONGER_AVAILABLE",
          feedback,
        );
      } else {
        res = await payerntApi.rejectBooking(requestId, reason, feedback);
      }

      if (!res.success) {
        return {
          success: false,
          error: res.error || `Failed to ${action} booking.`,
        };
      }

      const nextStatus =
        action === "accept"
          ? "accepted"
          : action === "cancel"
            ? "cancelled"
            : "rejected";

      setRentalRequests((prev) =>
        prev.map((req) => {
          if (req.id !== requestId) return req;
          return {
            ...req,
            status: nextStatus as any,
          };
        }),
      );

      // Invalidate cache and sync with backend
      lastBookingsFetchRef.current = 0;
      lastDashboardFetchRef.current = 0;
      fetchBookings(true).catch(() => {});
      fetchNotifications(true).catch(() => {});

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("payent_orders_updated"));
        window.dispatchEvent(new CustomEvent("payent_booking_updated"));
        window.dispatchEvent(
          new CustomEvent("payent_queue_updated", {
            detail: { bookingId: requestId, status: nextStatus },
          }),
        );
      }

      const req = rentalRequests.find((r) => r.id === requestId);
      const notif: LenderNotification = {
        id: `notif-${Date.now()}`,
        title:
          action === "accept"
            ? "Rental Request Accepted ✅"
            : action === "cancel"
              ? "Booking Cancelled ⚠️"
              : "Rental Request Declined ❌",
        message:
          action === "cancel"
            ? `You cancelled ${req?.renter?.name || "renter"}'s booking for "${req?.productTitle || "gear"}".`
            : `You ${action}ed ${req?.renter?.name || "renter"}'s booking for "${req?.productTitle || "gear"}".`,
        type: action === "accept" ? "success" : "info",
        timestamp: "Just now",
        read: false,
        actionRoute: "requests",
      };
      setNotifications((prev) => [notif, ...prev]);

      return {
        success: true,
        message: res.message || `Booking ${nextStatus} successfully.`,
      };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || `Unexpected error while processing ${action}.`,
      };
    }
  };
  // Step Rental Lifecycle
  const advanceRentalLifecycle = (
    requestId: string,
    nextStatus: RentalRequestStatus,
  ) => {
    const nowIso = new Date().toISOString();
    lastBookingsFetchRef.current = 0;
    lastDashboardFetchRef.current = 0;
    setRentalRequests((prev) =>
      prev.map((req) => {
        if (req.id !== requestId) return req;
        const updated: RentalRequest = { ...req, status: nextStatus };
        if (nextStatus === "ready_for_pickup")
          updated.readyForPickupAt = updated.readyForPickupAt || nowIso;
        if (nextStatus === "picked_up" || nextStatus === "active")
          updated.pickedUpAt = updated.pickedUpAt || nowIso;
        if (nextStatus === "return_initiated")
          updated.returnInitiatedAt = updated.returnInitiatedAt || nowIso;
        if (nextStatus === "handed_back") {
          updated.handedBackAt = updated.handedBackAt || nowIso;
          updated.awaitingInspectionAt = updated.awaitingInspectionAt || nowIso;
        }
        if (nextStatus === "awaiting_inspection")
          updated.awaitingInspectionAt = updated.awaitingInspectionAt || nowIso;
        if (nextStatus === "completed") {
          updated.paymentStatus = "settled_to_lender";
          updated.completedAt = updated.completedAt || nowIso;
        }
        return updated;
      }),
    );

    // Asynchronously synchronize with backend datastore
    payerntApi
      .advanceRentalQueue(requestId, nextStatus)
      .then((res) => {
        if (res.success && res.all_timestamps) {
          setRentalRequests((prev) =>
            prev.map((r) => {
              if (r.id !== requestId) return r;
              return {
                ...r,
                confirmedAt: res.all_timestamps?.confirmed_at || r.confirmedAt,
                readyForPickupAt:
                  res.all_timestamps?.ready_for_pickup_at || r.readyForPickupAt,
                pickedUpAt: res.all_timestamps?.picked_up_at || r.pickedUpAt,
                returnInitiatedAt:
                  res.all_timestamps?.return_initiated_at ||
                  r.returnInitiatedAt,
                handedBackAt:
                  res.all_timestamps?.handed_back_at || r.handedBackAt,
                awaitingInspectionAt:
                  res.all_timestamps?.awaiting_inspection_at ||
                  r.awaitingInspectionAt,
                completedAt: res.all_timestamps?.completed_at || r.completedAt,
              };
            }),
          );
        }
      })
      .catch((err) => {
        console.warn("Backend rental queue sync notice:", err);
      });

    const req = rentalRequests.find((r) => r.id === requestId);
    if (!req) return;

    if (nextStatus === "completed") {
      const newTx: EarningTransaction = {
        id: `tx-${Date.now()}`,
        orderId: `ord-${req.id}`,
        productId: req.productId,
        productTitle: req.productTitle,
        productImage: req.productImage,
        renterName: req.renter.name,
        rentalPeriod: `${req.startDate} – ${req.endDate}`,
        rentalDays: req.totalDays,
        grossRental: req.grossRental,
        platformFee: req.platformFee,
        netPayout: req.netEarnings,
        securityDeposit: 0,
        depositStatus: "refunded_to_renter",
        payoutStatus: "settled",
        payoutDate: new Date().toISOString(),
        payoutMethod: `UPI (${profile.payoutUpi})`,
      };
      setEarningsTransactions((prev) => [newTx, ...prev]);

      setProducts((prev) =>
        prev.map((p) =>
          p.id === req.productId
            ? {
                ...p,
                totalRentalsCount: p.totalRentalsCount + 1,
                totalEarningsGenerated:
                  p.totalEarningsGenerated + req.netEarnings,
                availabilityStatus: "available",
              }
            : p,
        ),
      );

      setProfile((prev) => ({
        ...prev,
        lifetimeEarnings: prev.lifetimeEarnings + req.netEarnings,
      }));

      const notif: LenderNotification = {
        id: `notif-${Date.now()}`,
        title: `Rental Completed! ₹${req.netEarnings.toLocaleString("en-IN")} Added 💰`,
        message: `Rental with ${req.renter.name} for "${req.productTitle}" is complete and payout settled.`,
        type: "success",
        timestamp: "Just now",
        read: false,
        actionRoute: "earnings",
      };
      setNotifications((prev) => [notif, ...prev]);
    } else if (nextStatus === "active") {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === req.productId ? { ...p, availabilityStatus: "rented" } : p,
        ),
      );
    }
  };

  // Approve Renter's Location Change Request
  const approveLocationChange = async (bookingId: string) => {
    try {
      const res = await payerntApi.approveLocationChange(bookingId);
      if (res.success) {
        setRentalRequests((prev) =>
          prev.map((req) => {
            if (req.id !== bookingId) return req;
            const changeReq = req.locationChangeRequest;
            const updated: RentalRequest = {
              ...req,
              deliveryMethod: changeReq?.deliveryMethod || req.deliveryMethod,
              deliveryAddress:
                changeReq?.deliveryAddress !== undefined
                  ? changeReq.deliveryAddress
                  : req.deliveryAddress,
              pickupLocation:
                changeReq?.pickupLocation !== undefined
                  ? changeReq.pickupLocation
                  : req.pickupLocation,
              customLocation:
                changeReq?.customLocation !== undefined
                  ? changeReq.customLocation
                  : req.customLocation,
              locationDirections:
                changeReq?.locationDirections !== undefined
                  ? changeReq.locationDirections
                  : req.locationDirections,
              latitude:
                changeReq?.latitude !== undefined
                  ? changeReq.latitude
                  : req.latitude,
              longitude:
                changeReq?.longitude !== undefined
                  ? changeReq.longitude
                  : req.longitude,
              mapUrl: changeReq?.deliveryAddress
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(changeReq.deliveryAddress)}`
                : req.mapUrl,
              locationChangeRequest: null,
            };
            return updated;
          }),
        );
        const notif: LenderNotification = {
          id: `notif-${Date.now()}`,
          title: "Location Change Approved",
          message: `You approved the new booking location for order #${bookingId}.`,
          type: "success",
          timestamp: "Just now",
          read: false,
          actionRoute: "requests",
        };
        setNotifications((prev) => [notif, ...prev]);
        return { success: true };
      }
      return { success: false, message: res.message };
    } catch (e: any) {
      return {
        success: false,
        message: e?.message || "Failed to approve location change.",
      };
    }
  };

  // Reject Renter's Location Change Request
  const rejectLocationChange = async (bookingId: string, feedback?: string) => {
    try {
      const res = await payerntApi.rejectLocationChange(bookingId, feedback);
      if (res.success) {
        setRentalRequests((prev) =>
          prev.map((req) => {
            if (req.id !== bookingId) return req;
            return {
              ...req,
              locationChangeRequest: req.locationChangeRequest
                ? {
                    ...req.locationChangeRequest,
                    status: "rejected",
                    rejectionReason: feedback || "Declined by lender",
                  }
                : null,
            };
          }),
        );
        const notif: LenderNotification = {
          id: `notif-${Date.now()}`,
          title: "Location Change Declined",
          message: `You declined the location change request for order #${bookingId}.`,
          type: "info",
          timestamp: "Just now",
          read: false,
          actionRoute: "requests",
        };
        setNotifications((prev) => [notif, ...prev]);
        return { success: true };
      }
      return { success: false, message: res.message };
    } catch (e: any) {
      return {
        success: false,
        message: e?.message || "Failed to reject location change.",
      };
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(`wallet_${activeUserId}`, JSON.stringify(wallet));
    } catch {}
  }, [wallet, activeUserId]);

  const requestWithdrawal = (
    amount: number,
    bankAccountId: string,
  ): boolean => {
    if (amount <= 0 || amount > wallet.availableBalance) {
      return false;
    }
    const targetBank =
      wallet.bankAccounts.find((b) => b.id === bankAccountId) ||
      wallet.bankAccounts[0];

    const newTx: WalletTransaction = {
      id: `wtx-${Date.now()}`,
      userId: activeUser.id,
      type: "WITHDRAWAL",
      amount,
      description: "Bank Withdrawal Transfer",
      date: new Date().toISOString(),
      status: "Processing",
      bankAccountMasked: targetBank
        ? targetBank.maskedAccountNumber
        : "XXXX XXXX 4582",
    };

    setWallet((prev) => ({
      ...prev,
      availableBalance: prev.availableBalance - amount,
      totalWithdrawn: prev.totalWithdrawn + amount,
      transactions: [newTx, ...prev.transactions],
    }));

    // Call real paye₹nt backend
    payerntApi.withdraw(amount, targetBank?.id || "bank-001").catch((err) => {
      console.warn("[paye₹nt Backend] Withdrawal sync notice:", err);
    });

    const notif: LenderNotification = {
      id: `notif-${Date.now()}`,
      title: `Withdrawal of ₹${amount.toLocaleString("en-IN")} Requested 🏦`,
      message: `Your withdrawal request to ${targetBank?.bankName || "your bank account"} is being processed.`,
      type: "info",
      timestamp: "Just now",
      read: false,
      actionRoute: "wallet",
    };
    setNotifications((prev) => [notif, ...prev]);
    return true;
  };

  const addBankAccount = (bankData: Omit<BankAccount, "id" | "userId">) => {
    const newAccount: BankAccount = {
      id: `bank-${Date.now()}`,
      userId: activeUser.id,
      ...bankData,
    };
    setWallet((prev) => ({
      ...prev,
      bankAccounts: [...prev.bankAccounts, newAccount],
    }));

    // Call real paye₹nt backend
    payerntApi.addBankAccount(bankData as any).catch((err) => {
      console.warn("[paye₹nt Backend] Add bank account notice:", err);
    });
  };

  const creditRentalPayment = (amount: number, productName: string) => {
    const newTx: WalletTransaction = {
      id: `wtx-${Date.now()}`,
      userId: activeUser.id,
      type: "CREDIT",
      amount,
      description: "Rental Payment Received",
      productName,
      date: new Date().toISOString(),
      status: "Completed",
    };
    setWallet((prev) => ({
      ...prev,
      availableBalance: prev.availableBalance + amount,
      totalReceived: prev.totalReceived + amount,
      pendingBalance: Math.max(0, prev.pendingBalance - amount),
      transactions: [newTx, ...prev.transactions],
    }));
  };

  const resetWalletData = () => {
    const reset = { ...INITIAL_WALLET, userId: activeUser.id };
    setWallet(reset);
    try {
      localStorage.setItem(`wallet_${activeUser.id}`, JSON.stringify(reset));
    } catch {}
  };

  const markNotificationRead = (notifId: string) => {
    lastNotifsFetchRef.current = 0;
    lastDashboardFetchRef.current = 0;
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)),
    );
    payerntApi.markNotificationRead(notifId).catch((err) => {
      console.warn(
        "[Payernt] Failed to mark notification read on backend:",
        err,
      );
    });
  };

  const markAllNotificationsRead = () => {
    lastNotifsFetchRef.current = 0;
    lastDashboardFetchRef.current = 0;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    payerntApi.markAllNotificationsRead().catch((err) => {
      console.warn(
        "[Payernt] Failed to mark all notifications read on backend:",
        err,
      );
    });
  };

  const markMessageRead = useCallback(
    async (messageId: string) => {
      lastMessagesFetchRef.current = 0;
      lastDashboardFetchRef.current = 0;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId || m.messageId === messageId
            ? {
                ...m,
                read: true,
                status: "READ",
                readAt: new Date().toISOString(),
              }
            : m,
        ),
      );
      setUnreadMessagesCount((prev) => Math.max(0, prev - 1));

      await payerntApi.markMessageRead(messageId);
      if (activeAccount?.accountId) {
        const res = await payerntApi.getUnreadMessagesCount();
        if (res.success) {
          setUnreadMessagesCount(res.unreadCount);
        }
      }
    },
    [activeAccount?.accountId],
  );

  const sendAdminMessage = useCallback(
    async (params: {
      recipientAccountId: string;
      productId?: string;
      title: string;
      content: string;
      messageType?: string;
      senderAdminId?: string;
      senderName?: string;
      productName?: string;
      productCategory?: string;
    }) => {
      lastMessagesFetchRef.current = 0;
      lastDashboardFetchRef.current = 0;
      const res = await payerntApi.sendAdminMessage(params);
      if (res.success && res.message) {
        setMessages((prev) => [res.message, ...prev]);
        return res.message;
      }
      return null;
    },
    [],
  );

  const updateProfile = (updates: Partial<LenderProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  const resetToDefaults = () => {
    setProducts(INITIAL_PRODUCTS);
    setRentalRequests(INITIAL_REQUESTS);
    setEarningsTransactions(INITIAL_EARNINGS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setProfile(INITIAL_PROFILE);
    setDraftProduct(null);
    setActiveUserId("user_001");
    resetWalletData();
    localStorage.removeItem(STORAGE_KEY_PRODUCTS);
    localStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
    localStorage.removeItem(STORAGE_KEY_REQUESTS);
    localStorage.removeItem(STORAGE_KEY_EARNINGS);
    localStorage.removeItem(STORAGE_KEY_NOTIFS);
    localStorage.removeItem(STORAGE_KEY_PROFILE);
    localStorage.removeItem(STORAGE_KEY_DRAFT);
    window.dispatchEvent(new CustomEvent("payent_products_updated"));
  };

  // User-isolated product sets (belongs to active paye₹nt account)
  const currentOwnerId =
    activeAccount?.accountId || (activeAccount as any)?.id || activeUser.id;
  const activeEmail = activeAccount?.email || activeUser.email;

  const userProducts = products.filter((p) => {
    const pOwnerId = p.ownerId || (p as any).owner_id;
    const pOwnerEmail = p.ownerEmail || (p as any).owner_email;
    return (
      pOwnerId === currentOwnerId ||
      pOwnerId === activeAccount?.accountId ||
      pOwnerId === (activeAccount as any)?.id ||
      pOwnerId === activeUser.id ||
      (pOwnerEmail &&
        activeEmail &&
        pOwnerEmail.toLowerCase() === activeEmail.toLowerCase()) ||
      (currentOwnerId === "PAYERNT_USER_001" &&
        (pOwnerId === "user_001" || pOwnerId === "PAYERNT_USER_001"))
    );
  });
  const exploreApprovedProducts = products.filter((p) => {
    const pOwnerId = p.ownerId || (p as any).owner_id;
    return (
      (p.status === "approved" ||
        p.status === "active" ||
        p.verificationStatus === "approved" ||
        p.verificationStatus === "verified") &&
      pOwnerId !== currentOwnerId &&
      pOwnerId !== activeUser.id
    );
  });

  // Authoritative Aggregated Stats (Backend is single source of truth)
  const totalProductsCount =
    backendDashboard?.listings?.total ?? userProducts.length;
  const activeProductsCount =
    backendDashboard?.listings?.active ??
    userProducts.filter(
      (p) =>
        p.status === "active" ||
        p.status === "approved" ||
        (p.availabilityStatus === "available" &&
          (p.verificationStatus === "approved" ||
            p.verificationStatus === "verified")),
    ).length;
  const underVerificationCount =
    backendDashboard?.listings?.pending ??
    userProducts.filter(
      (p) =>
        p.status === "pending_confirmation" ||
        p.status === "under_review" ||
        p.status === "pending_admin_review" ||
        p.status === "pending" ||
        p.verificationStatus === "under_review" ||
        p.verificationStatus === "submitted",
    ).length;
  const activeRentalsCount =
    backendDashboard?.rentals?.active ??
    rentalRequests.filter(
      (r) => r.status === "active" || r.status === "handover",
    ).length;
  const pendingRequestsCount =
    backendDashboard?.bookings?.filter(
      (b: any) => b.status === "pending" || b.status === "security_pending",
    ).length ??
    rentalRequests.filter(
      (r) => r.status === "requested" || r.status === "pending",
    ).length;
  const totalEarnings =
    backendDashboard?.earnings?.total ??
    (wallet.totalReceived > 0 ? wallet.totalReceived : wallet.availableBalance);
  const pendingEarnings =
    backendDashboard?.wallet?.pendingAmount ?? wallet.pendingBalance;

  return {
    activeAccount,
    isAuthenticated,
    login,
    logout,
    demoUsers: DEMO_USERS,
    activeUser,
    activeUserId,
    switchDemoUser,
    products,
    userProducts,
    exploreApprovedProducts,
    draftProduct,
    rentalRequests,
    earningsTransactions,
    wallet,
    notifications,
    messages,
    unreadMessagesCount,
    profile,
    isLoadingDashboard,
    dashboardError,
    backendDashboard,
    backendActivities,
    refreshDashboard,
    fetchBookings,
    isLoadingBookings,
    bookingsError,
    fetchProducts,
    fetchWallet,
    fetchNotifications,
    stats: {
      totalProductsCount,
      activeProductsCount,
      underVerificationCount,
      activeRentalsCount,
      pendingRequestsCount,
      totalEarnings,
      pendingEarnings,
    },
    addProduct,
    saveDraft,
    clearDraft,
    updateProduct,
    deleteProduct,
    toggleAvailability,
    adminApproveProduct,
    adminRejectProduct,
    adminRequestCorrection,
    simulateVerificationChange,
    handleRequestAction,
    advanceRentalLifecycle,
    approveLocationChange,
    rejectLocationChange,
    requestWithdrawal,
    addBankAccount,
    creditRentalPayment,
    resetWalletData,
    markNotificationRead,
    markAllNotificationsRead,
    fetchMessages,
    markMessageRead,
    sendAdminMessage,
    updateProfile,
    resetToDefaults,
  };
}
