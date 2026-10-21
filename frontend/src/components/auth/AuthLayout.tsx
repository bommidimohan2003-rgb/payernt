import { Link, useLocation } from "@tanstack/react-router";
import { MainLayout } from "@/layouts/MainLayout";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthLayoutProps {
  children: React.ReactNode;
  mode: "login" | "register" | "forgot-password" | "reset-password";
  title?: string;
  subtitle?: string;
  role?: "payrent" | "payernt";
}

export function AuthLayout({
  children,
  mode,
  title = "Welcome to Payent",
  subtitle = "Find what you need and rent it with ease.",
}: AuthLayoutProps) {
  const location = useLocation();

  return (
    <MainLayout>
      <section className="relative min-h-[calc(100vh-70px)] flex items-center justify-center px-4 py-8 sm:px-6 md:px-8 lg:py-16 overflow-x-hidden bg-background">
        {/* Subtle soft ambient glow without distracting grid patterns */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[320px] bg-primary/5 dark:bg-primary/10 rounded-full blur-[140px] opacity-60" />
          <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[280px] bg-accent/5 dark:bg-emerald-500/10 rounded-full blur-[130px] opacity-40" />
        </div>

        {/* Clean Two-Column Composition: Left minimal branding, Right adjusted form */}
        <div className="relative z-10 w-full max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
            {/* Left Section — Only "Welcome to Payent" branding at the top */}
            <div className="lg:col-span-5 flex flex-col justify-center space-y-4 text-left">
              {/* Clean Payent Logo */}
              <Link
                to="/"
                className="inline-flex items-center gap-3 group select-none cursor-pointer focus:outline-none w-fit"
                aria-label="Payent Home"
              >
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-950 dark:bg-white p-1.5 shadow-sm transition-transform group-hover:scale-105">
                  <img
                    src="/brand/payent-logo-icon.webp"
                    alt="Payent Logo"
                    className="h-full w-full object-contain rounded-xl"
                  />
                </div>
                <span className="font-display font-black tracking-tight text-2xl text-foreground leading-none">
                  Payent
                </span>
              </Link>

              {/* Single Headline at Top of Left Side */}
              <div className="space-y-2 pt-1">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight font-display leading-[1.15]">
                  Welcome to Payent
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground font-normal leading-relaxed max-w-md">
                  {subtitle}
                </p>
              </div>
            </div>

            {/* Right Section — Adjusted Clean Authentication Form */}
            <div className="lg:col-span-7 flex justify-center lg:justify-end">
              <div
                className={cn(
                  "w-full card-premium p-6 sm:p-8 shadow-xl border border-border/80 bg-card/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl space-y-5 transition-all duration-300",
                  mode === "register" ? "max-w-xl" : "max-w-md",
                )}
              >
                {/* Switcher Navigation Tabs: Sign In / Create Account */}
                {mode !== "forgot-password" && mode !== "reset-password" && (
                  <div className="flex items-center rounded-2xl bg-secondary/80 p-1.5 border border-border/80">
                    <Link
                      to="/login"
                      className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all duration-200 text-center cursor-pointer ${
                        location.pathname === "/login"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/register"
                      className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all duration-200 text-center cursor-pointer ${
                        location.pathname === "/register"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Create Account
                    </Link>
                  </div>
                )}

                {/* Heading on Mobile */}
                <div className="lg:hidden space-y-1 text-center sm:text-left pb-1">
                  <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight font-display">
                    {mode === "login" ? "Sign In to Payrent" : "Create Payrent Account"}
                  </h2>
                  <p className="text-xs text-muted-foreground font-normal">
                    {mode === "login"
                      ? "Enter your credentials to access your rentals."
                      : "Fill in your details below to get started."}
                  </p>
                </div>

                {/* Form Children */}
                <div className="space-y-4 pt-1">{children}</div>

                {/* Security Footnote */}
                <div className="pt-4 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    256-Bit SSL Encrypted
                  </span>
                  <span>Instant Protection</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
