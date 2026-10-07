import React, { useState, useEffect } from "react";
import {
  History,
  ShieldCheck,
  QrCode,
  AlertTriangle,
  RotateCcw,
  ArrowRightLeft,
  Key,
  Eye,
  CheckCircle2,
  Clock,
  Laptop,
} from "lucide-react";
import { deviceService, SecurityHistoryItem } from "@/services/deviceService";

export const SecurityHistoryTab: React.FC = () => {
  const [history, setHistory] = useState<SecurityHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    deviceService
      .getAllHistory()
      .then((res) => setHistory(res.history || []))
      .catch((err) => console.error("Failed to fetch history", err))
      .finally(() => setLoading(false));
  }, []);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "DEVICE_REGISTERED":
        return <Laptop className="h-4 w-4 text-sky-500" />;
      case "QR_GENERATED":
        return <QrCode className="h-4 w-4 text-indigo-500" />;
      case "QR_REVEALED":
        return <Eye className="h-4 w-4 text-emerald-500" />;
      case "QR_REGENERATED":
        return <RotateCcw className="h-4 w-4 text-amber-500" />;
      case "DEVICE_REPORTED_LOST":
      case "DEVICE_REPORTED_STOLEN":
        return <AlertTriangle className="h-4 w-4 text-rose-500" />;
      case "DEVICE_RESTORED":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "OWNERSHIP_TRANSFER_REQUESTED":
      case "OWNERSHIP_TRANSFER_COMPLETED":
      case "OWNERSHIP_TRANSFER_CANCELLED":
        return <ArrowRightLeft className="h-4 w-4 text-purple-500" />;
      case "QR_VERIFIED":
        return <ShieldCheck className="h-4 w-4 text-sky-500" />;
      default:
        return <Clock className="h-4 w-4 text-neutral-400" />;
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white font-display flex items-center gap-2">
          <History className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          Device Security History & Audit Log
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          Immutable audit timeline of all security events, QR reveals, scans, and status changes.
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-neutral-400">Loading security audit history...</div>
      ) : history.length === 0 ? (
        <div className="card-premium p-8 rounded-3xl bg-neutral-50 dark:bg-[#0D151D] border border-neutral-200 dark:border-white/10 text-center space-y-2">
          <Clock className="h-8 w-8 text-neutral-400 mx-auto" />
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            No security events recorded yet.
          </p>
        </div>
      ) : (
        <div className="card-premium p-4 sm:p-6 bg-white dark:bg-[#0D151D] border border-neutral-200 dark:border-white/10 rounded-3xl shadow-sm">
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200 dark:before:bg-neutral-800">
            {history.map((item) => (
              <div key={item.id} className="relative group">
                {/* Timeline node */}
                <div className="absolute -left-6 top-1 h-5 w-5 rounded-full bg-white dark:bg-[#0D151D] border-2 border-neutral-300 dark:border-neutral-700 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-sky-500" />
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#131E2A] border border-neutral-200/70 dark:border-white/5 space-y-1.5 hover:border-neutral-300 dark:hover:border-white/15 transition-all">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-neutral-200/70 dark:bg-neutral-800">
                        {getEventIcon(item.event_type)}
                      </div>
                      <span className="text-xs font-bold font-mono text-neutral-800 dark:text-neutral-200">
                        {item.event_type.replace(/_/g, " ")}
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-400 font-mono">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-600 dark:text-neutral-300 pl-7">
                    {item.description}
                  </p>

                  <div className="flex items-center gap-4 text-[10px] text-neutral-400 font-mono pl-7 pt-1 border-t border-neutral-200/50 dark:border-white/5">
                    <span>Device: {item.device_id}</span>
                    <span>Actor: {item.actor_email}</span>
                    <span>IP: {item.ip_address}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
