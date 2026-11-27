import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { authService } from "@/admin/services/auth";

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginRedirect,
});

function AdminLoginRedirect() {
  const navigate = useNavigate();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    authService.verifyAdminSession().then(({ isValid }) => {
      if (!isMounted || hasRedirectedRef.current) return;
      hasRedirectedRef.current = true;
      if (isValid) {
        navigate({ to: "/admin/dashboard", replace: true });
      } else {
        navigate({
          to: "/login",
          search: { redirect: "/admin/dashboard" } as any,
          replace: true,
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--admin-bg)]">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--admin-border)] border-t-[var(--admin-text)]" />
    </div>
  );
}

export default Route;
