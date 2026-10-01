import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PayerntHome } from "@/payernt/components/PayerntHome";
import { usePayernt } from "@/payernt/context";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payernt/")({
  head: () =>
    getSeoMetadata({
      title: "Lender Dashboard | paye₹nt",
      description: "Overview of your gear listings, rental requests, earnings and live status.",
      path: "/payernt",
    }),
  component: PayerntHomeRoute,
});

function PayerntHomeRoute() {
  const navigate = useNavigate();
  const {
    stats,
    userProducts,
    rentalRequests,
    earningsTransactions,
    wallet,
    profile,
    notifications,
    messages,
    unreadMessagesCount,
    activeAccount,
    activeUser,
    logout,
    markNotificationRead,
    markAllNotificationsRead,
    markMessageRead,
  } = usePayernt();

  const handleNavigate = (tab: string) => {
    switch (tab) {
      case "products":
        navigate({ to: "/payernt/products" });
        break;
      case "list":
        navigate({ to: "/payernt/products/create" });
        break;
      case "requests":
      case "bookings":
        navigate({ to: "/payernt/bookings" });
        break;
      case "wallet":
        navigate({ to: "/payernt/wallet" });
        break;
      case "messages":
        navigate({ to: "/payernt/messages" });
        break;
      case "profile":
        navigate({ to: "/payernt/profile" });
        break;
      case "analytics":
      case "earnings":
        navigate({ to: "/payernt/analytics" });
        break;
      case "settings":
        navigate({ to: "/payernt/settings" });
        break;
      case "help":
        navigate({ to: "/payernt/help" });
        break;
      default:
        navigate({ to: "/payernt" });
        break;
    }
  };

  return (
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
      onNavigate={handleNavigate}
      onLogout={logout}
      onMarkNotificationRead={markNotificationRead}
      onMarkAllNotificationsRead={markAllNotificationsRead}
      onMarkMessageRead={markMessageRead}
      onSelectProductForManage={(id) => navigate({ to: `/payernt/products/${id}` as any })}
    />
  );
}

export default Route;
