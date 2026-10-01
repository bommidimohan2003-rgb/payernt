import { adminApi, AdminProduct, AdminCategory } from "./api";

const STORAGE_KEY = "payernt_products_v2";

const getStoredProducts = (): any[] => {
  return [];
};

const mapToAdminProduct = (p: any): AdminProduct => ({
  id: p.id,
  title: p.title || p.name || "Equipment Listing",
  description: p.description || "",
  category: p.category || "General",
  brand: p.brand || p.specs?.brand || "",
  model: p.model || p.specs?.model || "",
  year: p.year || p.specs?.year || "",
  specifications: p.specifications || p.specs || {},
  features: p.features || p.specs?.features || [],
  conditionGrade: p.conditionGrade || p.condition?.grade || "Excellent",
  conditionDetails: p.conditionDetails || p.condition || {},
  accessories: p.accessories || (p.condition?.accessoriesIncluded ? p.condition.accessoriesIncluded.join(", ") : ""),
  city: p.city || p.location?.city || "",
  area: p.area || p.location?.area || "",
  pincode: p.pincode || p.location?.pincode || "",
  pickupInstructions: p.pickupInstructions || p.location?.pickupInstructions || "",
  price: Number(p.pricing?.daily || p.price || 0),
  dailyRate: Number(p.pricing?.daily || p.dailyRate || p.price || 0),
  weeklyRate: p.pricing?.weekly || p.weeklyRate || null,
  monthlyRate: p.pricing?.monthly || p.monthlyRate || null,
  securityDeposit: p.pricing?.securityDeposit || p.securityDeposit || 0,
  rating: Number(p.rating || 5.0),
  reviewsCount: Number(p.totalRentalsCount || 0),
  available: p.availabilityStatus === "available" && (p.verificationStatus === "approved" || p.status === "approved"),
  status:
    p.status === "approved" || p.verificationStatus === "approved" || p.verificationStatus === "verified"
      ? "approved"
      : p.status === "rejected" || p.verificationStatus === "rejected"
      ? "rejected"
      : p.status === "needs_correction" || p.verificationStatus === "needs_correction"
      ? "needs_correction"
      : "pending",
  featured: Boolean(p.featured),
  hidden: p.availabilityStatus === "paused",
  image: p.primaryImage || (p.photos && p.photos[0]?.url) || (p.images && p.images[0]) || "",
  images: (p.photos && p.photos.map((ph: any) => ph.url)) || p.images || [],
  documents: p.verificationDocs?.purchaseProofName ? [p.verificationDocs.purchaseProofName] : [],
  videoUrl: p.videoUrl || (p.verificationDocs?.idProofImageName?.endsWith(".mp4") ? p.verificationDocs.idProofImageName : undefined),
  approvedPriceRange: p.approvedPriceRange || (p.pricing?.minPrice && p.pricing?.maxPrice ? {
    minPrice: p.pricing.minPrice,
    maxPrice: p.pricing.maxPrice,
    unit: p.pricing.unit || "day",
    approvedAt: p.pricing.approvedAt,
    approvedBy: p.pricing.approvedBy,
  } : undefined),
  priceHistory: p.priceHistory || [],
  createdAt: p.createdAt || new Date().toISOString(),
  updatedAt: p.updatedAt,
  owner: {
    id: p.ownerId || p.owner?.id || "user_001",
    name: p.owner?.name || p.owner?.fullName || p.verificationDocs?.ownerFullName || "Mohan Bommidi",
    avatar:
      p.owner?.avatar ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    rating: 5.0,
    email: p.owner?.email || p.verificationDocs?.ownerEmail || "mohan@payent.io",
    phone: p.owner?.phone || p.verificationDocs?.ownerPhone || "",
    city: p.location?.city || "",
    pincode: p.location?.pincode || "",
  },
});

