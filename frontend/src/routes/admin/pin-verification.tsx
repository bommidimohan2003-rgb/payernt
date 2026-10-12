import { createFileRoute } from "@tanstack/react-router";
import PinVerification from "@/admin/pages/PinVerification";

export const Route = createFileRoute("/admin/pin-verification")({
  component: PinVerification,
});
export default Route;
