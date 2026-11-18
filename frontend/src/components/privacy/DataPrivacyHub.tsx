import React, { useState, useEffect } from "react";
import {
  Shield,
  Download,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Trash2,
  Edit3,
  UserCheck,
  RefreshCw,
  ExternalLink,
  Info,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { api, getApiBase } from "@/utils/api";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface DataSummary {
  profile: {
    fullName: string;
    email: string;
    phone: string;
    role: string;
    createdAt: string;
  };
  kyc: {
    status: string;
    panMasked: string | null;
    submittedAt: string | null;
  };
  activityCounts: {
    orders: number;
    registeredDevices: number;
    reviews: number;
  };
  retentionNotice: string;
  statutoryBasis: string;
}

interface PrivacyRequest {
  id: string;
  request_type: string;
  details: string;
  status: "PENDING" | "IN_REVIEW" | "RESOLVED" | "REJECTED";
  created_at: string;
  resolution_notes?: string;
}

export function DataPrivacyHub() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Modals
  const [modalType, setModalType] = useState<"CORRECTION" | "DELETION" | "GRIEVANCE" | null>(null);
  const [requestDetails, setRequestDetails] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Existing requests
  const [myRequests, setMyRequests] = useState<PrivacyRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const fetchSummary = async () => {
    setLoadingSummary(true);
    try {
      const data = await api.getMyDataSummary();
      setSummary(data);
    } catch {
      // Fallback if network or degraded mode
      if (user) {
        setSummary({
          profile: {
            fullName: user.fullName || "User",
            email: user.email || "",
            phone: user.phone || "",
            role: user.role || "customer",
            createdAt: new Date().toISOString(),
          },
          kyc: {
            status: "VERIFIED",
            panMasked: user.panMasked || null,
            submittedAt: null,
          },
          activityCounts: {
            orders: 0,
            registeredDevices: 0,
            reviews: 0,
          },
          retentionNotice: "Transaction and tax records retained for 7 years per statutory compliance.",
          statutoryBasis: "Digital Personal Data Protection Act 2023, Section 11 & 12",
        });
      }
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const list = await api.getMyPrivacyRequests();
      setMyRequests(list || []);
    } catch {
      /* ignore */
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchRequests();
  }, []);

  const handleDownloadArchive = async () => {
    setDownloading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("payent:token") : null;
      const res = await fetch(`${getApiBase()}/api/privacy/export-download`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        throw new Error("Unable to export personal data archive.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payent-personal-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Personal data archive downloaded successfully.");
    } catch (err: unknown) {
      toast.error((err as { message?: string }).message || "Failed to download data archive.");
    } finally {
      setDownloading(false);
    }
  };

  const handleSubmitPrivacyRequest = async () => {
    if (!modalType) return;
    if (!requestDetails.trim() || requestDetails.trim().length < 5) {
      toast.error("Please provide sufficient details for your request (minimum 5 characters).");
      return;
    }

    setSubmittingRequest(true);
    try {
      await api.submitPrivacyRequest({
        requestType: modalType,
        details: requestDetails.trim(),
      });
      toast.success(
        modalType === "DELETION"
          ? "Account deletion request recorded. Our compliance officer will process your request within statutory timelines."
          : modalType === "CORRECTION"
          ? "Data correction request logged successfully."
          : "Grievance lodged. A response will be provided within 48-72 hours."
      );
      setModalType(null);
      setRequestDetails("");
      fetchRequests();
    } catch (err: unknown) {
      toast.error((err as { message?: string }).message || "Failed to submit request.");
    } finally {
      setSubmittingRequest(false);
    }
  };

  return (
    <div className="relative rounded-2xl sm:rounded-3xl bg-white dark:bg-[#1E1E1E] border border-neutral-300/80 dark:border-neutral-700/80 pt-5 sm:pt-6 p-5 sm:p-6 shadow-sm space-y-6 text-left">
      <div className="absolute -top-3 left-4 px-2 bg-white dark:bg-[#1E1E1E] flex items-center gap-1.5 z-10 pointer-events-none select-none">
        <Shield className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs sm:text-[13px] font-bold tracking-tight text-foreground">
          Your Data &amp; Privacy (DPDP Act 2023)
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/70">
        <div>
          <h3 className="text-sm sm:text-base font-extrabold text-foreground">
            Personal Data Rights &amp; Transparent Inventory
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Under India's Digital Personal Data Protection Act 2023, you have the right to access, correct, export, and request erasure of your data.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchSummary}
            disabled={loadingSummary}
            className="text-xs font-bold gap-1.5"
          >
            <RefreshCw className={`h-3 w-3 ${loadingSummary ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleDownloadArchive}
            disabled={downloading}
            className="text-xs font-bold gap-1.5 bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 hover:opacity-90"
          >
            {downloading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Download className="h-3 w-3" />
            )}
            <span>Export Portable Data (.JSON)</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {loadingSummary ? (
        <div className="py-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Compiling personal data register...</span>
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Identity & Account */}
          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 border border-border/60 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <UserCheck className="h-4 w-4 text-emerald-500" />
              <span>Identity &amp; Profile</span>
            </div>
            <div className="text-[11px] text-muted-foreground space-y-1">
              <div>
                <span className="font-semibold text-foreground">Name:</span> {summary.profile.fullName}
              </div>
              <div>
                <span className="font-semibold text-foreground">Email:</span> {summary.profile.email}
              </div>
              <div>
                <span className="font-semibold text-foreground">Phone:</span> {summary.profile.phone || "Not linked"}
              </div>
              <div>
                <span className="font-semibold text-foreground">Account Type:</span> {summary.profile.role}
              </div>
            </div>
          </div>

          {/* Card 2: KYC & Compliance */}
          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 border border-border/60 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Shield className="h-4 w-4 text-primary" />
              <span>KYC Verification Record</span>
            </div>
            <div className="text-[11px] text-muted-foreground space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">Status:</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {summary.kyc.status}
                </span>
              </div>
              <div>
                <span className="font-semibold text-foreground">PAN Reference:</span>{" "}
                <span className="font-mono">{summary.kyc.panMasked || "Not supplied / Encrypted"}</span>
              </div>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 pt-1">
                Raw identity proofs are stored in encrypted object storage with restricted compliance audit access.
              </p>
            </div>
          </div>

          {/* Card 3: Activity & Transactions */}
          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 border border-border/60 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <FileText className="h-4 w-4 text-amber-500" />
              <span>Marketplace Transactions</span>
            </div>
            <div className="text-[11px] text-muted-foreground space-y-1">
              <div>
                <span className="font-semibold text-foreground">Rental Bookings:</span> {summary.activityCounts.orders}
              </div>
              <div>
                <span className="font-semibold text-foreground">Registered Devices:</span> {summary.activityCounts.registeredDevices}
              </div>
              <div>
                <span className="font-semibold text-foreground">Reviews Submitted:</span> {summary.activityCounts.reviews}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Statutory Retention Notice */}
      <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-800 dark:text-sky-300 flex items-start gap-2.5">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-sky-600 dark:text-sky-400" />
        <div className="text-[11px] leading-relaxed">
          <span className="font-bold">Statutory Retention Notice: </span>
          Per Indian legal standards under the Income Tax Act 1961, CGST Act 2017, and Prevention of Money Laundering Act (PMLA), financial transaction records and invoice logs must be retained for a mandatory minimum of 7 years, even following account closure. Non-statutory operational data is securely erased or anonymised.
        </div>
      </div>

      {/* Action Buttons for Rights Execution */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setModalType("CORRECTION")}
          className="text-xs font-bold gap-1.5"
        >
          <Edit3 className="h-3.5 w-3.5" />
          <span>Request Data Correction</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setModalType("DELETION")}
          className="text-xs font-bold gap-1.5 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Request Data Deletion</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setModalType("GRIEVANCE")}
          className="text-xs font-bold gap-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          <span>Lodge Privacy Grievance</span>
        </Button>

        <Link
          to="/privacy"
          target="_blank"
          className="ml-auto inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline"
        >
          <span>Full Privacy Policy</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Existing Privacy Requests Table */}
      {myRequests.length > 0 && (
        <div className="pt-4 border-t border-border/70 space-y-3">
          <div className="text-xs font-bold text-foreground">
            Your Logged Privacy &amp; Data Requests ({myRequests.length})
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-[11px] text-left">
              <thead className="bg-neutral-50 dark:bg-neutral-900 text-muted-foreground uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Request ID</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5">Details</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {myRequests.map((req) => (
                  <tr key={req.id}>
                    <td className="p-2.5 font-mono text-[10px]">{req.id}</td>
                    <td className="p-2.5 font-semibold text-foreground">{req.request_type}</td>
                    <td className="p-2.5 max-w-xs truncate text-muted-foreground">{req.details}</td>
                    <td className="p-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === "RESOLVED"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : req.status === "IN_REVIEW"
                            ? "bg-amber-500/10 text-amber-600"
                            : "bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-muted-foreground">
                      {req.created_at ? new Date(req.created_at).toLocaleDateString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interactive Modal for Data Requests */}
      <Modal
        open={modalType !== null}
        onClose={() => {
          if (!submittingRequest) {
            setModalType(null);
            setRequestDetails("");
          }
        }}
        title={
          modalType === "CORRECTION"
            ? "Request Personal Data Correction"
            : modalType === "DELETION"
            ? "Request Account & Personal Data Deletion"
            : "Lodge DPDP Privacy Grievance"
        }
      >
        <div className="space-y-4 text-left">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {modalType === "CORRECTION" &&
              "Please state specifically which fields (e.g. mobile number, spelling of name, delivery address) require correction and provide the accurate values."}
            {modalType === "DELETION" &&
              "Upon processing, all personal identifiers and active accounts will be permanently erased or anonymised. Please note that transactional billing records must be retained for 7 years under Indian tax regulations."}
            {modalType === "GRIEVANCE" &&
              "Your grievance will be directly routed to our designated Grievance Officer in compliance with DPDP Act 2023 and Information Technology Rules 2021."}
          </p>

          <div>
            <label htmlFor="privacy-request-details" className="block text-xs font-bold text-foreground mb-1.5">
              Request Details &amp; Justification <span className="text-primary">*</span>
            </label>
            <textarea
              id="privacy-request-details"
              rows={4}
              value={requestDetails}
              onChange={(e) => setRequestDetails(e.target.value)}
              placeholder="Provide specific details regarding your request..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submittingRequest}
              onClick={() => {
                setModalType(null);
                setRequestDetails("");
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              loading={submittingRequest}
              disabled={submittingRequest}
              onClick={handleSubmitPrivacyRequest}
              className={`text-xs font-bold ${
                modalType === "DELETION"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              Submit Request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
