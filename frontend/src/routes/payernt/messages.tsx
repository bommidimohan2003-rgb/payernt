import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PayerntMessages } from "@/payernt/components/PayerntMessages";
import { usePayernt } from "@/payernt/context";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payernt/messages")({
  head: () =>
    getSeoMetadata({
      title: "Lender Messages & Inquiries | paye₹nt",
      description: "Chat with renters, review admin notices and coordinate gear inspections.",
      path: "/payernt/messages",
    }),
  component: PayerntMessagesRoute,
});

function PayerntMessagesRoute() {
  const navigate = useNavigate();
  const {
    messages,
    userProducts,
    unreadMessagesCount,
    markMessageRead,
  } = usePayernt();

  return (
    <PayerntMessages
      messages={messages}
      products={userProducts}
      unreadCount={unreadMessagesCount}
      onBack={() => navigate({ to: "/payernt" })}
      onMarkAsRead={markMessageRead}
      onNavigateToProduct={() => navigate({ to: "/payernt/products" })}
      onNavigateTab={(tab) => {
        if (tab === "home") navigate({ to: "/payernt" });
        else if (tab === "products") navigate({ to: "/payernt/products" });
        else if (tab === "requests") navigate({ to: "/payernt/bookings" });
        else if (tab === "wallet") navigate({ to: "/payernt/wallet" });
        else if (tab === "profile") navigate({ to: "/payernt/profile" });
        else if (tab === "list") navigate({ to: "/payernt/products/create" });
      }}
    />
  );
}

export default Route;
