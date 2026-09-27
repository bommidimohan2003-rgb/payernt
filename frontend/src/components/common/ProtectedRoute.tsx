import { ReactNode, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { storage, STORAGE_KEYS } from "@/utils/storage";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const navigate = useNavigate();

  const token = typeof window !== "undefined" ? storage.get<string | null>(STORAGE_KEYS.token, null) : null;
  const cachedUser = typeof window !== "undefined" ? storage.get(STORAGE_KEYS.currentUser, null) : null;
  const isAuthPresent = Boolean(user || token || cachedUser);

  useEffect(() => {
    if (ready) {
      if (!user) {
        const currentPath =
          typeof window !== "undefined" ? window.location.pathname : "";
        if (currentPath && currentPath !== "/login" && currentPath !== "/") {
          navigate({
            to: "/login",
            search: { redirect: currentPath + (window.location.search || "") } as any,
          });
        } else {
          navigate({ to: "/login" });
        }
      }
    }
  }, [ready, user, navigate]);

  // If user session exists, render children immediately
  if (user) {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
