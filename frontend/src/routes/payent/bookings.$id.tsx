import { createFileRoute } from "@tanstack/react-router";
import BookingDetails from "@/pages/BookingDetails";
import { getSeoMetadata } from "@/utils/seo";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";

export const Route = createFileRoute("/payent/bookings/$id")({
  head: ({ params }) => {
    const id = params?.id || "";
    return getSeoMetadata({
      title: `Booking Details #${id} | pay₹ent`,
      description:
        "View verified booking confirmation, rental dates, delivery tracking, and vendor details.",
      path: `/payent/bookings/${id}`,
    });
  },
  component: () => (
    <ProtectedRoute>
      <BookingDetails />
    </ProtectedRoute>
  ),
});

export default Route;
