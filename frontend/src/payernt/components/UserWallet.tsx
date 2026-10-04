import React, { useState } from "react";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  Building,
  Plus,
  AlertCircle,
  Filter,
  ShieldCheck,
  CreditCard,
  Sparkles,
  ChevronRight,
  X,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type {
  UserWallet,
  WalletTransaction,
  BankAccount,
  WalletTransactionType,
} from "../types";

interface UserWalletViewProps {
  wallet: UserWallet;
  onRequestWithdrawal: (amount: number, bankAccountId: string) => boolean;
  onAddBankAccount: (account: Omit<BankAccount, "id" | "userId">) => void;
  onSimulateCredit?: (amount: number, productName: string) => void;
  onResetWalletDemo?: () => void;
  onBack?: () => void;
}

export function UserWalletView({
  wallet,
  onRequestWithdrawal,
  onAddBankAccount,
  onSimulateCredit,
  onResetWalletDemo,
  onBack,
}: UserWalletViewProps) {
  // Filter tabs: "all" | "credits" | "withdrawals" | "pending"
  const [filterTab, setFilterTab] = useState<"all" | "credits" | "withdrawals" | "pending">("all");

  // Withdrawal Modal State
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState<"amount" | "bank" | "review">("amount");
  const [withdrawAmountInput, setWithdrawAmountInput] = useState<string>("");
  const [selectedBankId, setSelectedBankId] = useState<string>(
    wallet.bankAccounts.find((b) => b.isPrimary)?.id || wallet.bankAccounts[0]?.id || ""
  );
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // Add Bank Modal State
  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);
  const [holderNameInput, setHolderNameInput] = useState("");
  const [bankNameInput, setBankNameInput] = useState("");
  const [accountNumberInput, setAccountNumberInput] = useState("");
  const [confirmAccountInput, setConfirmAccountInput] = useState("");
  const [ifscInput, setIfscInput] = useState("");
  const [bankFormError, setBankFormError] = useState<string | null>(null);

  // Selected Bank Object
  const selectedBank = wallet.bankAccounts.find((b) => b.id === selectedBankId) || wallet.bankAccounts[0];

  // Filtered transactions
  const filteredTransactions = wallet.transactions.filter((tx) => {
    if (filterTab === "all") return true;
    if (filterTab === "credits") return tx.type === "CREDIT" || tx.type === "REFUND";
    if (filterTab === "withdrawals") return tx.type === "WITHDRAWAL";
    if (filterTab === "pending") return tx.type === "PENDING" || tx.status === "Pending" || tx.status === "Processing";
    return true;
  });

  // Handle Withdrawal Submission
  const handleProceedToBank = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);

    const amount = Number(withdrawAmountInput);
    if (!withdrawAmountInput.trim() || isNaN(amount)) {
      setWithdrawError("Please enter a valid numeric amount.");
      return;
    }
    if (amount <= 0) {
      setWithdrawError("Withdrawal amount must be greater than zero.");
      return;
    }
    if (amount > wallet.availableBalance) {
      setWithdrawError("Insufficient wallet balance.");
      return;
    }

    if (wallet.bankAccounts.length === 0) {
      setIsAddBankModalOpen(true);
      return;
    }

    setWithdrawStep("review");
  };

  const handleConfirmWithdrawal = () => {
    const amount = Number(withdrawAmountInput);
    if (!selectedBank) {
      toast.error("Please select a valid bank account.");
      return;
    }

    const success = onRequestWithdrawal(amount, selectedBank.id);
    if (success) {
      setIsWithdrawModalOpen(false);
      setWithdrawStep("amount");
      setWithdrawAmountInput("");
      setWithdrawError(null);
      toast.success(`Withdrawal request for ₹${amount.toLocaleString("en-IN")} submitted! Status: Processing.`);
    } else {
      setWithdrawError("Failed to process withdrawal. Check available balance.");
    }
  };

  // Handle Add Bank Account
  const handleSaveBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setBankFormError(null);

    if (!holderNameInput.trim()) {
      setBankFormError("Account holder name is required.");
      return;
    }
    if (!bankNameInput.trim()) {
      setBankFormError("Bank name is required.");
      return;
    }
    if (!accountNumberInput.trim() || accountNumberInput.length < 8) {
      setBankFormError("Please enter a valid bank account number (at least 8 digits).");
      return;
    }
    if (accountNumberInput.trim() !== confirmAccountInput.trim()) {
      setBankFormError("Account numbers do not match.");
      return;
    }
    if (!ifscInput.trim() || ifscInput.length < 6) {
      setBankFormError("Please enter a valid IFSC code.");
      return;
    }

    const masked = `XXXX XXXX ${accountNumberInput.trim().slice(-4)}`;
    onAddBankAccount({
      accountHolderName: holderNameInput.trim(),
      bankName: bankNameInput.trim(),
      maskedAccountNumber: masked,
      ifsc: ifscInput.trim().toUpperCase(),
      isPrimary: wallet.bankAccounts.length === 0,
    });

    setIsAddBankModalOpen(false);
    setHolderNameInput("");
    setBankNameInput("");
    setAccountNumberInput("");
    setConfirmAccountInput("");
    setIfscInput("");
    toast.success("Bank account added for withdrawal.");
  };

  return (
    <div className="space-y-8 text-left pb-16">
      {/* Back Button */}
      {onBack && (
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border/80 bg-card hover:bg-secondary text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs group"
          >
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Home</span>
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-display flex items-center gap-2.5">
            <Wallet className="h-7 w-7 text-foreground" />
            <span>Wallet</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Rental yields, withdrawable wallet balance, bank settlements, and transaction history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setWithdrawError(null);
              setWithdrawStep("amount");
              setWithdrawAmountInput("");
              setIsWithdrawModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-foreground text-background text-xs font-bold shadow-xs hover:opacity-90 active:scale-98 transition-all cursor-pointer"
          >
            <ArrowUpRight className="h-4 w-4 stroke-[2.5]" />
            <span>Withdraw Money</span>
          </button>
        </div>
      </div>

      {/* Primary Wallet Balance Card */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-secondary/30 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-muted-foreground block">
                PAYE₹NT WALLET
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-secondary text-foreground border border-border">
                {wallet.accountId || "PAYERNT_USER_001"}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black text-foreground font-display tracking-tight">
                ₹{wallet.availableBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" /> Available Balance
              </span>
              <span className="text-xs text-muted-foreground">Ready for instant bank withdrawal</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setWithdrawError(null);
                setWithdrawStep("amount");
                setWithdrawAmountInput("");
                setIsWithdrawModalOpen(true);
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-foreground text-background text-sm font-bold shadow-md hover:opacity-90 active:scale-98 transition-all cursor-pointer text-center"
            >
              Withdraw Money
            </button>
          </div>
        </div>

        {/* Subtle background branding watermark */}
        <div className="absolute right-4 -bottom-6 text-foreground/5 font-black text-9xl select-none pointer-events-none font-serif">
          ₹
        </div>
      </div>

      {/* Financial Breakdown 4-Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Balance */}
        <div className="p-5 rounded-2xl border border-border bg-card space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Available Balance</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground font-display">
            ₹{wallet.availableBalance.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-muted-foreground">Available to withdraw anytime</p>
        </div>

        {/* Pending Amount */}
        <div className="p-5 rounded-2xl border border-border bg-card space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Amount</span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-display">
            ₹{wallet.pendingBalance.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-muted-foreground">Active rental escrow settlements</p>
        </div>

        {/* Total Received */}
        <div className="p-5 rounded-2xl border border-border bg-card space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Received</span>
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-foreground flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground font-display">
            ₹{wallet.totalReceived.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-muted-foreground">Lifetime rental earnings credited</p>
        </div>

        {/* Total Withdrawn */}
        <div className="p-5 rounded-2xl border border-border bg-card space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Withdrawn</span>
            <div className="h-8 w-8 rounded-xl bg-secondary text-muted-foreground flex items-center justify-center">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground font-display">
            ₹{wallet.totalWithdrawn.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-muted-foreground">Transferred to bank accounts</p>
        </div>
      </div>

      {/* Saved Bank Accounts for Withdrawal */}
      <div className="p-6 rounded-3xl border border-border bg-card space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Saved Bank Accounts</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verified destinations for receiving wallet withdrawal settlements.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setBankFormError(null);
              setIsAddBankModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border hover:bg-secondary text-xs font-semibold text-foreground cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Bank Account</span>
          </button>
        </div>

        {wallet.bankAccounts.length === 0 ? (
          <div className="p-6 text-center rounded-2xl border border-dashed border-border bg-secondary/10">
            <p className="text-xs text-muted-foreground">No bank accounts added yet.</p>
            <button
              type="button"
              onClick={() => setIsAddBankModalOpen(true)}
              className="mt-2 text-xs text-primary font-bold hover:underline cursor-pointer"
            >
              + Add Bank Account for Withdrawals
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {wallet.bankAccounts.map((account) => (
              <div
                key={account.id}
                className={`p-4 rounded-2xl border transition-all ${
                  account.isPrimary
                    ? "border-foreground/40 bg-secondary/30 shadow-2xs"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {account.isPrimary ? "Primary Account" : "Bank Account"}
                  </span>
                  <Building className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="font-mono text-sm font-bold text-foreground tracking-wider">
                  {account.maskedAccountNumber}
                </div>
                <div className="text-xs text-muted-foreground mt-1 truncate">
                  {account.bankName}
                </div>
                <div className="text-[11px] text-muted-foreground/70 font-mono mt-0.5">
                  IFSC: {account.ifsc}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transaction History Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
          <h3 className="text-base font-bold text-foreground">Transaction History</h3>

          {/* Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "All" },
              { id: "credits", label: "Credits" },
              { id: "withdrawals", label: "Withdrawals" },
              { id: "pending", label: "Pending" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                  filterTab === tab.id
                    ? "bg-foreground text-background border-foreground font-bold shadow-2xs"
                    : "bg-card hover:bg-secondary text-muted-foreground hover:text-foreground border-border"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-dashed border-border bg-secondary/10 space-y-2">
            <p className="text-xs text-muted-foreground">No wallet transactions found in this filter.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredTransactions.map((tx) => {
              const isCredit = tx.type === "CREDIT" || tx.type === "REFUND";
              const isWithdrawal = tx.type === "WITHDRAWAL";

              return (
                <div
                  key={tx.id}
                  className="p-4 rounded-2xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-foreground/20 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isCredit
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : isWithdrawal
                          ? "bg-foreground/10 text-foreground"
                          : "bg-amber-500/10 text-amber-500"
                      }`}
                    >
                      {isCredit ? (
                        <ArrowDownLeft className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-foreground">{tx.description}</span>
                        {tx.productName && (
                          <span className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                            {tx.productName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                        <span>{new Date(tx.date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                        {tx.bankAccountMasked && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{tx.bankAccountMasked}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:text-right">
                    <div>
                      <div
                        className={`text-sm font-black font-display ${
                          isCredit
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-foreground"
                        }`}
                      >
                        {isCredit ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
                      </div>
                      <div className="text-[10px] uppercase font-mono font-bold text-muted-foreground mt-0.5">
                        {tx.type}
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                        tx.status === "Completed"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : tx.status === "Processing"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          : "bg-secondary text-muted-foreground border-border"
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* WITHDRAWAL MODAL */}
      <AnimatePresence>
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl text-left"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-foreground text-background flex items-center justify-center font-bold">
                    ₹
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">Withdraw Money</h3>
                    <p className="text-[11px] text-muted-foreground">Transfer to your linked bank account</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="p-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {withdrawStep === "amount" && (
                <form onSubmit={handleProceedToBank} className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/80 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Available Balance:</span>
                    <span className="font-extrabold text-foreground font-mono">
                      ₹{wallet.availableBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Withdrawal Amount (₹)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="1"
                        max={wallet.availableBalance}
                        value={withdrawAmountInput}
                        onChange={(e) => {
                          setWithdrawAmountInput(e.target.value);
                          setWithdrawError(null);
                        }}
                        placeholder="Enter amount (e.g. 5000)"
                        className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-mono focus:border-foreground focus:outline-none"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Bank selection if multiple exist */}
                  {wallet.bankAccounts.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">Select Destination Bank</label>
                      <select
                        value={selectedBankId}
                        onChange={(e) => setSelectedBankId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:border-foreground focus:outline-none cursor-pointer"
                      >
                        {wallet.bankAccounts.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.bankName} ({b.maskedAccountNumber}) {b.isPrimary ? "• Primary" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {withdrawError && (
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{withdrawError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsWithdrawModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-secondary cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-foreground text-background text-xs font-bold shadow-xs hover:opacity-90 cursor-pointer"
                    >
                      Continue
                    </button>
                  </div>
                </form>
              )}

              {withdrawStep === "review" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl border border-border bg-secondary/30 space-y-2 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Withdrawal Summary
                    </span>
                    <div className="flex justify-between py-1 border-b border-border/60">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-extrabold text-foreground font-mono">
                        ₹{Number(withdrawAmountInput).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/60">
                      <span className="text-muted-foreground">Bank:</span>
                      <span className="font-semibold text-foreground">{selectedBank?.bankName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/60">
                      <span className="text-muted-foreground">Account:</span>
                      <span className="font-mono font-semibold text-foreground">
                        {selectedBank?.maskedAccountNumber}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Processing:</span>
                      <span className="text-amber-600 dark:text-amber-400 font-bold">Wallet withdrawal (Processing)</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Note: This is a prototype demonstration. Funds will be recorded as deducted from your wallet and entered into processing status.
                  </p>

                  <div className="flex items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setWithdrawStep("amount")}
                      className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-secondary cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmWithdrawal}
                      className="px-5 py-2 rounded-xl bg-foreground text-background text-xs font-bold shadow-xs hover:opacity-90 cursor-pointer"
                    >
                      Confirm Withdrawal
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD BANK ACCOUNT MODAL */}
      <AnimatePresence>
        {isAddBankModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl text-left"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-foreground" />
                  <div>
                    <h3 className="font-bold text-sm text-foreground">Add Bank Account</h3>
                    <p className="text-[11px] text-muted-foreground">Enter withdrawal destination details</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddBankModalOpen(false)}
                  className="p-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveBankAccount} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Account Holder Name</label>
                  <input
                    type="text"
                    value={holderNameInput}
                    onChange={(e) => setHolderNameInput(e.target.value)}
                    placeholder="e.g. Mohan Bommidi"
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:border-foreground focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Bank Name</label>
                  <input
                    type="text"
                    value={bankNameInput}
                    onChange={(e) => setBankNameInput(e.target.value)}
                    placeholder="e.g. HDFC Bank / State Bank of India"
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:border-foreground focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Account Number</label>
                  <input
                    type="password"
                    value={accountNumberInput}
                    onChange={(e) => setAccountNumberInput(e.target.value)}
                    placeholder="Enter account number"
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-mono focus:border-foreground focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Confirm Account Number</label>
                  <input
                    type="text"
                    value={confirmAccountInput}
                    onChange={(e) => setConfirmAccountInput(e.target.value)}
                    placeholder="Re-enter account number"
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-mono focus:border-foreground focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">IFSC Code</label>
                  <input
                    type="text"
                    value={ifscInput}
                    onChange={(e) => setIfscInput(e.target.value.toUpperCase())}
                    placeholder="e.g. HDFC0001890"
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-mono uppercase focus:border-foreground focus:outline-none"
                    required
                  />
                </div>

                {bankFormError && (
                  <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{bankFormError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddBankModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-secondary cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-foreground text-background text-xs font-bold shadow-xs hover:opacity-90 cursor-pointer"
                  >
                    Save Bank Account
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

export default UserWalletView;
