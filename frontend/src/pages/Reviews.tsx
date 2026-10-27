import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Star,
  CheckCircle2,
  Sparkles,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldCheck,
  MessageSquareQuote,
  AlertCircle,
  Camera,
  Loader2,
} from "lucide-react";
import { reviewsApi, type ReviewItem } from "@/services/api";
import { formatRelativeTime } from "@/utils/formatters";
import { getOptimizedImageUrl } from "@/utils/images";
import { ProfilePhoto } from "@/components/common/ProfilePhoto";

export default function Reviews() {
  const queryClient = useQueryClient();

  // Filters & Pagination state
  const [page, setPage] = useState(1);
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<string>("newest");
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);

  // Modal states
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<ReviewItem | null>(null);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  // Form states for Create
  const [selectedBookingId, setSelectedBookingId] = useState<string>("");
  const [createRating, setCreateRating] = useState<number>(5);
  const [createHoverRating, setCreateHoverRating] = useState<number>(0);
  const [createComment, setCreateComment] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  // Form states for Edit
  const [editRating, setEditRating] = useState<number>(5);
  const [editHoverRating, setEditHoverRating] = useState<number>(0);
  const [editComment, setEditComment] = useState<string>("");
  const [editFormError, setEditFormError] = useState<string | null>(null);

  // Check current user auth
  const currentUserRaw = typeof window !== "undefined" ? localStorage.getItem("payent:currentUser") : null;
  const currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : null;
  const currentToken = typeof window !== "undefined" ? localStorage.getItem("payent:token") : null;
  const isAuthenticated = Boolean(currentUser && currentToken);

  // 1. Fetch live review statistics
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["review-stats"],
    queryFn: () => reviewsApi.getStats(),
    staleTime: 60000,
  });

  // 2. Fetch paginated reviews
  const { data: reviewsData, isLoading: isReviewsLoading, isError } = useQuery({
    queryKey: ["reviews", page, ratingFilter, sortOrder, verifiedOnly],
    queryFn: () =>
      reviewsApi.getReviews({
        page,
        limit: 12,
        sort: sortOrder,
        rating: ratingFilter,
        verified_only: verifiedOnly,
      }),
    staleTime: 30000,
  });

  // 3. Fetch eligible bookings for review creation
  const { data: eligibleBookings, isLoading: isEligibleLoading } = useQuery({
    queryKey: ["eligible-bookings"],
    queryFn: () => reviewsApi.getEligibleBookings(),
    enabled: isAuthenticated && isWriteModalOpen,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: { bookingId?: string; productId?: string; rating: number; comment: string }) =>
      reviewsApi.createReview(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["review-stats"] });
      queryClient.invalidateQueries({ queryKey: ["eligible-bookings"] });
      setIsWriteModalOpen(false);
      setSelectedBookingId("");
      setCreateComment("");
      setCreateRating(5);
      setFormError(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || "Failed to submit review. Please try again.";
      setFormError(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; rating: number; comment: string }) =>
      reviewsApi.updateReview(payload.id, { rating: payload.rating, comment: payload.comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["review-stats"] });
      setEditingReview(null);
      setEditFormError(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || "Failed to update review.";
      setEditFormError(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reviewsApi.deleteReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["review-stats"] });
      setDeletingReviewId(null);
    },
  });

  const handleOpenWriteModal = () => {
    setFormError(null);
    if (!isAuthenticated) {
      // Redirect or prompt login
      window.location.href = "/login?redirect=/reviews";
      return;
    }
    setIsWriteModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (createComment.trim().length < 5) {
      setFormError("Please write at least 5 characters for your review.");
      return;
    }
    if (createComment.trim().length > 2000) {
      setFormError("Review comments cannot exceed 2000 characters.");
      return;
    }

    const selectedBooking = eligibleBookings?.find((b) => b.bookingId === selectedBookingId);
    if (!selectedBooking && eligibleBookings && eligibleBookings.length > 0) {
      setFormError("Please select the rental gear you wish to review.");
      return;
    }

    createMutation.mutate({
      bookingId: selectedBooking?.bookingId,
      productId: selectedBooking?.productId,
      rating: createRating,
      comment: createComment.trim(),
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReview) return;
    setEditFormError(null);

    if (editComment.trim().length < 5) {
      setEditFormError("Please write at least 5 characters for your review.");
      return;
    }

    updateMutation.mutate({
      id: editingReview.id,
      rating: editRating,
      comment: editComment.trim(),
    });
  };

  const openEditModal = (review: ReviewItem) => {
    setEditingReview(review);
    setEditRating(review.rating);
    setEditComment(review.comment);
    setEditFormError(null);
  };

  const totalReviews = stats?.totalReviews ?? 0;
  const avgRating = stats?.averageRating ?? 0;
  const distribution = stats?.ratingDistribution ?? { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 };

  const reviewsList = reviewsData?.reviews || [];
  const totalPages = reviewsData?.pagination.totalPages || 1;

  return (
    <div className="min-h-screen bg-white dark:bg-[#05090D] text-neutral-900 dark:text-white transition-colors duration-300 pt-20 pb-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header Breadcrumb & Title */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-[#A8B1BA] mb-2">
            <Link to="/" className="hover:text-black dark:hover:text-white transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-[#FF1744]">Reviews</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-neutral-950 dark:text-white">
                  Community Reviews
                </h1>
                <span className="inline-block w-8 h-[3px] bg-[#FF1744] rounded-full" />
              </div>
              <p className="mt-1.5 text-sm sm:text-base text-neutral-500 dark:text-[#A8B1BA] max-w-2xl">
                Real ratings and authentic experiences from filmmakers, creators, and photographers renting gear on Payent.
              </p>
            </div>

            <button
              onClick={handleOpenWriteModal}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#FF1744] text-white text-xs sm:text-sm font-bold shadow-lg shadow-[#FF1744]/20 hover:bg-[#D50000] transition-colors shrink-0 cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Write a Review</span>
            </button>
          </div>
        </div>

        {/* Live Statistics Banner */}
        <div className="rounded-2xl bg-neutral-50 dark:bg-[#0D151D] border border-black/10 dark:border-white/10 p-6 sm:p-8 mb-10 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Left: Big Score */}
            <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-4 border-b md:border-b-0 md:border-r border-black/10 dark:border-white/10">
              <div className="text-5xl sm:text-6xl font-black text-neutral-950 dark:text-white tracking-tight">
                {isStatsLoading ? "—" : avgRating > 0 ? avgRating.toFixed(1) : "0.0"}
              </div>

              {/* Stars */}
              <div className="flex items-center gap-1 my-3 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.round(avgRating)
                        ? "fill-amber-400 text-amber-400"
                        : "fill-neutral-200 text-neutral-200 dark:fill-neutral-800 dark:text-neutral-800"
                    }`}
                  />
                ))}
              </div>

              <div className="text-sm font-bold text-neutral-900 dark:text-white">
                {totalReviews} {totalReviews === 1 ? "Verified Review" : "Verified Reviews"}
              </div>
              <p className="text-xs text-neutral-500 dark:text-[#A8B1BA] mt-0.5">
                Calculated from verified rental bookings
              </p>
            </div>

            {/* Center: Rating Distribution Bars */}
            <div className="md:col-span-5 space-y-2.5">
              {[5, 4, 3, 2, 1].map((starNum) => {
                const count = distribution[starNum.toString() as keyof typeof distribution] || 0;
                const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;

                return (
                  <button
                    key={starNum}
                    type="button"
                    onClick={() => {
                      setRatingFilter(ratingFilter === starNum ? undefined : starNum);
                      setPage(1);
                    }}
                    className={`w-full flex items-center gap-3 text-xs font-semibold group cursor-pointer transition-opacity ${
                      ratingFilter && ratingFilter !== starNum ? "opacity-40" : "opacity-100"
                    }`}
                  >
                    <span className="w-12 text-left flex items-center gap-1 text-neutral-700 dark:text-[#A8B1BA]">
                      <span>{starNum}</span>
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400 inline" />
                    </span>

                    <div className="flex-1 h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <span className="w-10 text-right text-neutral-500 dark:text-[#A8B1BA] font-mono text-[11px]">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right: Guarantee Callout */}
            <div className="md:col-span-3 flex flex-col justify-center bg-white dark:bg-[#05090D] p-5 rounded-xl border border-black/5 dark:border-white/5 space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="h-4 w-4" />
                <span>100% Verified Rentals</span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-[#A8B1BA] leading-relaxed">
                Only creators who completed verified rental bookings can leave reviews on Payent. No fake endorsements.
              </p>
            </div>
          </div>
        </div>

        {/* Filter & Sort Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-black/10 dark:border-white/10">
          {/* Star Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => {
                setRatingFilter(undefined);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                ratingFilter === undefined
                  ? "bg-neutral-900 text-white dark:bg-[#F2F0EA] dark:text-[#0A0A0A]"
                  : "bg-neutral-100 dark:bg-[#0D151D] text-neutral-600 dark:text-[#CFC9BD] hover:bg-neutral-200 dark:hover:bg-[rgba(242,240,234,0.07)]"
              }`}
            >
              All Stars
            </button>

            {[5, 4, 3, 2, 1].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setRatingFilter(s);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  ratingFilter === s
                    ? "bg-neutral-900 text-white dark:bg-[#F2F0EA] dark:text-[#0A0A0A]"
                    : "bg-neutral-100 dark:bg-[#0D151D] text-neutral-600 dark:text-[#CFC9BD] hover:bg-neutral-200 dark:hover:bg-[rgba(242,240,234,0.07)]"
                }`}
              >
                <span>{s}</span>
                <Star className="h-3 w-3 fill-current inline" />
              </button>
            ))}
          </div>

          {/* Right Controls: Verified Only & Sort dropdown */}
          <div className="flex items-center gap-4 shrink-0">
            <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-[#A8B1BA] cursor-pointer">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => {
                  setVerifiedOnly(e.target.checked);
                  setPage(1);
                }}
                className="rounded border-neutral-300 dark:border-neutral-700 text-[#FF1744] focus:ring-[#FF1744]"
              />
              <span>Verified Rentals Only</span>
            </label>

            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setPage(1);
              }}
              className="bg-neutral-100 dark:bg-[#0D151D] border border-black/10 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-neutral-800 dark:text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#FF1744]"
            >
              <option value="newest">Newest First</option>
              <option value="highest">Highest Rated</option>
              <option value="lowest">Lowest Rated</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Loading Skeletons */}
        {isReviewsLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="rounded-2xl bg-neutral-50 dark:bg-[#0D151D] border border-black/10 dark:border-white/10 p-6 space-y-4 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 w-28 bg-neutral-200 dark:bg-neutral-800 rounded" />
                    <div className="h-2.5 w-20 bg-neutral-200 dark:bg-neutral-800 rounded" />
                  </div>
                </div>
                <div className="space-y-2 pt-2">
                  <div className="h-3 w-full bg-neutral-200 dark:bg-neutral-800 rounded" />
                  <div className="h-3 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!isReviewsLoading && isError && (
          <div className="rounded-2xl bg-neutral-50 dark:bg-[#0D151D] border border-black/10 dark:border-white/10 p-12 text-center">
            <AlertCircle className="h-8 w-8 text-[#FF1744] mx-auto mb-3" />
            <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-1">
              Unable to load reviews
            </h3>
            <p className="text-xs text-neutral-500 dark:text-[#A8B1BA] mb-4">
              There was a problem reaching the Payent review service.
            </p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["reviews"] })}
              className="px-4 py-2 rounded-xl bg-[#161616] text-[#FFFFFF] dark:bg-[#F2F0EA] dark:text-[#0A0A0A] hover:bg-[#292929] dark:hover:bg-[#FFFDF7] text-xs font-bold transition-all cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isReviewsLoading && !isError && reviewsList.length === 0 && (
          <div className="rounded-2xl bg-neutral-50/50 dark:bg-[#0D151D]/60 border border-dashed border-black/15 dark:border-white/15 p-12 sm:p-16 text-center flex flex-col items-center justify-center">
            <div className="h-14 w-14 rounded-2xl bg-[#FF1744]/10 text-[#FF1744] flex items-center justify-center mb-4">
              <MessageSquareQuote className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              No reviews found
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-neutral-500 dark:text-[#A8B1BA] max-w-md">
              {ratingFilter
                ? `There are currently no ${ratingFilter}-star reviews available matching your filter.`
                : "Be the first creator to share your experience after completing a rental."}
            </p>
            <button
              onClick={handleOpenWriteModal}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF1744] text-white text-xs font-bold shadow-lg shadow-[#FF1744]/20 hover:bg-[#D50000] transition-colors cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Write a Review</span>
            </button>
          </div>
        )}

        {/* Reviews Cards Grid */}
        {!isReviewsLoading && !isError && reviewsList.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {reviewsList.map((r: ReviewItem) => {
              const metaSubtitle = [r.userRole, r.userLocation].filter(Boolean).join(" • ");
              const isAuthor = currentUser?.email && r.userId?.toLowerCase() === currentUser.email.toLowerCase();
              const isAdmin = currentUser?.role === "admin";

              return (
                <div
                  key={r.id}
                  className="rounded-2xl bg-neutral-50 dark:bg-[#0D151D] border border-black/10 dark:border-white/10 p-6 flex flex-col justify-between space-y-4 shadow-sm hover:border-black/20 dark:hover:border-white/20 transition-all text-left group"
                >
                  {/* Top Creator Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <ProfilePhoto
                        src={r.userAvatar}
                        alt={r.userName}
                        size="md"
                        shape="rounded"
                        className="h-11 w-11 rounded-xl shrink-0"
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-bold text-neutral-900 dark:text-white leading-tight truncate">
                            {r.userName}
                          </h4>
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

                    {/* Star Rating Badge */}
                    <div className="flex items-center gap-1 shrink-0 bg-amber-400/10 px-2 py-1 rounded-lg">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-bold text-amber-500 dark:text-amber-400">
                        {r.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Product Reference Card if available */}
                  {r.productTitle && (
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs">
                      {r.productImage ? (
                        <img
                          src={getOptimizedImageUrl(r.productImage, 'thumb')}
                          alt={r.productTitle}
                          loading="lazy"
                          decoding="async"
                          className="h-8 w-8 rounded-lg object-cover bg-neutral-200 dark:bg-neutral-800 shrink-0"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 shrink-0">
                          <Camera className="h-4 w-4" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500 tracking-wider">
                          Rented Gear
                        </div>
                        <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                          {r.productTitle}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Review Text */}
                  <p className="text-xs sm:text-sm text-neutral-700 dark:text-[#C5CDD6] leading-relaxed font-normal">
                    "{r.comment}"
                  </p>

                  {/* Footer Bar: Date & Owner moderation actions */}
                  <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-500">
                    <span>
                      {formatRelativeTime(r.createdAt)}
                      {r.updatedAt && <span className="ml-1 text-[10px] italic">(edited)</span>}
                    </span>

                    {(isAuthor || isAdmin) && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(r)}
                          className="text-neutral-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer p-1"
                          title="Edit review"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingReviewId(r.id)}
                          className="text-neutral-500 hover:text-[#FF1744] transition-colors cursor-pointer p-1"
                          title="Delete review"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Server-Side Pagination Controls */}
        {!isReviewsLoading && !isError && totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-[#0D151D] border border-black/10 dark:border-white/10 text-xs font-bold text-neutral-700 dark:text-white disabled:opacity-30 transition-opacity flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-1 px-3">
              <span className="text-xs font-bold text-neutral-900 dark:text-white">Page {page}</span>
              <span className="text-xs text-neutral-400">of {totalPages}</span>
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-[#0D151D] border border-black/10 dark:border-white/10 text-xs font-bold text-neutral-700 dark:text-white disabled:opacity-30 transition-opacity flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 1. WRITE A REVIEW MODAL */}
      {/* ========================================================= */}
      {isWriteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#0D151D] border border-black/10 dark:border-white/10 p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#FF1744]" />
                <h3 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white">
                  Write a Gear Review
                </h3>
              </div>
              <button
                onClick={() => setIsWriteModalOpen(false)}
                className="h-8 w-8 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 flex items-center justify-center text-neutral-500 dark:text-neutral-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Ineligible warning or Form */}
            {isEligibleLoading ? (
              <div className="py-12 text-center space-y-3">
                <Loader2 className="h-6 w-6 text-[#FF1744] animate-spin mx-auto" />
                <p className="text-xs text-neutral-500">Checking your verified bookings...</p>
              </div>
            ) : eligibleBookings && eligibleBookings.length === 0 && currentUser?.role !== "admin" ? (
              <div className="py-6 text-center space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-amber-400/10 text-amber-500 flex items-center justify-center mx-auto">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Verified Rentals Only
                  </h4>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-[#A8B1BA] leading-relaxed max-w-sm mx-auto">
                    To maintain trusted marketplace integrity, reviews on Payent require a completed rental booking. Once you complete a rental, you can share your feedback!
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    to="/"
                    onClick={() => setIsWriteModalOpen(false)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#161616] text-[#FFFFFF] dark:bg-[#F2F0EA] dark:text-[#0A0A0A] hover:bg-[#292929] dark:hover:bg-[#FFFDF7] text-xs font-bold transition-all"
                  >
                    <span>Browse Gear Catalog</span>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                {formError && (
                  <div className="p-3 rounded-xl bg-[#FF1744]/10 border border-[#FF1744]/20 text-[#FF1744] text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Booking Selection */}
                {eligibleBookings && eligibleBookings.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-[#A8B1BA] mb-1.5">
                      Select Rental Gear *
                    </label>
                    <select
                      value={selectedBookingId}
                      onChange={(e) => setSelectedBookingId(e.target.value)}
                      required
                      className="w-full bg-neutral-50 dark:bg-[#05090D] border border-black/10 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF1744] cursor-pointer"
                    >
                      <option value="">-- Choose your completed rental --</option>
                      {eligibleBookings.map((b) => (
                        <option key={b.bookingId} value={b.bookingId}>
                          {b.productTitle} (Order #{b.bookingId.slice(0, 8)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Rating selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-[#A8B1BA] mb-1.5">
                    Your Rating: {createRating} / 5 Stars
                  </label>
                  <div className="flex items-center gap-1 py-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setCreateRating(star)}
                        onMouseEnter={() => setCreateHoverRating(star)}
                        onMouseLeave={() => setCreateHoverRating(0)}
                        className="p-1 text-amber-400 hover:scale-110 transition-transform cursor-pointer focus:outline-none"
                      >
                        <Star
                          className={`h-7 w-7 ${
                            star <= (createHoverRating || createRating)
                              ? "fill-amber-400 text-amber-400"
                              : "fill-neutral-200 text-neutral-200 dark:fill-neutral-800 dark:text-neutral-800"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment Textarea */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-[#A8B1BA]">
                      Your Review *
                    </label>
                    <span className="text-[11px] text-neutral-400">
                      {createComment.length} / 2000
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={createComment}
                    onChange={(e) => setCreateComment(e.target.value)}
                    placeholder="How was the gear condition, packaging, and rental handover? Share details to help other creators..."
                    maxLength={2000}
                    required
                    className="w-full bg-neutral-50 dark:bg-[#05090D] border border-black/10 dark:border-white/10 rounded-xl p-3 text-xs sm:text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#FF1744] resize-none"
                  />
                </div>

                {/* Submit button */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsWriteModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-black/10 dark:border-[rgba(242,240,234,0.35)] text-xs font-bold text-neutral-600 dark:text-[#E8E4DA] hover:bg-neutral-100 dark:hover:bg-[rgba(242,240,234,0.10)] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-5 py-2.5 rounded-xl bg-[#FF1744] text-white text-xs font-bold shadow-lg shadow-[#FF1744]/20 hover:bg-[#D50000] disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Posting...</span>
                      </>
                    ) : (
                      <span>Post Review</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. EDIT REVIEW MODAL */}
      {/* ========================================================= */}
      {editingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#0D151D] border border-black/10 dark:border-white/10 p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-[#FF1744]" />
                <h3 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white">
                  Edit Review
                </h3>
              </div>
              <button
                onClick={() => setEditingReview(null)}
                className="h-8 w-8 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 flex items-center justify-center text-neutral-500 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {editFormError && (
                <div className="p-3 rounded-xl bg-[#FF1744]/10 border border-[#FF1744]/20 text-[#FF1744] text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{editFormError}</span>
                </div>
              )}

              {/* Rating selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-[#A8B1BA] mb-1.5">
                  Your Rating: {editRating} / 5 Stars
                </label>
                <div className="flex items-center gap-1 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEditRating(star)}
                      onMouseEnter={() => setEditHoverRating(star)}
                      onMouseLeave={() => setEditHoverRating(0)}
                      className="p-1 text-amber-400 hover:scale-110 transition-transform cursor-pointer focus:outline-none"
                    >
                      <Star
                        className={`h-7 w-7 ${
                          star <= (editHoverRating || editRating)
                            ? "fill-amber-400 text-amber-400"
                            : "fill-neutral-200 text-neutral-200 dark:fill-neutral-800 dark:text-neutral-800"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-[#A8B1BA]">
                    Updated Review *
                  </label>
                  <span className="text-[11px] text-neutral-400">{editComment.length} / 2000</span>
                </div>
                <textarea
                  rows={4}
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  maxLength={2000}
                  required
                  className="w-full bg-neutral-50 dark:bg-[#05090D] border border-black/10 dark:border-white/10 rounded-xl p-3 text-xs sm:text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#FF1744] resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingReview(null)}
                  className="px-4 py-2.5 rounded-xl border border-black/10 dark:border-[rgba(242,240,234,0.35)] text-xs font-bold text-neutral-600 dark:text-[#E8E4DA] hover:bg-neutral-100 dark:hover:bg-[rgba(242,240,234,0.10)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-[#FF1744] text-white text-xs font-bold shadow-lg shadow-[#FF1744]/20 hover:bg-[#D50000] disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. DELETE REVIEW CONFIRMATION */}
      {/* ========================================================= */}
      {deletingReviewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#0D151D] border border-black/10 dark:border-white/10 p-6 shadow-2xl space-y-4">
            <div className="h-10 w-10 rounded-xl bg-[#FF1744]/10 text-[#FF1744] flex items-center justify-center">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-neutral-950 dark:text-white">
                Delete this review?
              </h4>
              <p className="text-xs text-neutral-500 dark:text-[#A8B1BA] mt-1">
                This action will permanently remove your review and recalculate platform statistics.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingReviewId(null)}
                className="px-4 py-2 rounded-xl border border-black/10 dark:border-[rgba(242,240,234,0.35)] text-xs font-bold text-neutral-600 dark:text-[#E8E4DA] hover:bg-neutral-100 dark:hover:bg-[rgba(242,240,234,0.10)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deletingReviewId)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-xl bg-[#FF1744] text-white text-xs font-bold hover:bg-[#D50000] transition-colors cursor-pointer"
              >
                {deleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
