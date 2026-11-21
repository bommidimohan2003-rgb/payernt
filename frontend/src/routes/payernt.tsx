import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
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

  return (
    <div key={currentPath} className="w-full animate-in fade-in duration-100">
      <Outlet />
    </div>
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
    userProducts,
    rentalRequests,
  } = usePayernt();

  // Strict Authentication Gate for all lender routes
  if (!isAuthenticated) {
    return <PayerntAuth onAuthSuccess={(account) => login(account)} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-foreground transition-colors duration-200">
      {/* Sticky Minimal Payernt Navbar */}
      <PayerntNavbar
        pendingRequestsCount={stats.pendingRequestsCount}
        notifications={notifications}
        products={userProducts}
        rentalRequests={rentalRequests}
        onMarkNotificationRead={markNotificationRead}
        onMarkAllNotificationsRead={markAllNotificationsRead}
        onResetDemo={resetToDefaults}
        activeUser={activeUser}
        activeAccount={activeAccount}
        onLogout={logout}
      />

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 flex w-full max-w-[1400px] mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 pb-24 sm:pb-6 gap-3 sm:gap-5 items-start">
        {/* Left Sidebar (Desktop Only) */}
        <PayerntSidebar
          pendingRequestsCount={stats.pendingRequestsCount}
          unreadMessagesCount={unreadMessagesCount}
          onLogout={logout}
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
