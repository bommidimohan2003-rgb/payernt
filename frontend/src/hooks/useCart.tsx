import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/utils/api";
import { useAuth } from "@/hooks/useAuth";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { toast } from "sonner";
import type { CartItem, CartResponse } from "@/types";

interface CartContextType {
  cartItems: CartItem[];
  cartCount: number;
  subtotal: number;
  tax: number;
  total: number;
  isLoading: boolean;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addToCart: (
    productId: string,
    startDate?: string,
    endDate?: string,
  ) => Promise<boolean>;
  removeFromCart: (itemId: string) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  refreshCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCartOpen, setIsCartOpen] = useState(false);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const toggleCart = useCallback(() => setIsCartOpen((prev) => !prev), []);

  const isCartEnabled = useMemo(() => {
    if (!user) return false;
    if (typeof window === "undefined") return false;
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) return false;
    const pathname = window.location.pathname;
    const isGatewayOrAuth =
      pathname === "/" ||
      pathname === "/select" ||
      pathname === "/login" ||
      pathname === "/register" ||
      pathname === "/otp" ||
      pathname.startsWith("/account-pending") ||
      pathname.startsWith("/payernt") ||
      pathname.startsWith("/paye₹nt") ||
      pathname.startsWith("/admin");
    return !isGatewayOrAuth || isCartOpen;
  }, [user, isCartOpen]);

  const {
    data: cartData,
    isLoading,
    refetch,
  } = useQuery<CartResponse>({
    queryKey: ["cart", user?.email || "guest"],
    queryFn: async () => {
      if (!user) {
        return { items: [], count: 0, subtotal: 0, tax: 0, total: 0 };
      }
      try {
        return await api.getCart();
      } catch (err) {
        console.warn("Cart fetch warning:", err);
        return { items: [], count: 0, subtotal: 0, tax: 0, total: 0 };
      }
    },
    enabled: isCartEnabled,
    staleTime: 1000 * 30,
  });

  const cartItems = useMemo(() => cartData?.items || [], [cartData]);
  const cartCount = useMemo(() => cartData?.count || cartItems.length, [cartData, cartItems]);
  const subtotal = useMemo(() => cartData?.subtotal || 0, [cartData]);
  const tax = useMemo(() => cartData?.tax || 0, [cartData]);
  const total = useMemo(() => cartData?.total || 0, [cartData]);

  const addMutation = useMutation({
    mutationFn: async ({
      productId,
      startDate,
      endDate,
    }: {
      productId: string;
      startDate?: string;
      endDate?: string;
    }) => {
      return await api.addToCart(productId, startDate, endDate);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success(data?.message || "Added to cart!");
      setIsCartOpen(true);
    },
    onError: (err: unknown) => {
      const e = err as { message?: string };
      toast.error(
        e.message || "Could not add to cart.",
      );
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await api.removeFromCart(itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Item removed from cart.");
    },
    onError: () => {
      toast.error("Failed to remove item.");
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      return await api.clearCart();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Cart cleared.");
    },
    onError: () => {
      toast.error("Failed to clear cart.");
    },
  });

  const addToCart = useCallback(
    async (productId: string, startDate?: string, endDate?: string) => {
      try {
        await addMutation.mutateAsync({ productId, startDate, endDate });
        return true;
      } catch {
        return false;
      }
    },
    [addMutation],
  );

  const removeFromCart = useCallback(
    async (itemId: string) => {
      try {
        await removeMutation.mutateAsync(itemId);
        return true;
      } catch {
        return false;
      }
    },
    [removeMutation],
  );

  const clearCart = useCallback(async () => {
    try {
      await clearMutation.mutateAsync();
      return true;
    } catch {
      return false;
    }
  }, [clearMutation]);

  const value = useMemo(
    () => ({
      cartItems,
      cartCount,
      subtotal,
      tax,
      total,
      isLoading,
      isCartOpen,
      openCart,
      closeCart,
      toggleCart,
      addToCart,
      removeFromCart,
      clearCart,
      refreshCart: refetch,
    }),
    [
      cartItems,
      cartCount,
      subtotal,
      tax,
      total,
      isLoading,
      isCartOpen,
      openCart,
      closeCart,
      toggleCart,
      addToCart,
      removeFromCart,
      clearCart,
      refetch,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
