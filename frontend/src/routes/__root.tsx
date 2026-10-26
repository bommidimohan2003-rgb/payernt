import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  useNavigate,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { HelpChatbot } from "../components/common/HelpChatbot";
import { api } from "../utils/api";
import { storage, STORAGE_KEYS } from "../utils/storage";
import type { Product } from "../types";
import { Toaster } from "@/components/ui/sonner";
import { NoInternetState } from "@/components/states/NoInternetState";
import { CartProvider } from "@/hooks/useCart";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { AppPreloader } from "@/components/common/AppPreloader";
import { Navigation4 } from "@/components/navigation/Navigation4";
import { LanguageProvider } from "@/i18n";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Page not found
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", () => {
    const key = "vite_chunk_reload";
    const last = sessionStorage.getItem(key);
    const now = Date.now();
    if (!last || now - Number(last) > 10000) {
      sessionStorage.setItem(key, String(now));
      window.location.reload();
    }
  });
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  const errorMessage =
    (error as any)?.message || (typeof error === "string" ? error : "");
  const isChunkError =
    errorMessage.includes("dynamically imported module") ||
    errorMessage.includes("Failed to fetch dynamically imported module") ||
    errorMessage.includes("Importing a module script failed") ||
    errorMessage.includes("ERR_CONNECTION_CLOSED") ||
    errorMessage.includes("Failed to fetch");

  // Automatically attempt one clean page refresh if dynamic chunk or network connection was interrupted
  useEffect(() => {
    if (isChunkError && typeof window !== "undefined") {
      const reloadKey = "chunk_auto_reload_" + window.location.pathname;
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();
      if (!lastReload || now - Number(lastReload) > 15000) {
        sessionStorage.setItem(reloadKey, String(now));
        window.location.reload();
      }
    }
  }, [isChunkError]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isChunkError
            ? "A newer version of the platform was deployed or the connection was interrupted. Please reload to load the latest version."
            : "Something went wrong on our end. You can try refreshing or head back home."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              window.location.reload();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
          >
            Reload page
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent cursor-pointer"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    head: () => ({
      meta: [
        { charSet: "utf-8" },
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover",
        },
        { title: "Payent — Rent premium tech gear" },
        {
          name: "description",
          content:
            "Peer-to-peer marketplace to rent cameras, drones, laptops and more. Insured. Delivered fast.",
        },
        { name: "author", content: "Payent" },
        { name: "theme-color", content: "#161616" },
        { property: "og:title", content: "Payent — Rent premium tech gear" },
        {
          property: "og:description",
          content:
            "Rent flagship tech gear from verified lenders in your city.",
        },
        { property: "og:type", content: "website" },
        { property: "og:image", content: "/brand/payent-logo-og.png" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: "/brand/payent-logo-og.png" },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
        { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
        {
          rel: "apple-touch-icon",
          href: "/apple-touch-icon.png",
          sizes: "180x180",
        },
        {
          rel: "manifest",
          href: "/site.webmanifest",
          crossOrigin: "use-credentials",
        },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossOrigin: "anonymous",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap",
        },
      ],
    }),
    shellComponent: RootShell,
    component: RootComponent,
    notFoundComponent: NotFoundComponent,
    errorComponent: ErrorComponent,
  },
);

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootContent() {
  const [showChatbot, setShowChatbot] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const handlePreloaderComplete = () => {
    if (pathname === "/") {
      navigate({ to: "/select" });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setShowChatbot(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const isPayentHome = pathname === "/" || pathname === "/payent" || pathname === "/payant" || pathname === "/select";
  const isPayernt =
    pathname.startsWith("/payernt") ||
    pathname.startsWith("/paye₹nt") ||
    pathname === "/become-lender" ||
    pathname === "/lender-portal";
  const hideMainNavigation = isPayentHome || isPayernt || pathname.startsWith("/admin");

  return (
    <>
      <AppPreloader onComplete={handlePreloaderComplete} />
      {!hideMainNavigation && <Navigation4 />}
      <Outlet />

      {!isPayentHome && !isPayernt && <CartDrawer />}
      {showChatbot && !isPayentHome && !isPayernt && <HelpChatbot />}
      <Toaster position="bottom-right" richColors />
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  const [isOffline, setIsOffline] = useState(false);

  const checkConnectivity = async () => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      if (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host.endsWith(".local")
      ) {
        setIsOffline(false);
        return;
      }
    }

    if (typeof navigator !== "undefined" && navigator.onLine) {
      setIsOffline(false);
    } else {
      setIsOffline(true);
    }
  };

  useEffect(() => {
    // Global session expiration handler (silent redirect with NO popups/modals)
    const handleSessionExpired = (e: Event) => {
      const customEv = e as CustomEvent<{
        loginPath?: "/login";
      }>;
      storage.remove(STORAGE_KEYS.token);
      storage.remove(STORAGE_KEYS.refreshToken);
      storage.remove(STORAGE_KEYS.currentUser);
      if (typeof window !== "undefined") {
        localStorage.removeItem("payent:admin:token");
        localStorage.removeItem("payent:admin:current_user");
        const currentPath = window.location.pathname;
        const targetLoginBase = customEv.detail?.loginPath || "/login";

        if (currentPath === "/login") {
          return;
        }

        const isProtectedRoute =
          currentPath.startsWith("/dashboard") ||
          currentPath.startsWith("/orders") ||
          currentPath.startsWith("/wishlist") ||
          currentPath.startsWith("/profile") ||
          currentPath.startsWith("/settings") ||
          currentPath.startsWith("/messages") ||
          currentPath.startsWith("/notifications") ||
          currentPath.startsWith("/checkout") ||
          currentPath.startsWith("/payment") ||
          currentPath.startsWith("/become-lender") ||
          currentPath.startsWith("/admin");

        if (isProtectedRoute) {
          const cleanPath = currentPath;
          const redirectParam = cleanPath !== "/" ? `?redirect=${encodeURIComponent(cleanPath)}` : "";
          window.location.href = `${targetLoginBase}${redirectParam}`;
        }
      }
    };

    // Online/Offline handlers
    const handleOnline = () => checkConnectivity();
    const handleOffline = () => {
      const host =
        typeof window !== "undefined" ? window.location.hostname : "";
      if (
        host !== "localhost" &&
        host !== "127.0.0.1" &&
        !host.endsWith(".local")
      ) {
        setIsOffline(true);
      }
    };
    const handleNetworkOfflineEvent = () => checkConnectivity();

    window.addEventListener("payent-session-expired", handleSessionExpired);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener(
      "payent-network-offline",
      handleNetworkOfflineEvent,
    );

    return () => {
      window.removeEventListener(
        "payent-session-expired",
        handleSessionExpired,
      );
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(
        "payent-network-offline",
        handleNetworkOfflineEvent,
      );
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <LanguageProvider>
          <CartProvider>
            <RootContent />
          </CartProvider>
        </LanguageProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
