import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-auto py-5 px-6 md:px-8 border-t border-border/40 bg-card/20 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-(screen-2xl) mx-auto w-full">
        <span className="text-xs font-semibold text-muted-foreground">
          © 2026 Payent Inc. All rights reserved.
        </span>
        <div className="flex items-center gap-6 text-xs font-semibold text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">
            Terms of Service
          </a>
          <a href="#" className="hover:text-foreground transition-colors">
            Privacy Policy
          </a>
          <span className="text-muted-foreground/60 select-none">v2.0 Enterprise</span>
        </div>
      </div>
    </footer>
  );
}
