import { Link } from "@tanstack/react-router";
import { Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
import { LogoIcon } from "@/components/common/LogoIcon";

const navLinks = [
  { label: "Home", to: "/payent" },
  { label: "Explore", to: "/browse" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

const socials = [
  { icon: Instagram, href: "https://instagram.com", label: "Instagram" },
  { icon: Youtube, href: "https://youtube.com", label: "YouTube" },
  { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
  { icon: Twitter, href: "https://x.com", label: "X" },
];

export function Footer() {
  return (
    <footer className="bg-white dark:bg-[#05090D] border-t border-black/10 dark:border-white/10 text-neutral-900 dark:text-white py-8 sm:py-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8">
          {/* Left: Brand Monogram & Tagline */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <LogoIcon />
          </Link>

          {/* Center: Clean Nav Links matching reference */}
          <nav className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-xs sm:text-sm text-neutral-600 dark:text-[#A8B1BA]">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="hover:text-black dark:hover:text-white transition-colors duration-200"
                activeProps={{
                  className:
                    "text-neutral-950 dark:text-white font-semibold underline decoration-neutral-400 dark:decoration-neutral-600 underline-offset-4",
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right: Social Icons & Copyright */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 shrink-0">
            {/* Social Icons */}
            <div className="flex items-center gap-2.5">
              {socials.map((s) => {
                const Icon = s.icon;
                return (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="h-7 w-7 rounded-full bg-neutral-100 dark:bg-[#0D151D] border border-black/10 dark:border-white/15 text-neutral-600 dark:text-[#A8B1BA] hover:text-black dark:hover:text-white hover:border-black/30 dark:hover:border-white/30 flex items-center justify-center transition-colors"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </a>
                );
              })}
            </div>

            {/* Copyright */}
            <p className="text-xs text-neutral-500 dark:text-[#A8B1BA]">
              &copy; {new Date().getFullYear()} PAYENT. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
