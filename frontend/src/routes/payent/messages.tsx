import { createFileRoute } from "@tanstack/react-router";
import Messages from "@/pages/Messages";
import { getSeoMetadata } from "@/utils/seo";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";

export const Route = createFileRoute("/payent/messages")({
  head: () =>
    getSeoMetadata({
      title: "Renter Messages | pay₹ent",
      description: "Chat with verified lenders to coordinate rental handovers.",
      path: "/payent/messages",
    }),
  component: () => (
    <ProtectedRoute>
      <Messages />
    </ProtectedRoute>
  ),
});
