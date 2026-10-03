import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePayerntStore } from "./store";
import { PayerntNavbar } from "./components/PayerntNavbar";
import { PayerntHome } from "./components/PayerntHome";
import { ListProductWizard } from "./components/ListProductWizard";
import { MyProducts } from "./components/MyProducts";
import { RentalRequests } from "./components/RentalRequests";
import { UserWalletView } from "./components/UserWallet";
import { LenderProfileView } from "./components/LenderProfile";
import { PayerntAuth } from "./components/PayerntAuth";
import { PayerntMessages } from "./components/PayerntMessages";

export function PayerntApp() {
  const [activeTab, setActiveTab] = useState<
    "home" | "products" | "requests" | "wallet" | "profile" | "list" | "messages"
  >(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (
        tabParam === "home" ||
        tabParam === "products" ||
        tabParam === "requests" ||
        tabParam === "wallet" ||
        tabParam === "profile" ||
        tabParam === "list" ||
        tabParam === "messages"
      ) {
        return tabParam;
      }
    }
    return "home";
  });

  // Sync tab changes with URL query
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && tabParam !== activeTab && ["home", "products", "requests", "wallet", "profile", "list", "messages"].includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    }
  }, []);

  const {
    activeAccount,
    isAuthenticated,
    login,
    logout,
    activeUser,
    products,
    userProducts,
    draftProduct,
    rentalRequests,
    earningsTransactions,
    wallet,
    notifications,
    messages,
    unreadMessagesCount,
    profile,
    stats,
    addProduct,
    saveDraft,
    clearDraft,
    updateProduct,
    deleteProduct,
    toggleAvailability,
    simulateVerificationChange,
    handleRequestAction,
    advanceRentalLifecycle,
    requestWithdrawal,
    addBankAccount,
    creditRentalPayment,
    resetWalletData,
    markNotificationRead,
    markAllNotificationsRead,
    markMessageRead,
    updateProfile,
    resetToDefaults,
    isLoadingDashboard,
    dashboardError,
    backendActivities,
    refreshDashboard,
  } = usePayerntStore();

  // If user is not authenticated in paye₹nt, render dedicated paye₹nt Login / Registration
  if (!isAuthenticated) {
    return <PayerntAuth onAuthSuccess={(account) => login(account)} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary selection:text-primary-foreground">
      {/* Main Container without top navbar */}
      <main className={`flex-1 w-full ${activeTab === "home" ? "max-w-none p-0" : "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8"}`}>
        <AnimatePresence mode="wait">
          {activeTab === "home" && (
            <div key="home" className="w-full">
              <PayerntHome
                stats={stats}
                products={userProducts}
                rentalRequests={rentalRequests}
                earningsTransactions={earningsTransactions}
                wallet={wallet}
                profile={profile}
                notifications={notifications}
                messages={messages}
                unreadMessagesCount={unreadMessagesCount}
                activeAccount={activeAccount}
                activeUser={activeUser}
                recentActivities={backendActivities}
                isLoading={isLoadingDashboard}
                error={dashboardError}
                onRefresh={refreshDashboard}
                onNavigate={(tab) => setActiveTab(tab)}
                onLogout={logout}
                onMarkNotificationRead={markNotificationRead}
                onMarkAllNotificationsRead={markAllNotificationsRead}
                onMarkMessageRead={markMessageRead}
              />
            </div>
          )}

          {activeTab === "list" && (
            <motion.div
              key="list-wizard"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Product Listing Multi-Step Wizard with Final Submission Security Gate */}
              <ListProductWizard
                initialDraft={draftProduct}
                onSaveDraft={saveDraft}
                onSubmitProduct={(product) => {
                  addProduct(product);
                  clearDraft();
                  setActiveTab("products");
                }}
                onCancel={() => setActiveTab("home")}
              />
            </motion.div>
          )}

          {activeTab === "products" && (
            <motion.div
              key="products"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <MyProducts
                products={userProducts}
                onToggleAvailability={toggleAvailability}
                onDeleteProduct={deleteProduct}
                onUpdateProduct={updateProduct}
                onAddNewGear={() => setActiveTab("list")}
                onNavigateToRequests={() => setActiveTab("requests")}
                onBack={() => setActiveTab("home")}
              />
            </motion.div>
          )}

          {activeTab === "requests" && (
            <motion.div
              key="requests"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <RentalRequests
                requests={rentalRequests}
                onRequestAction={handleRequestAction}
                onAdvanceLifecycle={advanceRentalLifecycle}
                onNavigateToWallet={() => setActiveTab("wallet")}
                onBack={() => setActiveTab("home")}
              />
            </motion.div>
          )}

          {activeTab === "wallet" && (
            <motion.div
              key="wallet"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <UserWalletView
                wallet={wallet}
                onRequestWithdrawal={requestWithdrawal}
                onAddBankAccount={addBankAccount}
                onSimulateCredit={creditRentalPayment}
                onResetWalletDemo={resetWalletData}
                onBack={() => setActiveTab("home")}
              />
            </motion.div>
          )}

          {activeTab === "messages" && (
            <motion.div
              key="messages"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <PayerntMessages
                messages={messages}
                products={userProducts}
                unreadCount={unreadMessagesCount}
                onBack={() => setActiveTab("home")}
                onMarkAsRead={(id) => markMessageRead(id)}
                onNavigateToProduct={() => {
                  setActiveTab("products");
                }}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            </motion.div>
          )}

          {activeTab === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <LenderProfileView
                profile={profile}
                activeAccount={activeAccount}
                onUpdateProfile={updateProfile}
                onResetDemo={resetToDefaults}
                onNavigateToProducts={() => setActiveTab("products")}
                onLogout={logout}
                onBack={() => setActiveTab("home")}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default PayerntApp;
