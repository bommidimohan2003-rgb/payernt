import { useState, useEffect, useCallback } from "react";
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

export const INITIAL_REQUESTS: RentalRequest[] = [];

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
  const [activeAccount, setActiveAccount] = useState<PayerntAccount | null>(() => {
    try {
      const token =
        localStorage.getItem("paye₹nt_token") ||
        localStorage.getItem("payernt_token") ||
        localStorage.getItem("payent_token");
      const stored = localStorage.getItem(STORAGE_KEY_ACCOUNT);
      if (stored && token) return JSON.parse(stored);
    } catch {}
    return null;
  });

  const isAuthenticated = !!(
    activeAccount &&
    (localStorage.getItem("paye₹nt_token") ||
      localStorage.getItem("payernt_token") ||
      localStorage.getItem("payent_token"))
  );

  const [activeUserId, setActiveUserId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ACTIVE_USER);
      if (stored) return stored;
    } catch {}
    return activeAccount?.accountId || "vendor_active";
  });

  const activeUser: DemoUser = activeAccount
    ? {
        id: activeAccount.accountId,
        name: activeAccount.name,
        fullName: activeAccount.name,
        email: activeAccount.email,
        phone: activeAccount.phone || "",
        avatar: activeAccount.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
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
        city: "",
        role: "Guest",
      };

  const isMockItem = (id?: string) =>
    !id ||
    id.startsWith("prod-") ||
    id.startsWith("p1") ||
    id.startsWith("p2") ||
    id.startsWith("p3") ||
    id.startsWith("p4") ||
    id.startsWith("p5") ||
    id.startsWith("p6") ||
    id.startsWith("p7") ||
    id.startsWith("p8") ||
    id.startsWith("p9") ||
    id.startsWith("p10") ||
    id.startsWith("mock") ||
    id.startsWith("demo_") ||
    id.startsWith("sample_") ||
    id.startsWith("test_");

  const [wallet, setWallet] = useState<UserWallet>(() => {
    try {
      const walletKey = activeAccount ? `paye₹nt_wallet_${activeAccount.accountId}` : STORAGE_KEY_WALLET;
      const stored = localStorage.getItem(walletKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed) {
          const cleanTx = (parsed.transactions || []).filter((tx: any) => !tx.id?.startsWith("wtx-00"));
          const cleanBank = (parsed.bankAccounts || []).filter((b: any) => !b.id?.startsWith("bank-00"));
          return { ...parsed, transactions: cleanTx, bankAccounts: cleanBank };
        }
      }
    } catch {}
    return {
      ...INITIAL_WALLET,
      userId: activeAccount?.accountId || activeUserId,
      accountId: activeAccount?.accountId || "PAYERNT_ACCOUNT_DEFAULT",
    };
  });

  const [products, setProducts] = useState<PayerntProduct[]>(() => {
    return [];
  });

  const [draftProduct, setDraftProduct] = useState<Partial<PayerntProduct> | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DRAFT);
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  });

  const [rentalRequests, setRentalRequests] = useState<RentalRequest[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_REQUESTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter((r) => !r.id?.startsWith("req-89"));
        }
      }
    } catch {}
    return INITIAL_REQUESTS;
  });

  const [earningsTransactions, setEarningsTransactions] = useState<EarningTransaction[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_EARNINGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter((t) => !t.id?.startsWith("tx-70"));
        }
      }
    } catch {}
    return INITIAL_EARNINGS;
  });

  const [notifications, setNotifications] = useState<LenderNotification[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_NOTIFS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter((n) => n.id !== "notif-1");
        }
      }
    } catch {}
    return INITIAL_NOTIFICATIONS;
  });

  const [messages, setMessages] = useState<PayerntMessage[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MESSAGES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MESSAGES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter((m) => !m.read && !m.is_read).length;
        }
      }
    } catch {}
    return 0;
  });

  const [profile, setProfile] = useState<LenderProfile>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (stored) return JSON.parse(stored);
    } catch {}
    return INITIAL_PROFILE;
  });

  // Login handler
  const login = useCallback((account: PayerntAccount) => {
    setActiveAccount(account);
    try {
      localStorage.setItem(STORAGE_KEY_SESSION, `session_${account.accountId || (account as any).id}_${Date.now()}`);
      localStorage.setItem(STORAGE_KEY_ACCOUNT, JSON.stringify(account));
    } catch {}
    const aadhaarVal = account.aadhaarNumber || (account as any).aadhaar_number || (account as any).aadhaarMasked || "";
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
      avatar: account.avatar || prev.avatar,
    }));
    window.dispatchEvent(new CustomEvent("paye₹nt_auth_change", { detail: account }));
  }, []);

  // Logout handler
  const logout = useCallback(() => {
    setActiveAccount(null);
    try {
      localStorage.removeItem(STORAGE_KEY_SESSION);
      localStorage.removeItem(STORAGE_KEY_ACCOUNT);
    } catch {}
    window.dispatchEvent(new CustomEvent("paye₹nt_auth_change", { detail: null }));
  }, []);

  // Sync to localStorage and broadcast updates
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
    } catch {}
  }, [products]);

  useEffect(() => {
    try {
      const walletKey = activeAccount ? `paye₹nt_wallet_${activeAccount.accountId}` : STORAGE_KEY_WALLET;
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
      localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(rentalRequests));
    } catch {}
  }, [rentalRequests]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_EARNINGS, JSON.stringify(earningsTransactions));
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
            setProducts(parsed.filter((p: any) => !isMockItem(p.id)));
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

  // Sync real paye₹nt backend state upon authentication
  useEffect(() => {
    if (!activeAccount || !isAuthenticated) return;

    payerntApi
      .getProducts()
      .then((res) => {
        if (res.success && Array.isArray(res.products)) {
          setProducts(res.products.filter((p) => !isMockItem(p.id)));
        } else if (res.error && (res.error.includes("401") || res.error.includes("Session expired") || res.error.includes("Authorization"))) {
          logout();
        }
      })
      .catch(() => {});

    payerntApi
      .getWallet()
      .then((res) => {
        if (res.success && res.wallet) {
          const w = res.wallet as any;
          setWallet((prev) => ({
            ...prev,
            availableBalance: Number(w.available_balance ?? w.availableBalance ?? prev.availableBalance),
            pendingBalance: Number(w.pending_amount ?? w.pendingBalance ?? prev.pendingBalance),
            totalReceived: Number(w.total_received ?? w.totalReceived ?? prev.totalReceived),
            totalWithdrawn: Number(w.total_withdrawn ?? w.totalWithdrawn ?? prev.totalWithdrawn),
            bankAccounts: Array.isArray(res.bankAccounts)
              ? (res.bankAccounts as any).filter((b: any) => !b.id?.startsWith("bank-00"))
              : prev.bankAccounts,
            transactions: Array.isArray(res.transactions)
              ? (res.transactions as any).filter((t: any) => !t.id?.startsWith("wtx-00"))
              : prev.transactions,
          }));
        } else if (res.error && (res.error.includes("401") || res.error.includes("Session expired") || res.error.includes("Authorization"))) {
          logout();
        }
      })
      .catch(() => {});

    payerntApi
      .getNotifications()
      .then((res) => {
        if (res.success && Array.isArray(res.notifications)) {
          setNotifications(res.notifications.filter((n) => n.id !== "notif-1"));
        }
      })
      .catch(() => {});

    payerntApi
      .getMessages()
      .then((res) => {
        if (res.success && Array.isArray(res.messages)) {
          setMessages(res.messages);
          const count = res.unreadCount ?? res.messages.filter((m: any) => !m.read && !m.is_read).length;
          setUnreadMessagesCount(count);
        }
      })
      .catch(() => {});
  }, [activeAccount, isAuthenticated, logout]);

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
      avatar: found.avatar,
      city: found.city,
    }));
    window.dispatchEvent(new CustomEvent("payent_user_changed", { detail: found }));
    window.dispatchEvent(new CustomEvent("payent_products_updated"));
  };

  // Actions
  const addProduct = (newProduct: PayerntProduct) => {
    const ownerId = activeAccount?.accountId || activeUser.id;
    const ownerName = activeAccount?.name || activeUser.fullName || activeUser.name;
    const ownerEmail = activeAccount?.email || activeUser.email;
    const ownerAvatar = activeAccount?.avatar || activeUser.avatar;

    const finalized: PayerntProduct = {
      ...newProduct,
      ownerId,
      ownerAccountType: "paye₹nt",
      vendorSecretPin: newProduct.vendorSecretPin || Math.floor(1000 + Math.random() * 9000).toString(),
      owner: {
        id: ownerId,
        name: ownerName,
        fullName: ownerName,
        email: ownerEmail,
        avatar: ownerAvatar,
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

    // Call real paye₹nt backend
    payerntApi.createProduct(finalized).catch((err) => {
      console.warn("[paye₹nt Backend] Listing sync warning:", err);
    });

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

  const updateProduct = (id: string, updates: Partial<PayerntProduct>) => {
    setProducts((prev) => {
      const nextList = prev.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      );
      try {
        localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(nextList));
      } catch {}
      return nextList;
    });
    payerntApi.updateProduct(id, updates).catch((e) => console.warn("[paye₹nt Backend] updateProduct sync:", e));
    window.dispatchEvent(new CustomEvent("payent_products_updated"));
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => {
      const nextList = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(nextList));
      } catch {}
      return nextList;
    });
    payerntApi.deleteProduct(id).catch((e) => console.warn("[paye₹nt Backend] deleteProduct sync:", e));
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
    payerntApi.updateProductStatus(id, "active", nextStatus).catch((e) => console.warn("[paye₹nt Backend] toggleAvailability sync:", e));
    window.dispatchEvent(new CustomEvent("payent_products_updated"));
  };

  // Admin Review / Approval Actions
  const adminApproveProduct = useCallback((id: string) => {
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
  }, [products]);

  const adminRejectProduct = useCallback((id: string, notes?: string) => {
    setProducts((prev) => {
      const nextList = prev.map((p) => {
        if (p.id !== id) return p;
        return {
          ...p,
          verificationStatus: "rejected" as VerificationStatus,
          status: "rejected",
          verificationNotes: notes || "Listing did not meet platform safety requirements.",
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
  }, [products]);

  const adminRequestCorrection = useCallback((id: string, notes?: string) => {
    setProducts((prev) => {
      const nextList = prev.map((p) => {
        if (p.id !== id) return p;
        return {
          ...p,
          verificationStatus: "needs_correction" as VerificationStatus,
          status: "needs_correction",
          verificationNotes: notes || "Please update product serial number photo and details.",
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
  }, [products]);

  const simulateVerificationChange = (id: string, status: VerificationStatus, notes?: string) => {
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
  const handleRequestAction = (requestId: string, action: "accept" | "reject") => {
    setRentalRequests((prev) =>
      prev.map((req) => {
        if (req.id !== requestId) return req;
        return {
          ...req,
          status: action === "accept" ? "accepted" : "rejected",
        };
      })
    );

    const req = rentalRequests.find((r) => r.id === requestId);
    const notif: LenderNotification = {
      id: `notif-${Date.now()}`,
      title: action === "accept" ? "Rental Request Accepted ✅" : "Rental Request Declined ❌",
      message: `You ${action}ed ${req?.renter.name}'s booking for "${req?.productTitle}".`,
      type: action === "accept" ? "success" : "info",
      timestamp: "Just now",
      read: false,
      actionRoute: "requests",
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  // Step Rental Lifecycle
  const advanceRentalLifecycle = (requestId: string, nextStatus: RentalRequestStatus) => {
    setRentalRequests((prev) =>
      prev.map((req) => {
        if (req.id !== requestId) return req;
        const updated = { ...req, status: nextStatus };
        if (nextStatus === "completed") {
          updated.paymentStatus = "settled_to_lender";
        }
        return updated;
      })
    );

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
                totalEarningsGenerated: p.totalEarningsGenerated + req.netEarnings,
                availabilityStatus: "available",
              }
            : p
        )
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
        prev.map((p) => (p.id === req.productId ? { ...p, availabilityStatus: "rented" } : p))
      );
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(`wallet_${activeUserId}`, JSON.stringify(wallet));
    } catch {}
  }, [wallet, activeUserId]);

  const requestWithdrawal = (amount: number, bankAccountId: string): boolean => {
    if (amount <= 0 || amount > wallet.availableBalance) {
      return false;
    }
    const targetBank = wallet.bankAccounts.find((b) => b.id === bankAccountId) || wallet.bankAccounts[0];

    const newTx: WalletTransaction = {
      id: `wtx-${Date.now()}`,
      userId: activeUser.id,
      type: "WITHDRAWAL",
      amount,
      description: "Bank Withdrawal Transfer",
      date: new Date().toISOString(),
      status: "Processing",
      bankAccountMasked: targetBank ? targetBank.maskedAccountNumber : "XXXX XXXX 4582",
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
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const fetchMessages = useCallback(
    async (productId?: string) => {
      if (!activeAccount?.accountId) return;
      const res = await payerntApi.getMessages(productId);
      if (res.success && Array.isArray(res.messages)) {
        setMessages(res.messages);
        const count = res.unreadCount ?? res.messages.filter((m: any) => !m.read && !m.is_read).length;
        setUnreadMessagesCount(count);
        try {
          localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(res.messages));
        } catch {}
      }
    },
    [activeAccount?.accountId]
  );

  const markMessageRead = useCallback(
    async (messageId: string) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId || m.messageId === messageId
            ? { ...m, read: true, status: "READ", readAt: new Date().toISOString() }
            : m
        )
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
    [activeAccount?.accountId]
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
      const res = await payerntApi.sendAdminMessage(params);
      if (res.success && res.message) {
        setMessages((prev) => [res.message, ...prev]);
        return res.message;
      }
      return null;
    },
    []
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
  const currentOwnerId = activeAccount?.accountId || activeUser.id;
  const userProducts = products.filter(
    (p) =>
      p.ownerId === currentOwnerId ||
      p.ownerId === activeUser.id ||
      (currentOwnerId === "PAYERNT_USER_001" && (p.ownerId === "user_001" || p.ownerId === "PAYERNT_USER_001"))
  );
  const exploreApprovedProducts = products.filter(
    (p) =>
      (p.status === "approved" ||
        p.verificationStatus === "approved" ||
        p.verificationStatus === "verified") &&
      p.ownerId !== currentOwnerId &&
      p.ownerId !== activeUser.id
  );

  // Aggregated Stats
  const totalProductsCount = userProducts.length;
  const activeProductsCount = userProducts.filter(
    (p) => p.availabilityStatus === "available" && (p.verificationStatus === "approved" || p.verificationStatus === "verified")
  ).length;
  const underVerificationCount = userProducts.filter(
    (p) => p.verificationStatus === "under_review" || p.verificationStatus === "submitted"
  ).length;
  const activeRentalsCount = rentalRequests.filter(
    (r) => r.status === "active" || r.status === "handover"
  ).length;
  const pendingRequestsCount = rentalRequests.filter((r) => r.status === "requested").length;
  const totalEarnings = wallet.availableBalance;
  const pendingEarnings = wallet.pendingBalance;

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

