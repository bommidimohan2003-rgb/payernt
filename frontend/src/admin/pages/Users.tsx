import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Calendar,
  Package,
  CreditCard,
  RefreshCw,
  X,
  Lock,
  Mail,
  Phone,
  MapPin,
  Clock,
  Layers,
  Wallet,
  ShoppingBag,
  User,
  Building,
} from "lucide-react";
import { Table, Column } from "../components/layout/Table";
import { Pagination } from "../components/layout/Pagination";
import { usersService } from "../services/users";
import { AdminUser } from "../services/api";
import { Loader } from "../components/layout/Loader";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { adminWS } from "../services/websocket";

export default function Users() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Platform Type Tab
  const [platformTab, setPlatformTab] = useState<"all" | "payernt" | "payrent">("all");

  // Search & Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Sorting
  const [sortKey, setSortKey] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // User Detail Drawer
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"profile" | "payernt" | "payrent" | "security">("profile");
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const data = await usersService.getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
      if (!silent) setError("Failed to fetch user directory from database.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();

    const unsubRegister = adminWS.subscribe("user.registered", () => {
      fetchUsers(true);
    });
    const unsubUpdate = adminWS.subscribe("user.updated", () => {
      fetchUsers(true);
    });

    return () => {
      unsubRegister();
      unsubUpdate();
    };
  }, [fetchUsers]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const handleOpenUser = async (u: AdminUser) => {
    setSelectedUser(u);
    setDrawerTab("profile");
    setDrawerOpen(true);
    
    // Fetch full enriched payload
    const lookupId = u.email || u.id;
    try {
      setDrawerLoading(true);
      const full = await usersService.getUserById(lookupId);
      setSelectedUser(full);
    } catch (e) {
      console.warn("Could not fetch full user detail:", e);
    } finally {
      setDrawerLoading(false);
    }
  };

  // User actions & rejection modal
  const [rejectModalTarget, setRejectModalTarget] = useState<{ id: string; name: string; type?: string } | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState("");

  const handleApprove = async (id: string, type?: string) => {
    try {
      setActionLoading(true);
      const updated = await usersService.approveUser(id, type);
      setUsers((prev) =>
        prev.map((u) => {
          const matches =
            (u.accountId && u.accountId === id) ||
            (u.id === id && (!type || !u.accountType || u.accountType.toLowerCase().includes(type.toLowerCase()))) ||
            (u.email === id && (!type || !u.accountType || u.accountType.toLowerCase().includes(type.toLowerCase())));
          return matches ? { ...u, ...updated, status: "APPROVED", verified: true } : u;
        })
      );
      if (selectedUser) {
        const selMatches =
          (selectedUser.accountId && selectedUser.accountId === id) ||
          (selectedUser.id === id && (!type || !selectedUser.accountType || selectedUser.accountType.toLowerCase().includes(type.toLowerCase()))) ||
          (selectedUser.email === id && (!type || !selectedUser.accountType || selectedUser.accountType.toLowerCase().includes(type.toLowerCase())));
        if (selMatches) {
          setSelectedUser((prev) => (prev ? { ...prev, ...updated, status: "APPROVED", verified: true } : null));
        }
      }
      
      // Notify other tabs / pending approval screens instantly
      try {
        if (typeof BroadcastChannel !== "undefined") {
          const bc = new BroadcastChannel("payent-account-approval");
          bc.postMessage({ id, email: id, type, action: "APPROVED" });
          bc.close();
        }
      } catch {}
      try {
        localStorage.setItem("payent_approved_event", JSON.stringify({ email: id, type, timestamp: Date.now() }));
      } catch {}

      toast.success(`${type || "User"} account approved and verified.`);
    } catch {
      toast.error("Failed to approve user.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalTarget) return;
    const { id, name, type } = rejectModalTarget;
    try {
      setActionLoading(true);
      const reason = rejectReasonInput.trim() || "Submitted information needs correction.";
      const updated = await usersService.rejectUser(id, reason, type);
      setUsers((prev) =>
        prev.map((u) => {
          const matches =
            (u.accountId && u.accountId === id) ||
            (u.id === id && (!type || !u.accountType || u.accountType.toLowerCase().includes(type.toLowerCase()))) ||
            (u.email === id && (!type || !u.accountType || u.accountType.toLowerCase().includes(type.toLowerCase())));
          return matches ? { ...u, ...updated, status: "REJECTED", rejectionReason: reason } : u;
        })
      );
      if (selectedUser) {
        const selMatches =
          (selectedUser.accountId && selectedUser.accountId === id) ||
          (selectedUser.id === id && (!type || !selectedUser.accountType || selectedUser.accountType.toLowerCase().includes(type.toLowerCase()))) ||
          (selectedUser.email === id && (!type || !selectedUser.accountType || selectedUser.accountType.toLowerCase().includes(type.toLowerCase())));
        if (selMatches) {
          setSelectedUser((prev) => (prev ? { ...prev, ...updated, status: "REJECTED", rejectionReason: reason } : null));
        }
      }
      setRejectModalTarget(null);
      setRejectReasonInput("");
      toast.info(`Account "${name}" rejected (Reason: ${reason}).`);
    } catch {
      toast.error("Failed to reject user.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async (id: string) => {
    if (!confirm("Are you sure you want to suspend this user? They will be barred from creating bookings or listings.")) return;
    try {
      setActionLoading(true);
      const updated = await usersService.suspendUser(id);
      setUsers((prev) => prev.map((u) => ((u.id === id || u.email === id) ? { ...u, ...updated, status: "suspended" } : u)));
      if (selectedUser && (selectedUser.id === id || selectedUser.email === id)) {
        setSelectedUser((prev) => prev ? { ...prev, ...updated, status: "suspended" } : null);
      }
      toast.warning("User suspended.");
    } catch {
      toast.error("Failed to suspend user.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      setActionLoading(true);
      const updated = await usersService.activateUser(id);
      setUsers((prev) => prev.map((u) => ((u.id === id || u.email === id) ? { ...u, ...updated, status: "active" } : u)));
      if (selectedUser && (selectedUser.id === id || selectedUser.email === id)) {
        setSelectedUser((prev) => prev ? { ...prev, ...updated, status: "active" } : null);
      }
      toast.success("User account reactivated.");
    } catch {
      toast.error("Failed to reactivate user.");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Platform Tab filter
    if (platformTab === "payernt") {
      result = result.filter(
        (u) =>
          u.role === "agent" ||
          u.role === "lender" ||
          u.role === "vendor" ||
          u.role === "both" ||
          u.accountType?.toLowerCase().includes("payernt") ||
          u.accountType?.toLowerCase().includes("both")
      );
    } else if (platformTab === "payrent") {
      result = result.filter(
        (u) =>
          u.role === "customer" ||
          u.role === "user" ||
          u.role === "renter" ||
          u.role === "both" ||
          u.accountType?.toLowerCase().includes("payrent") ||
          u.accountType?.toLowerCase().includes("both")
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          (u.fullName && u.fullName.toLowerCase().includes(q)) ||
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.id && u.id.toLowerCase().includes(q)) ||
          (u.accountId && u.accountId.toLowerCase().includes(q)) ||
          (u.phone && u.phone.includes(q))
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((u) => {
        const s = String(u.status || "").toUpperCase();
        if (statusFilter === "pending") {
          return s === "PENDING_REVIEW" || s === "PENDING" || s === "UNVERIFIED" || !u.verified;
        }
        if (statusFilter === "active") {
          return s === "APPROVED" || s === "ACTIVE" || (u.verified && s !== "SUSPENDED" && s !== "REJECTED");
        }
        if (statusFilter === "rejected") {
          return s === "REJECTED" || s === "DECLINED";
        }
        if (statusFilter === "suspended") {
          return s === "SUSPENDED";
        }
        return s.toLowerCase() === statusFilter.toLowerCase();
      });
    }

    result.sort((a, b) => {
      const fieldA = (a as unknown as Record<string, string | number>)[sortKey];
      const fieldB = (b as unknown as Record<string, string | number>)[sortKey];

      if (typeof fieldA === "string" && typeof fieldB === "string") {
        return sortOrder === "asc" ? fieldA.localeCompare(fieldB) : fieldB.localeCompare(fieldA);
      }
      if (typeof fieldA === "number" && typeof fieldB === "number") {
        return sortOrder === "asc" ? fieldA - fieldB : fieldB - fieldA;
      }
      return 0;
    });

    return result;
  }, [users, platformTab, search, statusFilter, sortKey, sortOrder]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  const columns: Column<AdminUser>[] = [
    {
      key: "user",
      label: "User Profile",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-secondary border border-border/80 flex items-center justify-center font-bold text-xs text-foreground overflow-hidden shrink-0">
            {row.avatar || row.profilePhotoUrl ? (
              <img src={row.avatar || row.profilePhotoUrl} alt={row.fullName} className="h-full w-full object-cover" />
            ) : (
              <span>{(row.fullName || row.email || "U").charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-foreground truncate">{row.fullName || "User"}</div>
            <div className="text-[11px] text-muted-foreground font-mono truncate">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Account Type",
      sortable: true,
      render: (row) => (
        <span
          className={cn(
            "px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border inline-flex items-center gap-1",
            row.role === "admin"
              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
              : row.role === "both"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : row.role === "agent"
              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
              : "bg-secondary text-muted-foreground border-border/60"
          )}
        >
          {row.accountType || row.role || "Standard"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row) => {
        const rawStatus = String(row.status || "").toUpperCase();
        const isApproved = rawStatus === "APPROVED" || rawStatus === "ACTIVE";
        const isPending = rawStatus === "PENDING" || rawStatus === "PENDING_REVIEW" || rawStatus === "UNVERIFIED";
        const isSuspended = rawStatus === "SUSPENDED";
        const isRejected = rawStatus === "REJECTED" || rawStatus === "DECLINED";

        return (
          <span
            className={cn(
              "px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wider border inline-flex items-center gap-1",
              isApproved
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : isPending
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                : isSuspended || isRejected
                ? "bg-red-500/10 text-[#FF1744] border-red-500/20"
                : "bg-secondary text-muted-foreground border-border/60"
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", isPending ? "bg-amber-500 animate-pulse" : "bg-current")} />
            {isPending ? "Pending Review" : (row.status || "active")}
          </span>
        );
      },
    },
    {
      key: "phone",
      label: "Contact",
      render: (row) => (
        <span className="text-xs font-mono text-muted-foreground">
          {row.phone || "—"}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Registered",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground font-mono">
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (row) => {
        const rawStatus = String(row.status || "").toUpperCase();
        const isPending = rawStatus === "PENDING" || rawStatus === "PENDING_REVIEW" || rawStatus === "UNVERIFIED";
        const isSuspended = rawStatus === "SUSPENDED";
        const isPayernt = row.accountType?.toLowerCase().includes("payernt") || row.role === "lender" || row.role === "vendor";
        const typeLabel = isPayernt ? "Payernt" : "Payrent";

        return (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => handleOpenUser(row)}
              className="p-1.5 rounded-md hover:bg-secondary text-foreground transition-colors cursor-pointer"
              title="Inspect complete user record"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>

            {isPending && (
              <>
                <button
                  onClick={() => handleApprove(row.accountId || row.id || row.email, typeLabel)}
                  disabled={actionLoading}
                  className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors cursor-pointer"
                  title={`Approve ${typeLabel} user`}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() =>
                    setRejectModalTarget({
                      id: row.accountId || row.id || row.email,
                      name: row.fullName || row.email,
                      type: typeLabel,
                    })
                  }
                  disabled={actionLoading}
                  className="p-1.5 rounded-md bg-red-500/10 text-[#FF1744] hover:bg-red-500/20 border border-red-500/20 transition-colors cursor-pointer"
                  title={`Reject ${typeLabel} user`}
                >
                  <XCircle className="h-3.5 w-3.5" />
                </button>
              </>
            )}

            {isSuspended ? (
              <button
                onClick={() => handleActivate(row.id || row.email)}
                disabled={actionLoading}
                className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors cursor-pointer"
                title="Reactivate user"
              >
                <UserCheck className="h-3.5 w-3.5" />
              </button>
            ) : (
              !isPending && (
                <button
                  onClick={() => handleSuspend(row.id || row.email)}
                  disabled={actionLoading}
                  className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-[#FF1744] transition-colors cursor-pointer"
                  title="Suspend user"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                </button>
              )
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            User Directory & Verification
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Review and manage paye₹nt (lender) and pay₹ent (renter) accounts from shared database
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchUsers()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-secondary/50 hover:bg-secondary text-foreground text-xs font-medium transition-colors cursor-pointer"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-muted-foreground", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* PLATFORM SIDE SELECTOR TABS (Section 15 Requirements) */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <button
          onClick={() => {
            setPlatformTab("all");
            setCurrentPage(1);
          }}
          className={cn(
            "px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
            platformTab === "all"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-card border border-border/70 text-muted-foreground hover:text-foreground"
          )}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>All Accounts</span>
        </button>

        <button
          onClick={() => {
            setPlatformTab("payernt");
            setCurrentPage(1);
          }}
          className={cn(
            "px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
            platformTab === "payernt"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-card border border-border/70 text-muted-foreground hover:text-foreground"
          )}
        >
          <Package className="h-3.5 w-3.5" />
          <span>paye₹nt (Lenders / Vendors)</span>
        </button>

        <button
          onClick={() => {
            setPlatformTab("payrent");
            setCurrentPage(1);
          }}
          className={cn(
            "px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
            platformTab === "payrent"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-card border border-border/70 text-muted-foreground hover:text-foreground"
          )}
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          <span>pay₹ent (Renters / Customers)</span>
        </button>
      </div>

      {/* FILTERS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, email, phone, or account ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-card text-foreground text-xs rounded-lg pl-9 pr-3 py-2 border border-border/70 focus:outline-none focus:border-foreground/40 font-medium placeholder:text-muted-foreground"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Tabs */}
          <div className="flex items-center p-0.5 bg-secondary/60 rounded-lg border border-border/60 text-xs font-medium">
            {["all", "active", "pending", "suspended", "rejected"].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-2.5 py-1 rounded-md capitalize transition-colors cursor-pointer text-xs",
                  statusFilter === st
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ERROR vs TABLE CONTAINER */}
      {error ? (
        <div className="bg-card border border-red-500/20 p-8 rounded-xl text-center space-y-3">
          <div className="inline-flex p-2.5 rounded-full bg-red-500/10 text-[#FF1744]">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Unable to Load Users</h3>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
          <div>
            <button
              onClick={() => fetchUsers()}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry Database Fetch</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/80 shadow-xs overflow-hidden">
          <Table
            columns={columns}
            data={paginatedUsers}
            loading={loading}
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSort={handleSort}
            emptyTitle="No Accounts Found"
            emptyDescription="The database contains no account records matching your current filter criteria."
          />

          {filteredUsers.length > itemsPerPage && !loading && (
            <div className="p-4 border-t border-border/40">
              <Pagination
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredUsers.length}
              />
            </div>
          )}
        </div>
      )}

      {/* USER DETAIL SLIDE-OUT DRAWER */}
      {drawerOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end bg-background/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-card border-l border-border/80 shadow-2xl h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-border/60 flex items-center justify-between bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-secondary border border-border flex items-center justify-center font-bold text-sm text-foreground overflow-hidden shrink-0">
                  {selectedUser.avatar || selectedUser.profilePhotoUrl ? (
                    <img src={selectedUser.avatar || selectedUser.profilePhotoUrl} alt={selectedUser.fullName} className="h-full w-full object-cover" />
                  ) : (
                    <span>{(selectedUser.fullName || selectedUser.email).charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground truncate">
                    {selectedUser.fullName || "User Detail"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-mono truncate">
                    {selectedUser.email}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Drawer Navigation Tabs */}
            <div className="flex items-center border-b border-border/40 px-5 pt-2 gap-4 text-xs font-semibold overflow-x-auto no-scrollbar">
              <button
                onClick={() => setDrawerTab("profile")}
                className={cn(
                  "pb-2 border-b-2 cursor-pointer transition-colors shrink-0",
                  drawerTab === "profile" ? "border-primary text-foreground font-bold" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Profile & ID
              </button>

              <button
                onClick={() => setDrawerTab("payernt")}
                className={cn(
                  "pb-2 border-b-2 cursor-pointer transition-colors shrink-0",
                  drawerTab === "payernt" ? "border-emerald-500 text-emerald-500 font-bold" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                paye₹nt (Lender)
              </button>

              <button
                onClick={() => setDrawerTab("payrent")}
                className={cn(
                  "pb-2 border-b-2 cursor-pointer transition-colors shrink-0",
                  drawerTab === "payrent" ? "border-blue-500 text-blue-500 font-bold" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                pay₹ent (Renter)
              </button>

              <button
                onClick={() => setDrawerTab("security")}
                className={cn(
                  "pb-2 border-b-2 cursor-pointer transition-colors shrink-0",
                  drawerTab === "security" ? "border-primary text-foreground font-bold" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Security & KYC
              </button>
            </div>

            {/* Drawer Body Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {drawerLoading ? (
                <div className="py-12 flex justify-center">
                  <Loader message="Loading complete record..." size="md" />
                </div>
              ) : (
                <>
                  {/* TAB 1: OVERVIEW & GENERAL IDENTITY */}
                  {drawerTab === "profile" && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-secondary/30 border border-border/60 space-y-2.5">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Account Identifier</span>
                          <span className="font-mono font-bold text-foreground">{selectedUser.id}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Account Status</span>
                          <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded bg-secondary border border-border/60">
                            {selectedUser.status}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Platform Role</span>
                          <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded bg-secondary border border-border/60">
                            {selectedUser.role} ({selectedUser.accountType || "Standard"})
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Registration Date</span>
                          <span className="font-mono">{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : "—"}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Contact & Address</h4>
                        <div className="p-3.5 rounded-xl bg-card border border-border/60 space-y-2.5">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-3.5 w-3.5 text-primary" />
                            <span className="text-foreground font-medium">{selectedUser.email}</span>
                          </div>
                          {selectedUser.phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-3.5 w-3.5 text-primary" />
                              <span className="text-foreground font-mono font-medium">{selectedUser.phone}</span>
                            </div>
                          )}
                          {(selectedUser.city || selectedUser.address) && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 text-primary" />
                              <span className="text-foreground font-medium">
                                {[selectedUser.address, selectedUser.city, selectedUser.pincode].filter(Boolean).join(", ")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: PAYE₹NT (LENDER) PROFILE */}
                  {drawerTab === "payernt" && (
                    <div className="space-y-4">
                      {selectedUser.payerntAccount ? (
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                          <div className="flex justify-between items-center border-b border-emerald-500/20 pb-2">
                            <span className="font-bold text-foreground flex items-center gap-1.5">
                              <Package className="h-4 w-4 text-emerald-500" />
                              <span>paye₹nt Vendor Profile</span>
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              ID: {selectedUser.payerntAccount.accountId}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-muted-foreground block text-[11px]">Vendor Name</span>
                              <span className="font-semibold text-foreground">{selectedUser.payerntAccount.name}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[11px]">Vendor Phone</span>
                              <span className="font-mono font-semibold text-foreground">{selectedUser.payerntAccount.phone}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[11px]">Aadhaar (Masked)</span>
                              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                {selectedUser.payerntAccount.aadhaarMasked} ({selectedUser.payerntAccount.aadhaarStatus})
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[11px]">Payout Account</span>
                              <span className="font-mono font-semibold text-foreground">
                                {selectedUser.payerntAccount.bankAccountMasked} (IFSC: {selectedUser.payerntAccount.bankIfsc})
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-secondary/30 border border-border/60 text-muted-foreground text-center">
                          No dedicated paye₹nt vendor account registered under this email.
                        </div>
                      )}

                      {/* Wallet Balance */}
                      {selectedUser.wallet && (
                        <div className="p-4 rounded-xl bg-card border border-border/60 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-foreground flex items-center gap-1.5">
                              <Wallet className="h-4 w-4 text-emerald-500" />
                              <span>Vendor Wallet</span>
                            </span>
                            <span className="font-mono font-bold text-emerald-500 text-sm">
                              ₹{selectedUser.wallet.availableBalance.toLocaleString()}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                            <div>Pending: <span className="font-mono text-foreground font-semibold">₹{selectedUser.wallet.pendingAmount.toLocaleString()}</span></div>
                            <div>Total Received: <span className="font-mono text-foreground font-semibold">₹{selectedUser.wallet.totalReceived.toLocaleString()}</span></div>
                          </div>
                        </div>
                      )}

                      {/* Equipment Listings */}
                      <div className="space-y-2">
                        <h4 className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                          Equipment Listed ({selectedUser.products?.length || 0})
                        </h4>
                        {selectedUser.products && selectedUser.products.length > 0 ? (
                          <div className="space-y-2">
                            {selectedUser.products.map((p) => (
                              <div key={p.id} className="p-3 rounded-lg bg-card border border-border/60 flex justify-between items-center">
                                <div>
                                  <span className="font-bold text-foreground block">{p.title}</span>
                                  <span className="text-[11px] font-mono text-muted-foreground">{p.id} • {p.category}</span>
                                </div>
                                <div className="text-right font-mono">
                                  <span className="font-bold text-foreground">₹{p.price}/day</span>
                                  <span className="block text-[10px] uppercase font-semibold text-emerald-500">{p.status}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No active equipment listed.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: PAY₹ENT (RENTER) PROFILE */}
                  {drawerTab === "payrent" && (
                    <div className="space-y-4">
                      {selectedUser.payrentAccount ? (
                        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-3">
                          <div className="flex justify-between items-center border-b border-blue-500/20 pb-2">
                            <span className="font-bold text-foreground flex items-center gap-1.5">
                              <ShoppingBag className="h-4 w-4 text-blue-500" />
                              <span>pay₹ent Customer Profile</span>
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              ID: {selectedUser.payrentAccount.accountId}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-muted-foreground block text-[11px]">Customer Name</span>
                              <span className="font-semibold text-foreground">{selectedUser.payrentAccount.fullName}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[11px]">Phone</span>
                              <span className="font-mono font-semibold text-foreground">{selectedUser.payrentAccount.phone}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[11px]">PAN (Masked)</span>
                              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                                {selectedUser.payrentAccount.panMasked} ({selectedUser.payrentAccount.panStatus})
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[11px]">KYC Status</span>
                              <span className="font-semibold text-emerald-500">{selectedUser.payrentAccount.verificationStatus}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-secondary/30 border border-border/60 text-muted-foreground text-center">
                          No dedicated pay₹ent customer account registered under this email.
                        </div>
                      )}

                      {/* Bookings Made */}
                      <div className="space-y-2">
                        <h4 className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                          Rental Orders & Leases ({selectedUser.bookings?.length || 0})
                        </h4>
                        {selectedUser.bookings && selectedUser.bookings.length > 0 ? (
                          <div className="space-y-2">
                            {selectedUser.bookings.map((b) => (
                              <div key={b.id} className="p-3 rounded-lg bg-card border border-border/60 flex justify-between items-center">
                                <div>
                                  <span className="font-bold text-foreground block">{b.productTitle}</span>
                                  <span className="text-[11px] font-mono text-muted-foreground">{b.startDate} → {b.endDate}</span>
                                </div>
                                <div className="text-right font-mono">
                                  <span className="font-bold text-foreground">₹{b.amount.toLocaleString()}</span>
                                  <span className="block text-[10px] uppercase font-semibold text-blue-500">{b.status}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No bookings made yet.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 4: KYC & SECURITY */}
                  {drawerTab === "security" && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-secondary/40 border border-border/60 space-y-3">
                        <div className="flex items-center gap-2 font-bold text-foreground">
                          <ShieldCheck className="h-4 w-4 text-emerald-500" />
                          <span>Identity Verification & Compliance</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Account has been verified against government database records with Aadhaar/PAN compliance. Secret PINs and authentication secrets are permanently masked.
                        </p>
                        <div className="pt-2 border-t border-border/40 flex justify-between items-center font-mono">
                          <span>Verification State:</span>
                          <span className={cn("font-bold uppercase", selectedUser.verified ? "text-emerald-500" : "text-amber-500")}>
                            {selectedUser.verified ? "VERIFIED" : "PENDING"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-5 border-t border-border/60 bg-secondary/20 flex items-center justify-between gap-2">
              {selectedUser.status === "pending" ? (
                <>
                  <button
                    onClick={() => handleApprove(selectedUser.accountId || selectedUser.id || selectedUser.email, selectedUser.accountType)}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all cursor-pointer"
                  >
                    Approve Account
                  </button>
                  <button
                    onClick={() => {
                      setRejectModalTarget({
                        id: selectedUser.accountId || selectedUser.id || selectedUser.email,
                        name: selectedUser.fullName || selectedUser.email,
                        type: selectedUser.accountType,
                      });
                    }}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-white font-bold text-xs transition-all cursor-pointer"
                  >
                    Reject Account
                  </button>
                </>
              ) : selectedUser.status === "suspended" ? (
                <button
                  onClick={() => handleActivate(selectedUser.id || selectedUser.email)}
                  disabled={actionLoading}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Reactivate Account
                </button>
              ) : (
                <button
                  onClick={() => handleSuspend(selectedUser.id || selectedUser.email)}
                  disabled={actionLoading}
                  className="w-full py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Suspend Account
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
