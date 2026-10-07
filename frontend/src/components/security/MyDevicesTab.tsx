import React, { useState } from "react";
import {
  Laptop,
  ShieldCheck,
  AlertTriangle,
  QrCode,
  ArrowRightLeft,
  Plus,
  RotateCcw,
  Info,
  Calendar,
  Layers,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/common/Button";
import { PasswordModal } from "./PasswordModal";
import { RegisteredDevice, deviceService } from "@/services/deviceService";

interface MyDevicesTabProps {
  devices: RegisteredDevice[];
  onSelectDeviceForQR: (deviceId: string) => void;
  onRefreshDevices: () => Promise<void>;
  onOpenRegisterModal: () => void;
}

export const MyDevicesTab: React.FC<MyDevicesTabProps> = ({
  devices,
  onSelectDeviceForQR,
  onRefreshDevices,
  onOpenRegisterModal,
}) => {
  const [selectedDevice, setSelectedDevice] = useState<RegisteredDevice | null>(null);
  const [actionType, setActionType] = useState<"lost" | "stolen" | "restore" | "transfer" | null>(null);
  const [transferTargetEmail, setTransferTargetEmail] = useState("");
  const [actionNotes, setActionNotes] = useState("");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const handleActionClick = (dev: RegisteredDevice, type: "lost" | "stolen" | "restore" | "transfer") => {
    setSelectedDevice(dev);
    setActionType(type);
    if (type === "transfer") {
      setTransferTargetEmail("");
      setIsTransferModalOpen(true);
    } else {
      setActionNotes("");
      setIsPasswordModalOpen(true);
    }
  };

  const handlePasswordSubmit = async (password: string) => {
    if (!selectedDevice || !actionType) return;

    if (actionType === "lost") {
      await deviceService.reportLost(selectedDevice.deviceId, password, actionNotes);
    } else if (actionType === "stolen") {
      await deviceService.reportStolen(selectedDevice.deviceId, password, actionNotes);
    } else if (actionType === "restore") {
      await deviceService.restoreDevice(selectedDevice.deviceId, password);
    } else if (actionType === "transfer") {
      await deviceService.initiateTransfer(selectedDevice.deviceId, transferTargetEmail, password);
      setIsTransferModalOpen(false);
    }

    await onRefreshDevices();
    setActionType(null);
    setSelectedDevice(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white font-display">
            My Registered Devices
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Manage your authenticated hardware identities and security statuses.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={onOpenRegisterModal}
          className="text-xs font-semibold px-4 h-10 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 flex items-center gap-1.5 w-fit shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Register New Laptop
        </Button>
      </div>

      {devices.length === 0 ? (
        <div className="card-premium p-8 rounded-3xl bg-neutral-50 dark:bg-[#0D151D] border border-neutral-200 dark:border-white/10 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 mx-auto flex items-center justify-center text-neutral-400">
            <Laptop className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            No registered devices found.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={onOpenRegisterModal}
            className="text-xs font-semibold px-4 h-9 rounded-xl"
          >
            Register Your Laptop Now
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {devices.map((dev) => {
            const isLost = dev.deviceStatus === "REPORTED_LOST";
            const isStolen = dev.deviceStatus === "REPORTED_STOLEN";
            const isTransferPending = dev.deviceStatus === "TRANSFER_PENDING";

            return (
              <div
                key={dev.deviceId}
                className="card-premium p-5 sm:p-6 bg-white dark:bg-[#0D151D] border border-neutral-200 dark:border-white/10 rounded-3xl shadow-sm space-y-4 flex flex-col justify-between hover:border-neutral-300 dark:hover:border-white/20 transition-all"
              >
                <div className="space-y-3">
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-10 w-10 rounded-2xl bg-sky-500/10 dark:bg-sky-400/15 border border-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                        <Laptop className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-neutral-900 dark:text-white">
                          {dev.deviceName}
                        </h4>
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                          {dev.brand} &bull; {dev.model || "Laptop Chassis"}
                        </span>
                      </div>
                    </div>

                    {/* Status badge */}
                    {isLost ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        Reported Lost
                      </span>
                    ) : isStolen ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        Reported Stolen
                      </span>
                    ) : isTransferPending ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                        Transfer Pending
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        ● Active
                      </span>
                    )}
                  </div>

                  {/* Metadata fields */}
                  <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-2xl bg-neutral-50 dark:bg-[#131E2A] border border-neutral-200/60 dark:border-white/5 font-mono">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-400 block font-sans">
                        Device ID
                      </span>
                      <span className="font-bold text-neutral-800 dark:text-neutral-200 truncate block">
                        {dev.deviceId}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-400 block font-sans">
                        Security ID
                      </span>
                      <span className="font-extrabold text-sky-600 dark:text-sky-400 truncate block">
                        {dev.securityId}
                      </span>
                    </div>
                  </div>

                  {dev.notes && (
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 italic">
                      Screw anchor: {dev.notes}
                    </p>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-neutral-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onSelectDeviceForQR(dev.deviceId)}
                    className="text-xs font-semibold px-3.5 h-9 rounded-xl flex items-center gap-1.5 text-sky-600 dark:text-sky-400 border-sky-500/30 hover:bg-sky-50 dark:hover:bg-sky-950/30"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    View QR
                  </Button>

                  <div className="flex items-center gap-1.5">
                    {isLost || isStolen ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleActionClick(dev, "restore")}
                        className="text-xs font-semibold px-3 h-9 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Restore
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleActionClick(dev, "lost")}
                          className="text-xs font-semibold px-2.5 h-9 rounded-xl text-neutral-600 dark:text-neutral-400 hover:text-amber-600 dark:hover:text-amber-400"
                        >
                          Report Lost
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleActionClick(dev, "stolen")}
                          className="text-xs font-semibold px-2.5 h-9 rounded-xl text-neutral-600 dark:text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400"
                        >
                          Report Stolen
                        </Button>
                      </>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleActionClick(dev, "transfer")}
                      disabled={isTransferPending}
                      className="text-xs font-semibold px-2.5 h-9 rounded-xl text-neutral-600 dark:text-neutral-400 hover:text-sky-600 dark:hover:text-sky-400"
                      title="Transfer ownership to another user"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Password Modal */}
      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setActionType(null);
        }}
        onSubmit={handlePasswordSubmit}
        title={
          actionType === "lost"
            ? "Report Device Lost"
            : actionType === "stolen"
            ? "Report Device Stolen"
            : "Restore Device to Active"
        }
        description={`Enter your account password to confirm changing security status for ${selectedDevice?.deviceName}.`}
        actionButtonText={
          actionType === "lost"
            ? "Report Lost"
            : actionType === "stolen"
            ? "Report Stolen"
            : "Restore Device"
        }
        isDestructive={actionType === "lost" || actionType === "stolen"}
      />

      {/* Transfer Modal */}
      {isTransferModalOpen && selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#0D151D] border border-neutral-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-neutral-900 dark:text-white font-display">
                  Transfer Device Ownership
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {selectedDevice.deviceName} ({selectedDevice.securityId})
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Recipient paYent Email Address
                </label>
                <input
                  type="email"
                  value={transferTargetEmail}
                  onChange={(e) => setTransferTargetEmail(e.target.value)}
                  placeholder="newowner@example.com"
                  className="w-full h-10 px-3 text-xs bg-neutral-50 dark:bg-[#131E2A] border border-neutral-300 dark:border-white/10 rounded-xl text-neutral-900 dark:text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 text-[11px] text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-white/5 space-y-1">
                <p>
                  <strong>Note:</strong> The physical QR sticker remains attached. Once accepted by the new owner, scanning the QR will resolve to their ownership record.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsTransferModalOpen(false);
                  setActionType(null);
                }}
                className="text-xs font-semibold px-4 h-9 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={!transferTargetEmail.trim()}
                onClick={() => {
                  setIsTransferModalOpen(false);
                  setIsPasswordModalOpen(true);
                }}
                className="text-xs font-semibold px-4 h-9 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              >
                Proceed to Password Verification
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
