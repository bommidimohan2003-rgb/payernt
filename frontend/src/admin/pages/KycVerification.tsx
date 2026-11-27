import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  Search,
  Filter,
  RefreshCw,
  Eye,
  User,
  Building,
  X,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StatsCard } from "../components/layout/StatsCard";
import { Table, Column } from "../components/layout/Table";
import { Pagination } from "../components/layout/Pagination";
import { ProfilePhoto } from "@/components/common/ProfilePhoto";
import { kycService, AdminKycVerification, KycStats } from "../services/kyc";

export default function KycVerification() {
  const routerSearch = useSearch({ strict: false }) as {
    status?: string;
    type?: string;
    q?: string;
  };

  const [verifications, setVerifications] = useState<AdminKycVerification[]>(
    [],
  );
  const [stats, setStats] = useState<KycStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    needs_information: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search (initialized from router search params if present)
  const [statusFilter, setStatusFilter] = useState<string>(
    routerSearch?.status || "all",
  );
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>(
    routerSearch?.type || "all",
  );
  const [searchQuery, setSearchQuery] = useState<string>(routerSearch?.q || "");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Fetch real applications from backend
  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await kycService.getKycList();
      setVerifications(res.verifications || []);
      setStats(
        res.stats || {
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          needs_information: 0,
        },
      );
    } catch (err: unknown) {
      const errorObj = err as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      console.error("Failed to load KYC verifications:", err);
      setError(
        errorObj?.response?.data?.detail ||
          "Failed to load KYC verification applications.",
      );
      toast.error("Failed to load KYC applications from backend.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    return verifications
      .filter((item) => {
        // Status filter
        if (statusFilter !== "all") {
          const itemStatus = (item.status || "").toUpperCase();
          if (statusFilter === "PENDING" && itemStatus !== "PENDING")
            return false;
          if (statusFilter === "APPROVED" && itemStatus !== "APPROVED")
            return false;
          if (statusFilter === "REJECTED" && itemStatus !== "REJECTED")
            return false;
          if (
            statusFilter === "NEEDS_INFORMATION" &&
            !["NEEDS_INFORMATION", "NEEDS_INFO"].includes(itemStatus)
          ) {
            return false;
          }
        }

        // Account type filter
        if (accountTypeFilter !== "all") {
          const accType = (item.account_type || "").toLowerCase();
          if (accountTypeFilter === "payernt") {
            if (!["payernt", "vendor", "lender"].includes(accType))
              return false;
          } else if (accountTypeFilter === "payrent") {
            if (!["payrent", "renter", "customer", "user"].includes(accType))
              return false;
          }
        }

        // Search query (name, email, id, masked number)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const name = (item.applicant_name || "").toLowerCase();
          const email = (item.email || "").toLowerCase();
          const id = (item.id || "").toLowerCase();
          const num = (item.document_number_masked || "").toLowerCase();
          return (
            name.includes(q) ||
            email.includes(q) ||
            id.includes(q) ||
            num.includes(q)
          );
        }

        return true;
      })
      .sort((a, b) => {
        // Prioritize PENDING status at the top
        const aPending = (a.status || "").toUpperCase() === "PENDING" ? 1 : 0;
        const bPending = (b.status || "").toUpperCase() === "PENDING" ? 1 : 0;
        if (aPending !== bPending) return bPending - aPending;

        // Then sort by submission/creation date descending
        const aTime = new Date(a.submitted_at || a.created_at || 0).getTime();
        const bTime = new Date(b.submitted_at || b.created_at || 0).getTime();
        return bTime - aTime;
      });
  }, [verifications, statusFilter, accountTypeFilter, searchQuery]);

  // Paginated items
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  // Active search parameters to carry when navigating to details
  const searchState = useMemo(() => {
    return {
      status: statusFilter !== "all" ? statusFilter : undefined,
      type: accountTypeFilter !== "all" ? accountTypeFilter : undefined,
      q: searchQuery.trim() ? searchQuery.trim() : undefined,
    };
  }, [statusFilter, accountTypeFilter, searchQuery]);

  // Table Column Definitions
  const columns: Column<AdminKycVerification>[] = [
    {
      key: "id",
      label: "Application ID",
      sortable: true,
      render: (row) => (
        <Link
          to="/admin/kyc/$id"
          params={{ id: row.id }}
          search={searchState}
          className="font-mono text-xs font-semibold text-[var(--admin-text-secondary)] hover:text-[var(--admin-success)] transition-colors tracking-tight"
          title="Open application review"
        >
          {row.id.slice(0, 14)}...
        </Link>
      ),
    },
    {
      key: "applicant",
      label: "Applicant",
      sortable: true,
      render: (row) => {
        const isVendor = ["payernt", "vendor", "lender"].includes(
          (row.account_type || "").toLowerCase(),
        );
        return (
          <div className="flex items-center gap-3">
            <ProfilePhoto
              src={row.applicant_avatar || undefined}
              alt={row.applicant_name || row.email}
              size="sm"
            />
            <div className="min-w-0">
              <Link
                to="/admin/kyc/$id"
                params={{ id: row.id }}
                search={searchState}
                className="font-semibold text-xs text-[var(--admin-text)] hover:text-[var(--admin-success)] transition-colors truncate max-w-40 block"
              >
                {row.applicant_name || "Applicant"}
              </Link>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-md",
                  isVendor
                    ? "bg-[var(--admin-elevated)] text-[var(--admin-text)] border border-[var(--admin-border)]"
                    : "bg-[var(--admin-elevated)] text-[var(--admin-text-secondary)] border border-[var(--admin-border)]",
                )}
              >
                {isVendor ? (
                  <Building className="h-2.5 w-2.5" />
                ) : (
                  <User className="h-2.5 w-2.5" />
                )}
                {isVendor ? "Vendor (Payernt)" : "Renter (Payrent)"}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "email",
      label: "Contact Email",
      render: (row) => (
        <div className="text-xs">
          <span className="text-[var(--admin-text)] font-mono">{row.email}</span>
          {row.applicant_phone && (
            <span className="text-[11px] text-[var(--admin-text-muted)] block font-mono">
              {row.applicant_phone}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "document",
      label: "Document & Number",
      render: (row) => {
        const isAadhaar = (row.document_type || "").toUpperCase() === "AADHAAR";
        return (
          <div className="text-xs">
            <span className="font-bold text-[var(--admin-text)]">
              {isAadhaar ? "Aadhaar Card" : "PAN Card"}
            </span>
            <span className="text-[11px] text-[var(--admin-text-muted)] block font-mono">
              {row.document_number_masked || "••••••••"}
            </span>
          </div>
        );
      },
    },
    {
      key: "submitted_at",
      label: "Submitted Date",
      sortable: true,
      render: (row) => {
        const dateStr = row.submitted_at || row.created_at;
        if (!dateStr)
          return <span className="text-[var(--admin-text-muted)] text-xs">—</span>;
        const d = new Date(dateStr);
        return (
          <div className="text-xs">
            <span className="text-[var(--admin-text)]">{d.toLocaleDateString()}</span>
            <span className="text-[11px] text-[var(--admin-text-muted)] block font-mono">
              {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        );
      },
    },
    {
      key: "status",
      label: "KYC Status",
      sortable: true,
      render: (row) => {
        const st = (row.status || "").toUpperCase();
        let badgeStyle = "bg-[var(--admin-elevated)] text-[var(--admin-text-muted)] border-[var(--admin-border)]";
        let icon = <Clock className="h-3 w-3" />;
        let label = st;

        if (st === "APPROVED") {
          badgeStyle =
            "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
          icon = <CheckCircle2 className="h-3 w-3 text-emerald-500" />;
          label = "Approved";
        } else if (st === "PENDING") {
          badgeStyle =
            "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
          icon = <Clock className="h-3 w-3 text-amber-500" />;
          label = "Pending Review";
        } else if (st === "REJECTED") {
          badgeStyle =
            "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
          icon = <XCircle className="h-3 w-3 text-rose-500" />;
          label = "Rejected";
        } else if (st === "NEEDS_INFORMATION" || st === "NEEDS_INFO") {
          badgeStyle =
            "bg-amber-500/10 text-[var(--admin-warning)] border-[var(--admin-warning)]/20";
          icon = <HelpCircle className="h-3 w-3 text-[var(--admin-warning)]" />;
          label = "Needs Info";
        }

        return (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ",
              badgeStyle,
            )}
          >
            {icon}
            {label}
          </span>
        );
      },
    },
    {
      key: "reviewed_by",
      label: "Last Reviewed",
      render: (row) => {
        if (!row.reviewed_by)
          return <span className="text-[var(--admin-text-muted)] text-xs">—</span>;
        return (
          <div className="text-xs">
            <span className="text-[var(--admin-text)] truncate max-w-32 block font-mono">
              {row.reviewed_by}
            </span>
            {row.reviewed_at && (
              <span className="text-[11px] text-[var(--admin-text-muted)] block">
                {new Date(row.reviewed_at).toLocaleDateString()}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "Action",
      align: "right",
      render: (row) => (
        <Link
          to="/admin/kyc/$id"
          params={{ id: row.id }}
          search={searchState}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--admin-elevated)] text-[var(--admin-text)] hover:bg-[var(--admin-accent)] hover:text-[var(--admin-bg)] border border-[var(--admin-border)] transition-colors cursor-pointer shadow-xs"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>View Details</span>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-semibold text-[var(--admin-text)] tracking-tight">
              KYC Verification
            </h1>
            {stats.pending > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium tabular-nums bg-amber-500/10 text-[var(--admin-warning)] border border-[var(--admin-warning)]/20">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--admin-warning)]" />
                <span>{stats.pending} pending</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[var(--admin-text-muted)] mt-1">
            Review submitted government identity documents (Aadhaar for Vendors,
            PAN for Renters) and enforce platform safety.
          </p>
        </div>

        <button
          onClick={() => fetchData(true)}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--admin-card)] border border-[var(--admin-border)] hover:bg-[var(--admin-elevated)] text-[var(--admin-text)] transition-colors cursor-pointer shadow-xs shrink-0 disabled:opacity-50"
        >
          <RefreshCw
            className={cn(
              "h-3.5 w-3.5",
              refreshing && "animate-spin text-[var(--admin-success)]",
            )}
          />
          <span>{refreshing ? "Refreshing..." : "Refresh Applications"}</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatsCard
          title="Total Submissions"
          value={stats.total}
          icon={Layers}
          loading={loading}
          subtext="All-time applications"
          className="cursor-pointer hover:border-[var(--admin-text)]/25 transition-colors"
          onClick={() => setStatusFilter("all")}
        />
        <StatsCard
          title="Pending Review"
          value={stats.pending}
          icon={Clock}
          loading={loading}
          trend={stats.pending > 0 ? "up" : "neutral"}
          subtext="Requires admin decision"
          className={cn(
            "cursor-pointer hover:border-amber-500/40 transition-colors",
            stats.pending > 0 && "ring-1 ring-amber-500/30 bg-amber-500/[0.03]",
          )}
          onClick={() => setStatusFilter("PENDING")}
        />
        <StatsCard
          title="Approved KYC"
          value={stats.approved}
          icon={CheckCircle2}
          loading={loading}
          subtext="Eligible to trade/rent"
          className="cursor-pointer hover:border-emerald-500/40 transition-colors"
          onClick={() => setStatusFilter("APPROVED")}
        />
        <StatsCard
          title="Rejected"
          value={stats.rejected}
          icon={XCircle}
          loading={loading}
          subtext="Declined with reason"
          className="cursor-pointer hover:border-rose-500/40 transition-colors"
          onClick={() => setStatusFilter("REJECTED")}
        />
        <StatsCard
          title="Needs Information"
          value={stats.needs_information}
          icon={HelpCircle}
          loading={loading}
          subtext="Awaiting resubmission"
          className="cursor-pointer hover:border-[var(--admin-text)]/25 transition-colors col-span-2 lg:col-span-1"
          onClick={() => setStatusFilter("NEEDS_INFORMATION")}
        />
      </div>

      {/* Filters and Search Bar */}
      <div className="p-4 rounded-2xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: "all", label: "All Applications", count: stats.total },
              {
                id: "PENDING",
                label: "Pending Review",
                count: stats.pending,
                highlight: true,
              },
              { id: "APPROVED", label: "Approved", count: stats.approved },
              { id: "REJECTED", label: "Rejected", count: stats.rejected },
              {
                id: "NEEDS_INFORMATION",
                label: "Needs Info",
                count: stats.needs_information,
              },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer",
                    active
                      ? "bg-primary text-[var(--admin-success)]-foreground shadow-xs"
                      : "bg-[var(--admin-elevated)]/60 hover:bg-[var(--admin-elevated)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]",
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded-full text-[11px] font-mono",
                      active
                        ? "bg-primary-foreground/20 text-[var(--admin-success)]-foreground"
                        : tab.highlight && tab.count > 0
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold"
                          : "bg-muted text-[var(--admin-text-muted)]",
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Account Type Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-[var(--admin-text-muted)] font-semibold flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Type:
            </span>
            <select
              value={accountTypeFilter}
              onChange={(e) => {
                setAccountTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--admin-elevated)] border border-[var(--admin-border)] text-[var(--admin-text)] focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="all">All Accounts (Vendor & Renter)</option>
              <option value="payernt">Vendors only (Aadhaar KYC)</option>
              <option value="payrent">Renters only (PAN KYC)</option>
            </select>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--admin-text-muted)]" />
          <input
            type="text"
            placeholder="Search by applicant name, email, ID, or document number"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-[var(--admin-elevated)] border border-[var(--admin-border)] text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)] focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Applications Table */}
      <Table<AdminKycVerification>
        columns={columns}
        data={paginatedItems}
        loading={loading}
        emptyTitle="No KYC Applications Found"
        emptyDescription={
          error ||
          "No KYC submissions match your active filter and search criteria."
        }
      />

      {/* Pagination */}
      {!loading && filteredItems.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={filteredItems.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(limit) => {
            setItemsPerPage(limit);
            setCurrentPage(1);
          }}
        />
      )}
    </div>
  );
}
