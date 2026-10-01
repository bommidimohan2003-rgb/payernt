import { createFileRoute, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useReducedMotion, motion, AnimatePresence } from "framer-motion";
import { PayerntProvider, usePayernt } from "@/payernt/context";
import { PayerntNavbar } from "@/payernt/components/PayerntNavbar";
import { PayerntAuth } from "@/payernt/components/PayerntAuth";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payernt")({
  head: () =>
    getSeoMetadata({
      title: "paye₹nt — Turn Your Products Into Income | Peer-to-Peer Tech Gear Lending",
      description:
        "List what you own. Get it verified. Rent it out. Earn safely with paye₹nt peer-to-peer gear lending platform.",
      path: "/payernt",
    }),
  component: PayerntLayoutWrapper,
});

function PayerntPageTransitionOutlet() {
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
          ease: [0.16, 1, 0.3, 1],
        }}
        className="w-full"
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}

function PayerntLayout() {
  const {
    isAuthenticated,
    activeAccount,
    activeUser,
    login,
    logout,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    resetToDefaults,
    stats,
  } = usePayernt();

  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const isHomePage = currentPath === "/payernt" || currentPath === "/payernt/";
  const isWizardPage = currentPath.startsWith("/payernt/products/create") || currentPath === "/payernt/list";

  // Strict Authentication Gate for all lender routes
  if (!isAuthenticated) {
    return <PayerntAuth onAuthSuccess={(account) => login(account)} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary selection:text-primary-foreground">
      {/* Sticky Universal Payernt Navbar */}
      <PayerntNavbar
        pendingRequestsCount={stats.pendingRequestsCount}
        notifications={notifications}
        onMarkNotificationRead={markNotificationRead}
        onMarkAllNotificationsRead={markAllNotificationsRead}
        onResetDemo={resetToDefaults}
        activeUser={activeUser}
        activeAccount={activeAccount}
        onLogout={logout}
      />

      {/* Main Single-Page Dynamic Route View */}
      <main
        className={`flex-1 w-full ${
          isHomePage
            ? "max-w-none p-0"
            : isWizardPage
              ? "mx-auto max-w-[1650px] px-4 sm:px-6 lg:px-8 py-6"
              : "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8"
        }`}
      >
        <PayerntPageTransitionOutlet />
      </main>
    </div>
  );
}

function PayerntLayoutWrapper() {
  return (
    <PayerntProvider>
      <PayerntLayout />
    </PayerntProvider>
  );
}

export default Route;
