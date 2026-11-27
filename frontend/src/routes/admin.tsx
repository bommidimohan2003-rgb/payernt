import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { getSeoMetadata } from "@/utils/seo";
import { PermissionDenied } from "@/components/states/PermissionDenied";
import { LoadingState } from "@/components/states/LoadingState";

const Sidebar = lazy(() =>
  import("@/admin/components/layout/Sidebar").then((m) => ({
    default: m.Sidebar,
  }))
);
const Topbar = lazy(() =>
  import("@/admin/components/layout/Topbar").then((m) => ({
    default: m.Topbar,
  }))
);
const Footer = lazy(() =>
  import("@/admin/components/layout/Footer").then((m) => ({
    default: m.Footer,
  }))
);
const Breadcrumb = lazy(() =>
  import("@/admin/components/layout/Breadcrumb").then((m) => ({
    default: m.Breadcrumb,
  }))
);

export const Route = createFileRoute("/admin")({
  head: () =>
    getSeoMetadata({
      title: "Admin Portal | Payent",
      description:
        "Manage platform inventory, orders, payments, verification requests, and users.",
      path: "/admin",
    }),
  component: AdminLayout,
});

function AdminPageTransitionOutlet() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentPath}
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -4 }}
        transition={{
          duration: shouldReduceMotion ? 0 : 0.18,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="w-full"
      >
        <Suspense
          fallback={
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="flex items-center gap-1.5 font-mono font-medium text-xs text-[var(--admin-text-secondary)]">
                <span className="h-2 w-2 rounded-full bg-[var(--admin-success)]" />
                <span>Payent Operations</span>
              </div>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--admin-border)] border-t-[var(--admin-text)]" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

function AdminLayout() {
  const navigate = useNavigate();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDenied, setIsDenied] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      const { authService } = await import("@/admin/services/auth");
      const { isValid, isForbidden } = await authService.verifyAdminSession();

      if (!isMounted) return;

      if (!isValid) {
        setIsAuthenticated(false);
        setLoading(false);
        if (isForbidden) {
          setIsDenied(true);
        } else if (!hasRedirectedRef.current) {
          hasRedirectedRef.current = true;
          // Unauthenticated visitor -> redirect to public login entry point
          navigate({
            to: "/login",
            search: { redirect: currentPath } as any,
            replace: true,
          });
        }
        return;
      }

      setIsAuthenticated(true);
      setIsDenied(false);
      setLoading(false);
    };

    checkAuth();

    const handleProfileUpdate = () => {
      checkAuth();
    };
    window.addEventListener("payent:admin:profile-updated", handleProfileUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener("payent:admin:profile-updated", handleProfileUpdate);
    };
  }, [navigate, currentPath]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] h-[100dvh] items-center justify-center bg-background">
        <LoadingState
          type="spinner"
          message="Validating admin authorization..."
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (isDenied) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <PermissionDenied requiredRole="Administrator" />
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] h-[100dvh] items-center justify-center bg-background">
          <LoadingState type="spinner" message="Loading admin workspace..." />
        </div>
      }
    >
      <div className="min-h-screen bg-[var(--admin-bg)] text-[var(--admin-text)] flex flex-col antialiased transition-colors duration-200">
        <div className="flex flex-1 min-w-0 items-stretch">
          {/* Docked Collapsible Sidebar */}
          <Sidebar
            mobileOpen={mobileSidebarOpen}
            onMobileOpenChange={setMobileSidebarOpen}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            <Topbar onOpenMobileMenu={() => setMobileSidebarOpen(true)} />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[95rem] mx-auto w-full">
              <Breadcrumb />
              <AdminPageTransitionOutlet />
            </main>
            <Footer />
          </div>
        </div>
      </div>
    </Suspense>
  );
}

export default Route;