export const productsService = {
  async getProducts(status?: string): Promise<AdminProduct[]> {
    try {
      const url = status && status !== "all"
        ? `/products?status=${encodeURIComponent(status)}`
        : "/products";
      const response = await adminApi.get(url);
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
    } catch (err) {
      console.warn("Error fetching admin products from backend:", err);
    }

    const stored = getStoredProducts();
    if (stored.length > 0) {
      let mapped = stored.map(mapToAdminProduct);
      if (status && status !== "all") {
        mapped = mapped.filter((p) => p.status === status);
      }
      return mapped;
    }
    return [];
  },

  async getProductById(id: string): Promise<AdminProduct> {
    try {
      const response = await adminApi.get(`/products/${encodeURIComponent(id)}`);
      if (response.data && response.data.id) return response.data;
    } catch (err) {
      console.warn("Error fetching product details from backend:", err);
    }

    const stored = getStoredProducts();
    const found = stored.find((p) => p.id === id);
    if (found) {
      return mapToAdminProduct(found);
    }
    throw new Error("Product not found");
  },

  async updateProduct(
    id: string,
    data: Partial<AdminProduct>,
  ): Promise<AdminProduct> {
    try {
      const response = await adminApi.put(`/products/${encodeURIComponent(id)}`, data);
      if (response.data) return response.data;
    } catch {}

    const stored = getStoredProducts();
    const updated = stored.map((p) => (p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("payent_products_updated"));
    return this.getProductById(id);
  },

  async setPriceRange(
    id: string,
    priceRange: { minPrice: number; maxPrice: number; unit: "day" | "hour" | "week" | "month" },
  ): Promise<AdminProduct> {
    try {
      const response = await adminApi.post(`/products/${encodeURIComponent(id)}/price-range`, priceRange);
      if (response.data && response.data.id) return response.data;
    } catch {}

    const stored = getStoredProducts();
    const updated = stored.map((p) => {
      if (p.id !== id) return p;
      const prevRange = p.approvedPriceRange;
      const historyItem = {
        id: `ph_${Date.now()}`,
        minPrice: priceRange.minPrice,
        maxPrice: priceRange.maxPrice,
        unit: priceRange.unit,
        previousMinPrice: prevRange?.minPrice,
        previousMaxPrice: prevRange?.maxPrice,
        updatedBy: "Admin Superuser",
        updatedAt: new Date().toISOString(),
      };
      const existingHistory = p.priceHistory || [];

      return {
        ...p,
        approvedPriceRange: {
          ...priceRange,
          approvedAt: new Date().toISOString(),
          approvedBy: "Admin Superuser",
        },
        priceHistory: [historyItem, ...existingHistory],
        pricing: {
          ...(p.pricing || {}),
          minPrice: priceRange.minPrice,
          maxPrice: priceRange.maxPrice,
          unit: priceRange.unit,
        },
        updatedAt: new Date().toISOString(),
      };
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("payent_products_updated"));
    return this.getProductById(id);
  },

  async deleteProduct(id: string): Promise<void> {
    try {
      await adminApi.delete(`/products/${encodeURIComponent(id)}`);
    } catch {}

    const stored = getStoredProducts();
    const updated = stored.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("payent_products_updated"));
  },

  async approveProduct(
    id: string,
    priceRange?: { minPrice: number; maxPrice: number; unit: "day" | "hour" | "week" | "month" },
  ): Promise<AdminProduct> {
    try {
      const payload = priceRange ? { priceRange } : {};
      const response = await adminApi.patch(`/products/${encodeURIComponent(id)}/approve`, payload);
      if (response.data && response.data.id) return response.data;
    } catch {
      try {
        const payload = priceRange ? { priceRange } : {};
        const response = await adminApi.post(`/products/${encodeURIComponent(id)}/approve`, payload);
        if (response.data && response.data.id) return response.data;
      } catch {}
    }

    const stored = getStoredProducts();
    const updated = stored.map((p) => {
      if (p.id !== id) return p;
      const approvedRange = priceRange || p.approvedPriceRange;
      return {
        ...p,
        status: "approved",
        verificationStatus: "approved",
        availabilityStatus: "available",
        approvedPriceRange: approvedRange ? {
          ...approvedRange,
          approvedAt: new Date().toISOString(),
          approvedBy: "Admin Superuser",
        } : p.approvedPriceRange,
        reviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("payent_products_updated"));
    return this.getProductById(id);
  },

  async rejectProduct(id: string, reason?: string): Promise<AdminProduct> {
    try {
      const response = await adminApi.patch(`/products/${encodeURIComponent(id)}/reject`, { reason });
      if (response.data && response.data.id) return response.data;
    } catch {
      try {
        const response = await adminApi.post(`/products/${encodeURIComponent(id)}/reject`, { reason });
        if (response.data && response.data.id) return response.data;
      } catch {}
    }

    const stored = getStoredProducts();
    const updated = stored.map((p) => {
      if (p.id !== id) return p;
      return {
        ...p,
        status: "rejected",
        verificationStatus: "rejected",
        availabilityStatus: "paused",
        reviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("payent_products_updated"));
    return this.getProductById(id);
  },

  async suspendProduct(id: string, reason?: string): Promise<AdminProduct> {
    try {
      const response = await adminApi.patch(`/products/${encodeURIComponent(id)}/suspend`, { reason });
      if (response.data && response.data.id) return response.data;
    } catch {
      try {
        const response = await adminApi.post(`/products/${encodeURIComponent(id)}/suspend`, { reason });
        if (response.data && response.data.id) return response.data;
      } catch {}
    }
    return this.getProductById(id);
  },

  async restoreProduct(id: string): Promise<AdminProduct> {
    try {
      const response = await adminApi.patch(`/products/${encodeURIComponent(id)}/restore`);
      if (response.data && response.data.id) return response.data;
    } catch {
      try {
        const response = await adminApi.post(`/products/${encodeURIComponent(id)}/restore`);
        if (response.data && response.data.id) return response.data;
      } catch {}
    }
    return this.getProductById(id);
  },

  async requestCorrection(id: string, notes?: string): Promise<AdminProduct> {
    const stored = getStoredProducts();
    const updated = stored.map((p) => {
      if (p.id !== id) return p;
      return {
        ...p,
        status: "needs_correction",
        verificationStatus: "needs_correction",
        verificationNotes: notes || "Please update product serial number photo and details.",
        availabilityStatus: "paused",
        reviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("payent_products_updated"));
    return this.getProductById(id);
  },

  async toggleFeatureProduct(id: string): Promise<AdminProduct> {
    try {
      const response = await adminApi.post(`/products/${encodeURIComponent(id)}/toggle-feature`);
      if (response.data) return response.data;
    } catch {}
    return this.getProductById(id);
  },

  async toggleHideProduct(id: string): Promise<AdminProduct> {
    try {
      const response = await adminApi.post(`/products/${encodeURIComponent(id)}/toggle-hide`);
      if (response.data) return response.data;
    } catch {}

    const stored = getStoredProducts();
    const updated = stored.map((p) => {
      if (p.id !== id) return p;
      const nextStatus = p.availabilityStatus === "available" ? "paused" : "available";
      return { ...p, availabilityStatus: nextStatus, updatedAt: new Date().toISOString() };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("payent_products_updated"));
    return this.getProductById(id);
  },

  // Categories
  async getCategories(): Promise<AdminCategory[]> {
    try {
      const response = await adminApi.get("/categories");
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
    } catch {}
    return [];
  },

  async createCategory(data: {
    name: string;
    icon?: string;
    color?: string;
  }): Promise<AdminCategory> {
    const response = await adminApi.post("/categories", data);
    return response.data;
  },

  async updateCategory(
    id: string,
    data: Partial<AdminCategory>,
  ): Promise<AdminCategory> {
    const response = await adminApi.put(`/categories/${encodeURIComponent(id)}`, data);
    return response.data;
  },

  async deleteCategory(id: string): Promise<void> {
    await adminApi.delete(`/categories/${encodeURIComponent(id)}`);
  },
};
