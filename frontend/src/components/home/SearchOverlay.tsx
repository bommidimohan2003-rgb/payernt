import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Search,
  X,
  Clock,
  Trash2,
  MapPin,
  TrendingUp,
  ArrowRight,
  Navigation,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/utils/api";
import { useAuth } from "@/hooks/useAuth";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import type { Product } from "@/types";
import { CANONICAL_CATEGORIES } from "@/components/home/Categories";
import { cn } from "@/lib/utils";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const searchSeqRef = useRef(0);

  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Location search state
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [pincode, setPincode] = useState<string>("");
  const [gpsLocation, setGpsLocation] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Focus input on open, lock body scroll, handle global Escape & focus trap, and restore focus on close
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current =
        typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;
      document.body.style.overflow = "hidden";
      const focusTimer = setTimeout(() => inputRef.current?.focus(), 50);
      loadHistoryAndPopular();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
          return;
        }
        if (e.key === "Tab" && dialogRef.current) {
          const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusables.length === 0) return;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first || !dialogRef.current.contains(document.activeElement)) {
              e.preventDefault();
              last.focus();
            }
          } else if (document.activeElement === last || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        clearTimeout(focusTimer);
        window.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
        previousFocusRef.current?.focus();
      };
    }

    document.body.style.overflow = "";
    setQuery("");
    setResults([]);
    setLocationError(null);
    return undefined;
  }, [isOpen, onClose]);

  const loadHistoryAndPopular = async () => {
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (user && token) {
      try {
        const history = await api.getSearchHistory(token, user.email);
        setRecentSearches(Array.isArray(history) ? history : []);
      } catch {}
    }
    try {
      const popular = await api.getPopularSearches();
      if (Array.isArray(popular)) {
        setPopularSearches(popular.filter((q): q is string => typeof q === "string" && q.trim().length > 0));
      } else {
        setPopularSearches([]);
      }
    } catch {
      setPopularSearches([]);
    }
  };

  const handleClearHistory = async () => {
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (user && token) {
      await api.clearSearchHistory(token, user.email);
      setRecentSearches([]);
    }
  };

  // Debounced live search with AbortController and request-sequence guard
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      searchSeqRef.current += 1;
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();
    const seq = ++searchSeqRef.current;

    const timer = setTimeout(async () => {
      try {
        const products = await api.getFilteredProducts(
          {
            q: trimmed,
            city: selectedCity || undefined,
            pincode: pincode || undefined,
          },
          controller.signal
        );

        if (seq !== searchSeqRef.current || controller.signal.aborted) return;

        if (Array.isArray(products)) {
          const qLower = trimmed.toLowerCase();
          const filtered = products.filter((p) => {
            const title = (p.title || p.name || "").toLowerCase();
            const desc = (p.description || "").toLowerCase();
            const cat = (p.category || "").toLowerCase();
            return title.includes(qLower) || desc.includes(qLower) || cat.includes(qLower);
          });
          setResults(filtered.slice(0, 8));
        }
      } catch {
        if (seq === searchSeqRef.current && !controller.signal.aborted) {
          setResults([]);
        }
      } finally {
        if (seq === searchSeqRef.current && !controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, selectedCity, pincode]);

  const handleExecuteSearch = (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (user && token) {
      api.recordSearch(trimmed, token);
    }

    onClose();
    navigate({
      to: "/browse",
      search: {
        q: trimmed,
        city: selectedCity || undefined,
        pincode: pincode || undefined,
      } as any,
    });
  };

  const handleGpsDetect = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      const msg = "Geolocation is not supported by your browser.";
      setLocationError(msg);
      toast.error(msg);
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        setLocationError(null);
        const loc = `${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`;
        setGpsLocation(loc);
        setSelectedCity("Current Location");
      },
      () => {
        setGpsLoading(false);
        const msg = "Location access was denied. Please select your city or enter a pincode.";
        setLocationError(msg);
        toast.error(msg);
      }
    );
  };

  // Find matching categories for query
  const matchingCategories = query.trim()
    ? CANONICAL_CATEGORIES.filter((c) =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.subcategories.some((sub) => sub.toLowerCase().includes(query.toLowerCase()))
      )
    : [];

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search Rentals"
      className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-14 md:pt-16 px-3 sm:px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Popup Modal Dialog */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-2xl sm:max-w-3xl flex flex-col max-h-[84vh] rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Top Search Bar */}
        <div className="border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-5 py-3.5 bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 flex items-center">
              <Search className="absolute left-3.5 h-4 w-4 text-neutral-500 dark:text-neutral-400 stroke-[1.75] pointer-events-none" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleExecuteSearch(query);
                  if (e.key === "Escape") onClose();
                }}
                placeholder="Search rentals"
                aria-label="Search rentals"
                className="w-full pl-10 pr-10 py-2.5 min-h-[44px] rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800/90 text-xs sm:text-sm text-neutral-900 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus:outline-none focus:border-neutral-950 dark:focus:border-white transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2 h-9 w-9 inline-flex items-center justify-center rounded-full text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Location trigger */}
            <button
              type="button"
              onClick={() => setShowLocationPicker((p) => !p)}
              aria-expanded={showLocationPicker}
              className={cn(
                "hidden sm:inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2.5 rounded-full border text-xs font-semibold transition-colors cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white",
                selectedCity || pincode
                  ? "border-neutral-950 dark:border-white bg-neutral-950 text-white dark:bg-white dark:text-neutral-950"
                  : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-950 dark:hover:border-white text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800/90"
              )}
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{selectedCity || pincode || "Location"}</span>
            </button>

            {/* Close button (>= 44x44px) */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close search"
              className="h-11 w-11 rounded-full border border-neutral-200 dark:border-neutral-700/80 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center transition-colors cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Location Picker Drawer */}
          {showLocationPicker && (
            <div className="mt-2.5 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleGpsDetect}
                  disabled={gpsLoading}
                  className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-medium hover:border-neutral-950 dark:hover:border-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white cursor-pointer"
                >
                  <Navigation className="h-3 w-3 stroke-[1.75]" aria-hidden="true" />
                  <span>{gpsLoading ? "Detecting..." : gpsLocation ? "GPS Selected" : "Use GPS"}</span>
                </button>

                <div className="flex flex-wrap items-center gap-1">
                  {["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai"].map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => setSelectedCity((c) => (c === city ? "" : city))}
                      className={cn(
                        "min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white cursor-pointer",
                        selectedCity === city
                          ? "border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950"
                          : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                      )}
                    >
                      {city}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  aria-label="6-digit Pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit Pincode"
                  className="min-h-[36px] px-2.5 py-1 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white w-32"
                />
              </div>
              {locationError && (
                <p role="status" className="text-xs font-medium text-red-600 dark:text-red-400">
                  {locationError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Scrollable Main Content Area inside Popup */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {/* Query Entered: Quick results */}
          {query.trim() ? (
            <div className="space-y-6">
              {/* Category Matches */}
              {matchingCategories.length > 0 && (
                <div>
                  <h2 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
                    Matching Categories
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {matchingCategories.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate({
                            to: "/browse",
                            search: {
                              cat: c.id,
                              city: selectedCity || undefined,
                              pincode: pincode || undefined,
                            },
                          });
                        }}
                        className="px-3.5 py-2 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-medium hover:border-neutral-950 dark:hover:border-white transition-colors cursor-pointer"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Matches (Up to 8) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    Quick Results ({results.length})
                  </h2>
                  {results.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleExecuteSearch(query)}
                      className="text-xs font-semibold text-neutral-900 dark:text-white hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>View All Results</span>
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </button>
                  )}
                </div>

                {isLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="aspect-[3/4] rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/70 dark:border-neutral-800"
                      />
                    ))}
                  </div>
                ) : results.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {results.map((p) => {
                      const price = Number(p.daily_rate || p.price || 0);
                      const rawImg = p.image || (Array.isArray(p.images) && p.images[0]) || "";
                      const img = typeof rawImg === "string" ? rawImg.trim() : "";
                      const pid = String(p.id);
                      const hasFailed = !img || failedImages[pid];
                      return (
                        <Link
                          key={pid}
                          to="/product/$id"
                          params={{ id: pid }}
                          onClick={() => onClose()}
                          className="group rounded-xl border border-neutral-200 dark:border-neutral-800 p-2.5 bg-white dark:bg-neutral-900 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors cursor-pointer flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
                        >
                          <div className="aspect-[3/4] w-full rounded-lg bg-neutral-100 dark:bg-neutral-800 overflow-hidden mb-2 flex items-center justify-center">
                            {hasFailed ? (
                              <Package className="h-6 w-6 stroke-[1.75] text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
                            ) : (
                              <img
                                src={img}
                                alt={p.title || p.name || "Rental item"}
                                onError={() => setFailedImages((prev) => ({ ...prev, [pid]: true }))}
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-neutral-900 dark:text-white line-clamp-1">
                              {p.title || p.name}
                            </div>
                            <div className="text-xs font-semibold text-neutral-900 dark:text-white mt-1 tabular-nums">
                              ₹{price} <span className="font-normal text-neutral-600 dark:text-neutral-400 text-xs">/ day</span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                      No matching gear found for "{query}"
                    </p>
                    <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                      Try searching for broader keywords like "camera", "laptop", "bike", or "drill".
                    </p>
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="mt-3 px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white cursor-pointer"
                    >
                      Clear Search
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Empty State: Recent & Popular Searches */
            <div className="space-y-8">
              {/* Recent Searches (Logged-in only) */}
              {user && recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Recent Searches</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearHistory}
                      className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                      <span>Clear Search History</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setQuery(term);
                          handleExecuteSearch(term);
                        }}
                        className="px-3.5 py-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:border-neutral-950 dark:hover:border-white transition-colors cursor-pointer"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Searches (Only rendered when backed by real DB queries) */}
              {popularSearches.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-3">
                    <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Popular Searches</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {popularSearches.map((term, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setQuery(term);
                          handleExecuteSearch(term);
                        }}
                        className="px-3.5 py-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:border-neutral-950 dark:hover:border-white transition-colors cursor-pointer"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Categories */}
              <div>
                <h2 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-3">
                  Explore by Category
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {CANONICAL_CATEGORIES.map((c) => {
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate({
                            to: "/browse",
                            search: {
                              cat: c.id,
                              city: selectedCity || undefined,
                              pincode: pincode || undefined,
                            },
                          });
                        }}
                        className="flex items-center gap-3 p-3 min-h-[48px] rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-left hover:border-neutral-950 dark:hover:border-white transition-colors cursor-pointer"
                      >
                        <div className="h-8 w-8 rounded-full border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                          {c.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SearchOverlay;
