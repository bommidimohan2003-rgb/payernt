import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronDown,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Mail,
  Clock,
  Download,
  Shield,
} from "lucide-react";
import { LogoIcon } from "@/components/common/LogoIcon";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface FooterGroup {
  id: string;
  title: string;
  items?: { label: string; href?: string; to?: string; hash?: string; external?: boolean }[];
  customContent?: React.ReactNode;
}

export function Footer() {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleInstallWebApp = async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } finally {
      setInstallPrompt(null);
    }
  };

  const toggleGroup = (id: string) => {
    setOpenGroup((prev) => (prev === id ? null : id));
  };

  const groups: FooterGroup[] = [
    {
      id: "about",
      title: "About paYent",
      items: [
        { label: "About Our Platform", to: "/about" },
        { label: "Browse Catalog", to: "/browse" },
        { label: "All Categories", to: "/categories" },
        { label: "Become a Lender", to: "/become-lender" },
      ],
    },
    {
      id: "support",
      title: "Customer Support",
      items: [
        { label: "Help Center & FAQ", to: "/faq" },
        { label: "Contact Support", to: "/contact" },
        { label: "Rental Orders", to: "/orders" },
        { label: "KYC Verification", to: "/kyc" },
      ],
    },
    {
      id: "legal",
      title: "Legal & Policies",
      items: [
        { label: "Privacy Policy", to: "/privacy", hash: "privacy-policy" },
        { label: "Terms of Service", to: "/privacy", hash: "terms-of-service" },
        { label: "Cancellation & Refund Rules", to: "/support", hash: "cancellation-refunds" },
        { label: "Rental Agreement & Escrow", to: "/about", hash: "rental-agreement-escrow" },
      ],
    },
    {
      id: "app",
      title: "Download Our App",
      customContent: (
        <div className="flex flex-col gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 leading-snug">
          <p>Install the paYent progressive web app.</p>
          {installPrompt ? (
            <button
              type="button"
              onClick={handleInstallWebApp}
              className="inline-flex items-center justify-center gap-1.5 self-start min-h-[36px] px-3 py-1.5 rounded-xl border border-neutral-950 dark:border-white bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-semibold hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 stroke-[1.75]" aria-hidden="true" />
              <span>Install Web App</span>
            </button>
          ) : (
            <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
              Use browser menu → Add to Home Screen.
            </p>
          )}
        </div>
      ),
    },
    {
      id: "contact",
      title: "Contact Information",
      customContent: (
        <div className="flex flex-col gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
          <div className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 shrink-0 stroke-[1.75] text-neutral-800 dark:text-neutral-200" aria-hidden="true" />
            <a href="mailto:support@payent.com" className="hover:underline text-neutral-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white rounded truncate">
              support@payent.com
            </a>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0 stroke-[1.75] text-neutral-800 dark:text-neutral-200" aria-hidden="true" />
            <span>Mon–Sat: 9 AM–7 PM IST</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 shrink-0 stroke-[1.75] text-neutral-800 dark:text-neutral-200" aria-hidden="true" />
            <span>Escrow &amp; ID Protected</span>
          </div>
        </div>
      ),
    },
    {
      id: "social",
      title: "Social Media",
      customContent: (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-snug">
            Creator updates &amp; new gear drops.
          </p>
          <div className="flex items-center gap-1.5">
            <a
              href="https://twitter.com/payent"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter / X"
              className="h-10 w-10 sm:h-8 sm:w-8 rounded-full border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-800 dark:text-neutral-200 hover:border-neutral-950 dark:hover:border-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
            >
              <Twitter className="h-3.5 w-3.5 stroke-[1.75]" aria-hidden="true" />
            </a>
            <a
              href="https://instagram.com/payent"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="h-10 w-10 sm:h-8 sm:w-8 rounded-full border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-800 dark:text-neutral-200 hover:border-neutral-950 dark:hover:border-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
            >
              <Instagram className="h-3.5 w-3.5 stroke-[1.75]" aria-hidden="true" />
            </a>
            <a
              href="https://linkedin.com/company/payent"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="h-10 w-10 sm:h-8 sm:w-8 rounded-full border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-800 dark:text-neutral-200 hover:border-neutral-950 dark:hover:border-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
            >
              <Linkedin className="h-3.5 w-3.5 stroke-[1.75]" aria-hidden="true" />
            </a>
            <a
              href="https://youtube.com/@payent"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
              className="h-10 w-10 sm:h-8 sm:w-8 rounded-full border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-800 dark:text-neutral-200 hover:border-neutral-950 dark:hover:border-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
            >
              <Youtube className="h-3.5 w-3.5 stroke-[1.75]" aria-hidden="true" />
            </a>
          </div>
        </div>
      ),
    },
  ];

  return (
    <footer className="w-full bg-white dark:bg-[#1E1E1E] text-neutral-900 dark:text-white border-t border-neutral-200 dark:border-neutral-800 transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3.5">
        {/* Top Brand Banner */}
        <div className="flex flex-row items-center justify-between pb-2 mb-2.5 border-b border-neutral-100 dark:border-neutral-800/80 gap-2">
          <Link to="/payent" className="flex items-center gap-2 shrink-0 group select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white rounded-lg">
            <LogoIcon />
          </Link>
          <div className="text-[11px] sm:text-xs text-neutral-600 dark:text-neutral-400 truncate">
            Get What You Need, Without Owning It.
          </div>
        </div>

        {/* Desktop: Single horizontal 6-col row on lg+, 3-col on md */}
        <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-6 gap-3.5 lg:gap-4">
          {groups.map((g) => (
            <div key={g.id} className="flex flex-col gap-1 min-w-0">
              <h3 className="text-xs font-semibold text-neutral-900 dark:text-white">
                {g.title}
              </h3>
              {g.items ? (
                <ul className="flex flex-col gap-0.5">
                  {g.items.map((item) => (
                    <li key={item.label}>
                      {item.to ? (
                        <Link
                          to={item.to}
                          hash={item.hash}
                          className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white rounded leading-tight"
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <a
                          href={item.href || "#"}
                          className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white rounded leading-tight"
                        >
                          {item.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                g.customContent
              )}
            </div>
          ))}
        </div>

        {/* Mobile: Compact Accordion Layout (one open at a time) */}
        <div className="flex md:hidden flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
          {groups.map((g) => {
            const isOpen = openGroup === g.id;
            return (
              <div key={g.id}>
                <button
                  type="button"
                  onClick={() => toggleGroup(g.id)}
                  aria-expanded={isOpen}
                  className="w-full min-h-[44px] flex items-center justify-between text-left text-xs font-semibold text-neutral-900 dark:text-white py-1 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white rounded-md cursor-pointer"
                >
                  <span>{g.title}</span>
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      "h-4 w-4 stroke-[1.75] text-neutral-600 dark:text-neutral-400 transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="pt-0.5 pb-1.5 text-xs">
                    {g.items ? (
                      <ul className="flex flex-col gap-1">
                        {g.items.map((item) => (
                          <li key={item.label}>
                            {item.to ? (
                              <Link
                                to={item.to}
                                hash={item.hash}
                                className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors block py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white rounded"
                              >
                                {item.label}
                              </Link>
                            ) : (
                              <a
                                href={item.href || "#"}
                                className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors block py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white rounded"
                              >
                                {item.label}
                              </a>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      g.customContent
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Copyright & Legal note */}
        <div className="mt-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-1.5 text-[11px] sm:text-xs text-neutral-600 dark:text-neutral-400">
          <p>&copy; {new Date().getFullYear()} paYent Marketplace. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" hash="privacy-policy" className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white rounded">Privacy</Link>
            <Link to="/privacy" hash="terms-of-service" className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white rounded">Terms</Link>
            <Link to="/support" hash="security-protocol" className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white rounded">Security</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
