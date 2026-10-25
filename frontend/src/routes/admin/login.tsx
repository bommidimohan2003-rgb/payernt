import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { authService } from "@/admin/services/auth";

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginRedirect,
});

function AdminLoginRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    authService.verifyAdminSession().then(({ isValid }) => {
      if (!isMounted) return;
      if (isValid) {
        navigate({ to: "/admin/dashboard" });
      } else {
        navigate({
          to: "/login",
          search: { redirect: "/admin/dashboard" } as any,
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070B14]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
    </div>
  );
}

export default Route;
