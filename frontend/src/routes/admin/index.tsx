import { createFileRoute, redirect } from "@tanstack/react-router";
import { authService } from "@/admin/services/auth";

export const Route = createFileRoute("/admin/")({
  beforeLoad: () => {
    const loggedIn = authService.isAuthenticated();
    if (loggedIn) {
      throw redirect({ to: "/admin/dashboard" });
    } else {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: () => null,
});
export default Route;
