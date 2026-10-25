import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, lazy, Suspense } from "react";
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
          duration: shouldReduceMotion ? 0 : 0.2,
          ease: "easeOut",
        }}
        className="w-full"
      >
        <Suspense
          fallback={
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="flex items-center gap-1 font-mono font-black text-sm tracking-widest text-emerald-500">
                <span>PAYE₹NT</span>
                <span className="text-muted-foreground/60">/</span>
                <span className="text-xs text-muted-foreground">OPS</span>
              </div>
              <div className="w-16 h-0.5 bg-muted overflow-hidden rounded-full">
                <div className="w-8 h-full bg-emerald-500 animate-[loading-bar_1s_ease-in-out_infinite]" />
              </div>
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
        } else {
          // Unauthenticated visitor -> redirect to public login entry point
          navigate({
            to: "/login",
            search: { redirect: currentPath } as any,
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
      <div className="flex h-screen items-center justify-center bg-background">
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
        <div className="flex h-screen items-center justify-center bg-background">
          <LoadingState type="spinner" message="Loading admin workspace..." />
        </div>
      }
    >
      <div className="min-h-screen bg-[var(--admin-bg)] text-[var(--admin-text)] flex flex-col antialiased transition-colors duration-200">
        <div className="flex flex-1 relative items-stretch">
          {/* Collapsible Sidebar */}
          <Sidebar />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            <Topbar />
            <main className="flex-grow p-4 md:p-6 lg:p-8 space-y-5 max-w-[1600px] mx-auto w-full">
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


