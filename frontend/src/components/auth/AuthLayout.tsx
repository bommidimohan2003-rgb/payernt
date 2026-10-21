import { Link, useLocation } from "@tanstack/react-router";
import { MainLayout } from "@/layouts/MainLayout";
import {
  CheckCircle2,
  ShieldCheck,
  Camera,
  Shield,
  Zap,
  ArrowRight,
  Sparkles,
} from "lucide-react";
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
  title = "Welcome, Payrent",
  subtitle = "Find what you need and rent it with ease.",
  role = "payrent",
}: AuthLayoutProps) {
  const location = useLocation();
  const isPayrent = role === "payrent";

  return (
    <MainLayout>
      <section className="relative min-h-[calc(100vh-70px)] flex items-center justify-center px-4 py-8 sm:px-6 md:px-8 lg:py-12 overflow-x-hidden bg-gradient-to-b from-background via-muted/20 to-background">
        {/* Subtle geometric background elements using theme tokens (no stock photos) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[340px] bg-primary/5 dark:bg-primary/10 rounded-full blur-[140px] opacity-70" />
          <div className="absolute bottom-1/4 right-1/4 w-[420px] h-[300px] bg-accent/5 dark:bg-emerald-500/10 rounded-full blur-[120px] opacity-50" />
          {/* Subtle fine geometric tech grid */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:32px_32px]" />
        </div>

        {/* Two-Column Composition on Desktop / Single-Column on Mobile */}
        <div className="relative z-10 w-full max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Section — Brand and Introduction */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-6 lg:space-y-8 text-left">
              {/* Brand Logo & Role Identity */}
              <div className="space-y-4">
                <Link
                  to="/"
                  className="inline-flex items-center gap-3 group select-none cursor-pointer focus:outline-none"
                  aria-label="Payent Home"
                >
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-950 dark:bg-white p-0.5 shadow-md transition-transform group-hover:scale-105">
                    <img
                      src="/brand/payent-logo-icon.webp"
                      alt="Payent"
                      className="h-full w-full object-contain rounded-[14px]"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                    <span className="font-display font-black text-white dark:text-neutral-950 text-lg">
                      P
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-display font-black tracking-tight text-2xl text-foreground leading-none">
                      Payent
                    </span>
                    <span className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase mt-1">
                      {isPayrent ? "Payrent Platform" : "Payernt Platform"}
                    </span>
                  </div>
                </Link>

                {/* Role Identification Pill */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border/80 text-foreground text-xs font-bold tracking-wide shadow-2xs">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>
                    {isPayrent
                      ? "Payrent • Customer Rental Portal"
                      : "Payernt • Product Owner Platform"}
                  </span>
                </div>
              </div>

              {/* Headline & Supporting Text */}
              <div className="space-y-2.5">
                <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-foreground tracking-tight font-display leading-[1.15]">
                  {title}
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground font-normal leading-relaxed max-w-md">
                  {subtitle}
                </p>
              </div>

              {/* Geometric Fine-Line Feature Badges (Desktop visible) */}
              <div className="hidden lg:flex flex-col space-y-3.5 pt-2">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-secondary/50 dark:bg-card/40 border border-border/60">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 text-foreground flex items-center justify-center shrink-0 mt-0.5">
                    <Camera className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">Verified Creator Equipment</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Cinema cameras, lenses, drones, and pro audio gear tested before dispatch.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-secondary/50 dark:bg-card/40 border border-border/60">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 text-foreground flex items-center justify-center shrink-0 mt-0.5">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">Zero Security Deposit</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Rent freely with verified identity and damage protection coverage.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-secondary/50 dark:bg-card/40 border border-border/60">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 text-foreground flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">Instant Booking & Delivery</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Flexible daily, weekend, and monthly rental terms with doorstep handover.
                    </p>
                  </div>
                </div>
              </div>

              {/* Fine Bottom Accent Divider */}
              <div className="pt-2 border-t border-border/50 hidden lg:flex items-center gap-4 text-[11px] text-muted-foreground font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  Verified Tech Community
                </span>
                <span className="h-1 w-1 rounded-full bg-border" />
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  256-Bit SSL Protection
                </span>
              </div>
            </div>

            {/* Right Section — Authentication Form Card */}
            <div className="lg:col-span-7 flex justify-center">
              <div
                className={cn(
                  "w-full card-premium p-6 sm:p-8 shadow-2xl border border-border/80 bg-card/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl space-y-5 transition-all duration-300",
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

                {/* Form Heading on Mobile (when left column collapses) */}
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

                {/* Form Children Component */}
                <div className="space-y-4 pt-1">{children}</div>

                {/* Card Security Footnote */}
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
