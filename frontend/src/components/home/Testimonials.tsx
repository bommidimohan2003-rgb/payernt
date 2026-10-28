import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronLeft, ChevronRight, Star, CheckCircle2, MessageSquareQuote, Sparkles } from "lucide-react";
import { reviewsApi, type ReviewItem } from "@/services/api";
import { formatRelativeTime } from "@/utils/formatters";
import { getOptimizedImageUrl } from "@/utils/images";
import { ProfilePhoto } from "@/components/common/ProfilePhoto";

export function Testimonials() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["reviews", "homepage"],
    queryFn: () => reviewsApi.getReviews({ limit: 6, sort: "highest" }),
    staleTime: 30000,
  });

  const reviews = data?.reviews || [];

  if (!isLoading && reviews.length === 0) {
    return null;
  }

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -340 : 340;
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  return (
    <section className="bg-white dark:bg-[#05090D] py-14 sm:py-18 text-neutral-900 dark:text-white transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
                What Creators Say
              </h2>
              <span className="inline-block w-8 h-[3px] bg-primary rounded-full" />
            </div>
            <p className="mt-1.5 text-xs sm:text-sm text-neutral-500 dark:text-[#A8B1BA]">
              Real experiences from our community.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/reviews"
              className="text-xs sm:text-sm font-semibold text-neutral-600 dark:text-[#A8B1BA] hover:text-black dark:hover:text-white flex items-center gap-1.5 transition-colors group"
            >
              <span>View All Reviews</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>

            {reviews.length > 3 && (
              <div className="hidden sm:flex items-center gap-1.5 ml-2">
                <button
                  type="button"
                  onClick={() => scroll("left")}
                  className="h-8 w-8 rounded-full border border-black/10 dark:border-white/15 bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0D151D] dark:hover:bg-[#111B24] flex items-center justify-center text-neutral-800 dark:text-white transition-colors cursor-pointer"
                  aria-label="Previous reviews"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scroll("right")}
                  className="h-8 w-8 rounded-full border border-black/10 dark:border-white/15 bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0D151D] dark:hover:bg-[#111B24] flex items-center justify-center text-neutral-800 dark:text-white transition-colors cursor-pointer"
                  aria-label="Next reviews"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Loading Skeleton Cards */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl bg-neutral-50 dark:bg-[#0D151D] border border-black/10 dark:border-white/10 p-5 sm:p-6 space-y-4 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-24 bg-neutral-200 dark:bg-neutral-800 rounded" />
                      <div className="h-2.5 w-16 bg-neutral-200 dark:bg-neutral-800 rounded" />
                    </div>
                  </div>
                  <div className="h-3 w-12 bg-neutral-200 dark:bg-neutral-800 rounded" />
                </div>
                <div className="space-y-2 pt-2">
                  <div className="h-3 w-full bg-neutral-200 dark:bg-neutral-800 rounded" />
                  <div className="h-3 w-4/5 bg-neutral-200 dark:bg-neutral-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!isLoading && isError && (
          <div className="rounded-2xl bg-neutral-50 dark:bg-[#0D151D] border border-black/10 dark:border-white/10 p-8 text-center">
            <p className="text-sm text-neutral-600 dark:text-[#A8B1BA] mb-3">
              Unable to load reviews right now.
            </p>
            <button
              onClick={() => refetch()}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-black hover:opacity-90 transition-opacity cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && reviews.length === 0 && (
          <div className="rounded-2xl bg-neutral-50/50 dark:bg-[#0D151D]/60 border border-dashed border-black/15 dark:border-white/15 p-8 sm:p-12 text-center flex flex-col items-center justify-center">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary dark:bg-white/10 dark:text-white flex items-center justify-center mb-4">
              <MessageSquareQuote className="h-6 w-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              No reviews yet.
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-neutral-500 dark:text-[#A8B1BA] max-w-md">
              Be the first creator to share your experience after completing a rental.
            </p>
            <Link
              to="/reviews"
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#161616] hover:bg-[#262626] text-[#F2F0EA] dark:bg-[#F2F0EA] dark:text-[#161616] dark:hover:bg-white text-xs font-bold shadow-md cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Write a Review</span>
            </Link>
          </div>
        )}

        {/* Real Review Cards Grid */}
        {!isLoading && !isError && reviews.length > 0 && (
          <div
            ref={scrollRef}
            className="grid grid-cols-1 md:grid-cols-3 gap-5 overflow-x-auto pb-2 scrollbar-none"
          >
            {reviews.map((r: ReviewItem) => {
              const metaSubtitle = [r.userRole, r.userLocation].filter(Boolean).join(" • ");

              return (
                <div
                  key={r.id}
                  className="rounded-2xl bg-neutral-50 dark:bg-[#0D151D] border border-black/10 dark:border-white/10 p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-md hover:border-black/20 dark:hover:border-white/20 transition-all text-left"
                >
                  {/* User Header with Rating */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <ProfilePhoto
                        src={r.userProfilePhotoUrl || r.user_profile_photo_url || r.userAvatar}
                        alt={r.userName}
                        size="md"
                        shape="rounded"
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-bold text-neutral-900 dark:text-white leading-tight truncate">
                            {r.userName}
                          </h3>
                          {r.isVerified && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full shrink-0"
                              title="Verified Rental"
                            >
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              <span>Verified</span>
                            </span>
                          )}
                        </div>
                        {metaSubtitle && (
                          <p className="text-[11px] text-neutral-500 dark:text-[#A8B1BA] mt-0.5 truncate">
                            {metaSubtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Stars */}
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < Math.round(r.rating)
                                ? "fill-amber-400 text-amber-400"
                                : "fill-neutral-200 text-neutral-200 dark:fill-neutral-700 dark:text-neutral-700"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-neutral-900 dark:text-white ml-0.5">
                        {r.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Review Content */}
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-[#A8B1BA] leading-relaxed font-normal line-clamp-4">
                    "{r.comment}"
                  </p>

                  {/* Footer metadata: Product tag & Timestamp */}
                  <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-500">
                    <span className="truncate max-w-[180px] font-medium text-neutral-700 dark:text-neutral-300">
                      {r.productTitle || "Verified Gear Rental"}
                    </span>
                    <span className="shrink-0">{formatRelativeTime(r.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
