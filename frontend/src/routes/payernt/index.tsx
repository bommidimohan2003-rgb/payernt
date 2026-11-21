import { createFileRoute } from "@tanstack/react-router";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payernt/")({
  head: () =>
    getSeoMetadata({
      title: "Home | Payernt",
      description: "Payernt lender home page.",
      path: "/payernt",
    }),
  component: PayerntHomePage,
});

function PayerntHomePage() {
  return (
    <div className="w-full min-h-[65vh] flex flex-col items-center justify-center p-6 text-center">
      {/* Intentionally empty home page as requested */}
    </div>
  );
}

export default Route;
