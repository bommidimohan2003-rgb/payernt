import { createFileRoute, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useReducedMotion, motion, AnimatePresence } from "framer-motion";
import { PayerntProvider, usePayernt } from "@/payernt/context";
import { PayerntNavbar } from "@/payernt/components/PayerntNavbar";
import { PayerntSidebar } from "@/payernt/components/PayerntSidebar";
import { PayerntMobileBottomNav } from "@/payernt/components/PayerntMobileBottomNav";
import { PayerntAuth } from "@/payernt/components/PayerntAuth";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payernt")({
  head: () =>
    getSeoMetadata({
      title: "Payernt — Turn Your Products Into Income | Peer-to-Peer Tech Gear Lending",
      description:
        "List what you own. Get it verified. Rent it out. Earn safely with Payernt peer-to-peer gear lending platform.",
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
    unreadMessagesCount,
  } = usePayernt();

  // Strict Authentication Gate for all lender routes
  if (!isAuthenticated) {
    return <PayerntAuth onAuthSuccess={(account) => login(account)} />;
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#07090e] text-neutral-900 dark:text-foreground flex flex-col font-sans selection:bg-neutral-200 dark:selection:bg-neutral-800 selection:text-neutral-900 dark:selection:text-white transition-colors duration-200">
      {/* Sticky Minimal Payernt Navbar */}
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

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 flex w-full max-w-[1700px] mx-auto p-3 sm:p-4 md:p-6 pb-24 md:pb-6 gap-3 sm:gap-5 items-stretch">
        {/* Left Sidebar (Desktop Only) */}
        <PayerntSidebar
          pendingRequestsCount={stats.pendingRequestsCount}
          unreadMessagesCount={unreadMessagesCount}
        />

        {/* Dynamic Route View */}
        <main className="flex-1 min-w-0 w-full">
          <PayerntPageTransitionOutlet />
        </main>
      </div>

      {/* Fixed Mobile Bottom Navigation */}
      <PayerntMobileBottomNav
        pendingRequestsCount={stats.pendingRequestsCount}
        unreadMessagesCount={unreadMessagesCount}
        onLogout={logout}
      />
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
