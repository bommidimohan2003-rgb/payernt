import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronDown,
  Mail,
  Clock,
  Download,
  Shield,
} from "lucide-react";
import { LogoIcon } from "@/components/common/LogoIcon";
import { cn } from "@/lib/utils";
import { BUSINESS_INFO } from "@/config/businessInfo";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface FooterGroup {
  id: string;
  title: string;
  items?: { label: string; href?: string; to?: string; hash?: string; external?: boolean; onClick?: () => void }[];
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
        { label: "Privacy Policy", to: "/privacy" },
        { label: "Terms of Service", to: "/terms" },
        { label: "Cookie Policy", to: "/cookies" },
        { label: "Refund & Cancellation Policy", to: "/refund-policy" },
        {
          label: "Cookie Settings",
          onClick: () => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("payent:open_cookie_settings"));
            }
          },
        },
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
            <a href={`mailto:${BUSINESS_INFO.supportEmail}`} className="hover:underline text-neutral-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white rounded truncate">
              {BUSINESS_INFO.supportEmail}
            </a>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0 stroke-[1.75] text-neutral-800 dark:text-neutral-200" aria-hidden="true" />
            <span>{BUSINESS_INFO.supportHours}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 shrink-0 stroke-[1.75] text-neutral-800 dark:text-neutral-200" aria-hidden="true" />
            <span>Secure Holding &amp; ID Verified</span>
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

        {/* Desktop: Single horizontal 5-col row on lg+, 3-col on md */}
        <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-5 gap-3.5 lg:gap-4">
          {groups.map((g) => (
            <div key={g.id} className="flex flex-col gap-1 min-w-0">
              <h3 className="text-xs font-semibold text-neutral-900 dark:text-white">
                {g.title}
              </h3>
              {g.items ? (
                <ul className="flex flex-col gap-0.5">
                  {g.items.map((item) => (
                    <li key={item.label}>
                      {item.onClick ? (
                        <button
                          type="button"
                          onClick={item.onClick}
                          className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white rounded leading-tight text-left cursor-pointer"
                        >
                          {item.label}
                        </button>
                      ) : item.to ? (
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
                            {item.onClick ? (
                              <button
                                type="button"
                                onClick={item.onClick}
                                className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors block py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white rounded text-left cursor-pointer"
                              >
                                {item.label}
                              </button>
                            ) : item.to ? (
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
          <p>&copy; {new Date().getFullYear()} {BUSINESS_INFO.brandName} Marketplace. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link to="/privacy" className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white rounded">Privacy</Link>
            <Link to="/terms" className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white rounded">Terms</Link>
            <Link to="/cookies" className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white rounded">Cookies</Link>
            <Link to="/refund-policy" className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white rounded">Refunds</Link>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("payent:open_cookie_settings"));
                }
              }}
              className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white rounded cursor-pointer"
            >
              Cookie Settings
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
