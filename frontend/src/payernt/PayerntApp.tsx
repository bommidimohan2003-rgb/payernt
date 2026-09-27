import React, { useState } from "react";
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

export function PayerntApp() {
  const [activeTab, setActiveTab] = useState<
    "home" | "products" | "requests" | "wallet" | "profile" | "list"
  >("home");

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
    updateProfile,
    resetToDefaults,
  } = usePayerntStore();

  // If user is not authenticated in paye₹nt, render dedicated paye₹nt Login / Registration
  if (!isAuthenticated) {
    return <PayerntAuth onAuthSuccess={(account) => login(account)} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary selection:text-primary-foreground">
      {/* Top Navbar */}
      <PayerntNavbar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        pendingRequestsCount={stats.pendingRequestsCount}
        notifications={notifications}
        onMarkNotificationRead={markNotificationRead}
        onMarkAllNotificationsRead={markAllNotificationsRead}
        onResetDemo={resetToDefaults}
        activeUser={activeUser}
        activeAccount={activeAccount}
        onLogout={logout}
      />

      {/* Main Container */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <AnimatePresence mode="wait">
          {activeTab === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <PayerntHome
                stats={stats}
                products={userProducts}
                rentalRequests={rentalRequests}
                earningsTransactions={earningsTransactions}
                onNavigate={(tab) => setActiveTab(tab)}
              />
            </motion.div>
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
                onCancel={() => setActiveTab("products")}
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
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default PayerntApp;
