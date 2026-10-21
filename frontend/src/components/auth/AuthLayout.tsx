import { Link, useLocation } from "@tanstack/react-router";
import { MainLayout } from "@/layouts/MainLayout";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthLayoutProps {
  children: React.ReactNode;
  mode: "login" | "register" | "forgot-password" | "reset-password";
  title: string;
  subtitle: string;
}

export function AuthLayout({
  children,
  mode,
  title,
  subtitle,
}: AuthLayoutProps) {
  const location = useLocation();

  return (
    <MainLayout>
      <section className="relative min-h-[calc(100vh-70px)] flex items-center justify-center p-4 sm:p-6 md:p-8 pb-24 md:pb-12 overflow-y-auto bg-gradient-to-b from-background via-muted/30 to-background">
        {/* Subtle decorative ambient glow for clean modern aesthetic without background photos */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[360px] bg-primary/10 dark:bg-primary/15 rounded-full blur-[120px] opacity-60" />
          <div className="absolute bottom-1/4 left-1/3 -translate-x-1/2 w-[400px] h-[300px] bg-accent/10 dark:bg-accent/15 rounded-full blur-[100px] opacity-40" />
        </div>

        {/* CENTERED AUTHENTICATION CARD */}
        <div className="relative z-10 w-full max-w-7xl mx-auto flex justify-center items-center">
          <div
            className={cn(
              "w-full card-premium p-6 sm:p-8 shadow-2xl border border-border/80 bg-card/95 dark:bg-slate-900/90 backdrop-blur-2xl rounded-3xl space-y-5 transition-all duration-300",
              mode === "register" ? "max-w-xl lg:max-w-2xl" : "max-w-md",
            )}
          >
            {/* Header Navigation Tabs: Sign In / Create Account */}
            {mode !== "forgot-password" && mode !== "reset-password" && (
              <div className="flex items-center rounded-2xl bg-secondary/80 p-1.5 border border-border/80">
                <Link
                  to="/login"
                  className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all duration-200 text-center cursor-pointer ${
                    location.pathname === "/login"
                      ? "bg-background text-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all duration-200 text-center cursor-pointer ${
                    location.pathname === "/register"
                      ? "bg-background text-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Create Account
                </Link>
              </div>
            )}

            {/* Title & Subtitle */}
            <div className="space-y-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold tracking-wide uppercase mb-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Payent Authentication
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight font-display">
                {title}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground font-normal leading-relaxed">
                {subtitle}
              </p>
            </div>

            {/* Form Children */}
            <div className="space-y-4 pt-1">{children}</div>

            {/* Security Footnote */}
            <div className="pt-4 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                256-Bit SSL Encrypted Security
              </span>
              <span>Instant Protection</span>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
