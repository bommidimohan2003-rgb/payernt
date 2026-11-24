import React, { useState } from "react";
import {
  IndianRupee,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  ShieldCheck,
  CreditCard,
  Building,
  Edit3,
  Download,
  Calendar,
  Layers,
  Sparkles,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { EarningTransaction, LenderProfile } from "../types";

interface LenderEarningsProps {
  transactions: EarningTransaction[];
  profile: LenderProfile;
  onUpdateProfile: (updates: Partial<LenderProfile>) => void;
  onNavigateToProducts: () => void;
}

export function LenderEarnings({
  transactions,
  profile,
  onUpdateProfile,
  onNavigateToProducts,
}: LenderEarningsProps) {
  const [isEditingPayoutModal, setIsEditingPayoutModal] = useState(false);
  const [upiInput, setUpiInput] = useState(profile.payoutUpi || "");
  const [bankHolder, setBankHolder] = useState(profile.payoutBank?.accountHolder || "");
  const [bankNumber, setBankNumber] = useState(profile.payoutBank?.accountNumber || "");
  const [bankIfsc, setBankIfsc] = useState(profile.payoutBank?.ifsc || "");
  const [bankName, setBankName] = useState(profile.payoutBank?.bankName || "");

  const settledTransactions = transactions.filter((t) => t.payoutStatus === "settled");
  const pendingTransactions = transactions.filter(
    (t) => t.payoutStatus === "processing" || t.payoutStatus === "upcoming"
  );

  const totalSettledEarnings = settledTransactions.reduce((sum, t) => sum + (t.netPayout ?? 0), 0);
  const totalPendingEarnings = pendingTransactions.reduce((sum, t) => sum + (t.netPayout ?? 0), 0);
  const completedRentalsCount = settledTransactions.length;

  const handleSavePayoutSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiInput.trim()) {
      toast.error("Please enter a valid UPI ID.");
      return;
    }
    onUpdateProfile({
      payoutUpi: upiInput.trim(),
      payoutBank: {
        accountHolder: bankHolder.trim(),
        accountNumber: bankNumber.trim(),
        ifsc: bankIfsc.trim(),
        bankName: bankName.trim(),
      },
    });
    setIsEditingPayoutModal(false);
    toast.success("Payout preferences updated successfully!");
  };

  return (
    <div className="space-y-8 text-left pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-display">
            Lender Earnings & Payouts
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time tracking of rental yields, settled UPI transactions, and escrow balances.
          </p>
        </div>

        <button
          onClick={() => setIsEditingPayoutModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-secondary text-foreground text-xs font-bold transition-all cursor-pointer shrink-0 shadow-xs"
        >
          <CreditCard className="h-4 w-4 text-primary" />
          <span>Payout Destination Settings</span>
        </button>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Settled */}
        <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Earnings</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-foreground font-display">
            ₹{totalSettledEarnings.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> 100% Settled to UPI
          </p>
        </div>

        {/* This Month Estimate */}
        <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">This Month</span>
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-foreground font-display">
            ₹{(totalSettledEarnings * 0.45).toFixed(0).toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground">Active September rental cycle</p>
        </div>

        {/* Pending In Escrow */}
        <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Payout</span>
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-foreground font-display">
            ₹{totalPendingEarnings.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
            Settles on gear return
          </p>
        </div>

        {/* Completed Rentals */}
        <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Completed Rentals</span>
            <div className="h-8 w-8 rounded-xl bg-secondary text-foreground flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-foreground font-display">
            {completedRentalsCount}
          </div>
          <p className="text-[11px] text-muted-foreground">100% positive return ratings</p>
        </div>
      </div>

      {/* Payout Destination Info Banner */}
      <div className="p-5 rounded-2xl border border-border/80 bg-secondary/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-foreground text-background flex items-center justify-center font-black text-base shrink-0">
            UPI
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Default Auto-Settlement Account
            </span>
            <h4 className="font-extrabold text-sm text-foreground">{profile.payoutUpi}</h4>
            <p className="text-[11px] text-muted-foreground">
              {profile.payoutBank.bankName} • {profile.payoutBank.accountNumber}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsEditingPayoutModal(true)}
          className="text-xs font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
        >
          <Edit3 className="h-3.5 w-3.5" />
          <span>Change Account</span>
        </button>
      </div>

      {/* Payout Transactions Log Table */}
      <div className="rounded-2xl sm:rounded-3xl border border-neutral-300/80 dark:border-neutral-700/80 bg-card dark:bg-[#1E1E1E] p-4 sm:p-6 shadow-xs space-y-4 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm sm:text-base font-bold tracking-tight text-foreground font-display">
            Completed Rental Settlement Log
          </h3>
          <span className="text-xs text-muted-foreground font-medium w-fit px-2.5 py-0.5 rounded-full bg-secondary border border-border/60">
            {transactions.length} Total Records
          </span>
        </div>

        {/* Desktop table (hidden on mobile) */}
        <div className="hidden sm:block rounded-2xl border border-border/80 bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/70 bg-secondary/40 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 text-left font-extrabold text-muted-foreground whitespace-nowrap">Gear / Order ID</th>
                  <th className="py-3 px-4 text-left font-extrabold text-muted-foreground whitespace-nowrap">Borrower</th>
                  <th className="py-3 px-4 text-left font-extrabold text-muted-foreground whitespace-nowrap">Rental Duration</th>
                  <th className="py-3 px-4 text-left font-extrabold text-muted-foreground whitespace-nowrap">Gross Rental</th>
                  <th className="py-3 px-4 text-left font-extrabold text-muted-foreground whitespace-nowrap">Platform Fee</th>
                  <th className="py-3 px-4 text-left font-extrabold text-muted-foreground whitespace-nowrap">Net Payout</th>
                  <th className="py-3 px-4 text-left font-extrabold text-muted-foreground whitespace-nowrap">Settlement Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 font-medium">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 px-4 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-secondary/60 border border-border text-muted-foreground">
                          <CheckCircle2 className="h-7 w-7 opacity-40" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-sm">No completed rentals yet</p>
                          <p className="text-muted-foreground text-xs mt-1">
                            Settled payouts will appear here once a rental cycle is complete.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={tx.productImage}
                          alt={tx.productTitle}
                          className="h-10 w-10 rounded-lg object-cover bg-secondary shrink-0 border border-border"
                        />
                        <div>
                          <p className="font-bold text-foreground line-clamp-1">{tx.productTitle}</p>
                          <span className="font-mono text-[10px] text-muted-foreground">{tx.orderId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-foreground font-semibold">{tx.renterName}</td>
                    <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                      {tx.rentalPeriod} ({tx.rentalDays}d)
                    </td>
                    <td className="py-3.5 px-4 text-foreground font-semibold">
                      ₹{(tx.grossRental ?? 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-bold">
                      ₹0 (Direct)
                    </td>
                    <td className="py-3.5 px-4 text-foreground font-extrabold text-sm">
                      ₹{(tx.netPayout ?? 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4">
                      {tx.payoutStatus === "settled" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" /> Settled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          <Clock className="h-3 w-3" /> In Escrow
                        </span>
                      )}
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile stacked cards (hidden on sm+) */}
        <div className="sm:hidden flex flex-col divide-y divide-border/50 rounded-2xl border border-border/80 bg-card overflow-hidden">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 px-4 text-center">
              <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-secondary/60 border border-border text-muted-foreground">
                <CheckCircle2 className="h-7 w-7 opacity-40" />
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">No completed rentals yet</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Settled payouts will appear here once a rental cycle is complete.
                </p>
              </div>
            </div>
          ) : (
          transactions.map((tx) => (
            <div key={tx.id} className="flex flex-col gap-2.5 p-4">
              <div className="flex items-center gap-3">
                <img
                  src={tx.productImage}
                  alt={tx.productTitle}
                  className="h-12 w-12 rounded-xl object-cover bg-secondary shrink-0 border border-border"
                />
                <div className="min-w-0">
                  <p className="font-bold text-foreground text-sm line-clamp-1">{tx.productTitle}</p>
                  <span className="font-mono text-[10px] text-muted-foreground">{tx.orderId}</span>
                </div>
                <div className="ml-auto shrink-0">
                  {tx.payoutStatus === "settled" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3" /> Settled
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      <Clock className="h-3 w-3" /> In Escrow
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <div>
                  <span className="text-muted-foreground font-medium uppercase text-[10px] tracking-wider">Borrower</span>
                  <p className="font-semibold text-foreground">{tx.renterName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium uppercase text-[10px] tracking-wider">Duration</span>
                  <p className="text-muted-foreground">{tx.rentalPeriod} ({tx.rentalDays}d)</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium uppercase text-[10px] tracking-wider">Gross Rental</span>
                  <p className="font-semibold text-foreground">₹{(tx.grossRental ?? 0).toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium uppercase text-[10px] tracking-wider">Net Payout</span>
                  <p className="font-extrabold text-foreground text-sm">₹{(tx.netPayout ?? 0).toLocaleString("en-IN")}</p>
                </div>
              </div>
            </div>
          ))
          )}
        </div>
      </div>

      {/* Payout Settings Modal */}
      <AnimatePresence>
        {isEditingPayoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4 text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="font-bold text-base text-foreground font-display">
                  Payout Account Configuration
                </h3>
                <button
                  onClick={() => setIsEditingPayoutModal(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSavePayoutSettings} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground block">
                    Instant UPI ID (Primary Payout Method) *
                  </label>
                  <input
                    type="text"
                    value={upiInput}
                    onChange={(e) => setUpiInput(e.target.value)}
                    placeholder="e.g. yourname@okaxis, 9876543210@paytm"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary/30 text-xs text-foreground focus:outline-none focus:border-primary font-bold"
                    required
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Rental funds are transferred within 60 minutes of rental completion.
                  </span>
                </div>

                <div className="pt-2 border-t border-border/60 space-y-3">
                  <span className="font-bold text-foreground block">
                    Bank Account Backup (NEFT / IMPS)
                  </span>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-muted-foreground block">Account Holder Name</label>
                    <input
                      type="text"
                      value={bankHolder}
                      onChange={(e) => setBankHolder(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg border border-border bg-card text-xs text-foreground focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-muted-foreground block">Account Number</label>
                      <input
                        type="text"
                        value={bankNumber}
                        onChange={(e) => setBankNumber(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-lg border border-border bg-card text-xs text-foreground focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-muted-foreground block">IFSC Code</label>
                      <input
                        type="text"
                        value={bankIfsc}
                        onChange={(e) => setBankIfsc(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-lg border border-border bg-card text-xs text-foreground focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-muted-foreground block">Bank & Branch</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg border border-border bg-card text-xs text-foreground focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => setIsEditingPayoutModal(false)}
                    className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-secondary cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-foreground text-background font-bold cursor-pointer"
                  >
                    Save Preferences
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
