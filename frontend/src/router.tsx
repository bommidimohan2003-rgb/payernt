import { QueryClient } from "@tanstack/react-query";
import { createRouter, createHashHistory } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes cache
        gcTime: 1000 * 60 * 15, // 15 minutes garbage collection
        refetchOnWindowFocus: false,
        retry: (failureCount, error: unknown) => {
          const errObj = error as { status?: number; statusCode?: number; response?: { status?: number } };
          const status = errObj?.status || errObj?.statusCode || errObj?.response?.status;
          if (status === 401 || status === 403 || status === 404) return false;
          return failureCount < 1;
        },
      },
    },
  });

  const isCapacitor =
    typeof window !== "undefined" &&
    (Boolean((window as any).Capacitor?.isNativePlatform?.()) ||
      window.location.protocol === "file:");

  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: isCapacitor ? createHashHistory() : undefined,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 1000 * 60 * 5,
  });

  return router;
};
