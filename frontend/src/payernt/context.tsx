import React, { createContext, useContext, type ReactNode } from "react";
import { usePayerntStore } from "./store";

type PayerntStoreType = ReturnType<typeof usePayerntStore>;

const PayerntContext = createContext<PayerntStoreType | null>(null);

export function PayerntProvider({ children }: { children: ReactNode }) {
  const store = usePayerntStore();
  return (
    <PayerntContext.Provider value={store}>
      {children}
    </PayerntContext.Provider>
  );
}

export function usePayernt(): PayerntStoreType {
  const ctx = useContext(PayerntContext);
  if (!ctx) {
    return usePayerntStore();
  }
  return ctx;
}
