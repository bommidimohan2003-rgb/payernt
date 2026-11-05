import { MainLayout } from "@/layouts/MainLayout";
import { AuthGearShowcase } from "@/components/auth/AuthGearShowcase";
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
  return (
    <MainLayout>
      <section className="relative min-h-[calc(100vh-70px)] flex items-start justify-center px-4 pt-1 pb-8 sm:px-6 md:px-8 lg:pt-3 lg:pb-12 overflow-x-hidden bg-background dark:bg-[#1E1E1E]">
        {/* Subtle soft ambient glow without distracting grid patterns */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[320px] bg-primary/5 dark:bg-primary/5 rounded-full blur-[140px] opacity-40" />
          <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[280px] bg-accent/5 dark:bg-emerald-500/5 rounded-full blur-[130px] opacity-30" />
        </div>

        {/* Clean Two-Column Composition: Left Gear Showcase from image, Right authentication form */}
        <div className="relative z-10 w-full max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Section – Gear Showcase matching user image exactly in both themes */}
            <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-start">
              <AuthGearShowcase title={title} subtitle={subtitle} />
            </div>

            {/* Right Section – Clean Compact Authentication Form Card with #1E1E1E 4DP Dark Elevation */}
            <div className="lg:col-span-6 xl:col-span-6 flex justify-center lg:justify-end">
              <div
                className={cn(
                  "w-full p-5 sm:p-6.5 shadow-xl border border-border/80 bg-card/95 dark:bg-[#1E1E1E] dark:border-[#2D2D2D] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5),0_1px_3px_rgba(0,0,0,0.4)] backdrop-blur-2xl rounded-2xl space-y-3.5 sm:space-y-4 transition-all duration-300",
                  mode === "register" ? "max-w-lg" : "max-w-[420px]",
                )}
              >
                {/* Form Heading */}
                <div className="space-y-1 text-left pb-1">
                  <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight font-display">
                    {mode === "login"
                      ? "Sign In"
                      : mode === "register"
                        ? "Create Account"
                        : mode === "forgot-password"
                          ? "Reset Password"
                          : "Set New Password"}
                  </h2>
                  <p className="text-xs text-muted-foreground font-normal">
                    {mode === "login"
                      ? "Enter your credentials to access your rentals."
                      : mode === "register"
                        ? "Fill in your details below to get started."
                        : "Enter your email to receive recovery instructions."}
                  </p>
                </div>

                {/* Form Children */}
                <div className="space-y-3 pt-0.5">{children}</div>

                {/* Security Footnote */}
                <div className="pt-3 border-t border-border/60 dark:border-[#2D2D2D] flex items-center justify-between text-[11px] text-muted-foreground font-medium">
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
