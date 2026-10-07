import React, { useState, useEffect } from "react";
import { ArrowRightLeft, Check, X, Clock, ShieldAlert, Laptop } from "lucide-react";
import { Button } from "@/components/common/Button";
import { deviceService, DeviceTransferItem } from "@/services/deviceService";

interface OwnershipTransferTabProps {
  onRefreshDevices: () => Promise<void>;
}

export const OwnershipTransferTab: React.FC<OwnershipTransferTabProps> = ({ onRefreshDevices }) => {
  const [transfers, setTransfers] = useState<{
    outgoing: DeviceTransferItem[];
    incoming: DeviceTransferItem[];
  }>({ outgoing: [], incoming: [] });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const res = await deviceService.getPendingTransfers();
      setTransfers(res.transfers || { outgoing: [], incoming: [] });
    } catch (err) {
      console.error("Failed to load transfers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const handleAccept = async (transferId: string) => {
    setActionLoading(transferId);
    try {
      await deviceService.acceptTransfer(transferId);
      await fetchTransfers();
      await onRefreshDevices();
    } catch (err) {
      console.error("Accept transfer failed", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (transferId: string) => {
    setActionLoading(transferId);
    try {
      await deviceService.cancelTransfer(transferId);
      await fetchTransfers();
      await onRefreshDevices();
    } catch (err) {
      console.error("Cancel transfer failed", err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white font-display flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          Device Ownership Transfers
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          Review incoming laptop transfer offers or manage outgoing transfer requests.
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-neutral-400">Loading pending transfers...</div>
      ) : (
        <div className="space-y-6">
          {/* Incoming Transfers */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <span>Incoming Transfers</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold">
                {transfers.incoming.length}
              </span>
            </h4>

            {transfers.incoming.length === 0 ? (
              <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-[#131E2A]/50 border border-neutral-200/60 dark:border-white/5 text-center text-xs text-neutral-400">
                No incoming transfer requests at this time.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {transfers.incoming.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl bg-white dark:bg-[#0D151D] border border-sky-500/30 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                          <Laptop className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
                            {t.device_name || t.device_id}
                          </div>
                          <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                            From: <span className="font-semibold text-neutral-700 dark:text-neutral-300">{t.current_owner_email}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-white/5">
                      <Button
                        type="button"
                        variant="primary"
                        disabled={actionLoading === t.id}
                        onClick={() => handleAccept(t.id)}
                        className="text-xs font-semibold px-3.5 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Accept Transfer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing Transfers */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <span>Outgoing Requests</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-bold">
                {transfers.outgoing.length}
              </span>
            </h4>

            {transfers.outgoing.length === 0 ? (
              <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-[#131E2A]/50 border border-neutral-200/60 dark:border-white/5 text-center text-xs text-neutral-400">
                No active outgoing transfer requests.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {transfers.outgoing.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl bg-white dark:bg-[#0D151D] border border-neutral-200 dark:border-white/10 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 flex items-center justify-center shrink-0">
                          <Laptop className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
                            {t.device_name || t.device_id}
                          </div>
                          <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                            Sent to: <span className="font-semibold text-neutral-700 dark:text-neutral-300">{t.target_owner_email}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        Pending
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-white/5">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={actionLoading === t.id}
                        onClick={() => handleCancel(t.id)}
                        className="text-xs font-semibold px-3 h-8 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Cancel Transfer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
