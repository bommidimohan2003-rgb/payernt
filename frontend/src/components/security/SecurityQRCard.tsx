import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import {
  QrCode,
  ShieldCheck,
  Lock,
  Download,
  Printer,
  RefreshCw,
  EyeOff,
  Laptop,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/common/Button";
import { PasswordModal } from "./PasswordModal";
import { SecurityStickerModal } from "./SecurityStickerModal";
import { RegisteredDevice, deviceService } from "@/services/deviceService";

interface SecurityQRCardProps {
  devices: RegisteredDevice[];
  onRefreshDevices: () => Promise<void>;
  onOpenRegisterModal?: () => void;
}

export const SecurityQRCard: React.FC<SecurityQRCardProps> = ({
  devices,
  onRefreshDevices,
  onOpenRegisterModal,
}) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordAction, setPasswordAction] = useState<"reveal" | "regenerate">("reveal");
  const [isStickerModalOpen, setIsStickerModalOpen] = useState(false);

  // Revealed QR State (Temporary in component memory, never persisted to localStorage)
  const [revealedData, setRevealedData] = useState<{
    deviceId: string;
    qrToken: string;
    qrUrl: string;
    securityId: string;
  } | null>(null);

  const [qrCanvasUrl, setQrCanvasUrl] = useState<string>("");

  // Select first device by default if available
  useEffect(() => {
    if (devices.length > 0 && (!selectedDeviceId || !devices.some((d) => d.deviceId === selectedDeviceId))) {
      setSelectedDeviceId(devices[0].deviceId);
    }
  }, [devices, selectedDeviceId]);

  // Active selected device
  const currentDevice = devices.find((d) => d.deviceId === selectedDeviceId) || devices[0];

  // Render QR Code to Data URL when revealedData is active
  useEffect(() => {
    if (revealedData && revealedData.deviceId === currentDevice?.deviceId) {
      const fullUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}${revealedData.qrUrl}`
          : revealedData.qrUrl;

      QRCode.toDataURL(fullUrl, {
        width: 380,
        margin: 1.5,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "H",
      })
        .then((url) => setQrCanvasUrl(url))
        .catch((err) => console.error("Failed to render QR Code", err));
    } else {
      setQrCanvasUrl("");
    }
  }, [revealedData, currentDevice]);

  // Handle password submission for QR reveal or regeneration
  const handlePasswordSubmit = async (password: string) => {
    if (!currentDevice) return;

    if (passwordAction === "reveal") {
      const res = await deviceService.verifyPasswordAndRevealQR(currentDevice.deviceId, password);
      setRevealedData({
        deviceId: currentDevice.deviceId,
        qrToken: res.qrToken,
        qrUrl: res.qrUrl,
        securityId: res.securityId,
      });
    } else if (passwordAction === "regenerate") {
      const res = await deviceService.regenerateQR(currentDevice.deviceId, password);
      setRevealedData({
        deviceId: currentDevice.deviceId,
        qrToken: res.qrToken,
        qrUrl: res.qrUrl,
        securityId: res.securityId,
      });
      await onRefreshDevices();
    }
  };

  const handleDownloadQR = () => {
    if (!qrCanvasUrl || !currentDevice) return;
    const link = document.createElement("a");
    link.href = qrCanvasUrl;
    link.download = `payent-security-qr-${currentDevice.securityId}.png`;
    link.click();
  };

  const handleLockQR = () => {
    setRevealedData(null);
    setQrCanvasUrl("");
  };

  if (!currentDevice) {
    return (
      <div className="card-premium p-8 sm:p-10 bg-white dark:bg-[#0D151D] border border-neutral-200 dark:border-white/10 rounded-3xl shadow-sm text-center space-y-4">
        <div className="h-16 w-16 mx-auto rounded-3xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
          <Laptop className="h-8 w-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white font-display">
            No registered device found.
          </h3>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-md mx-auto">
            You don't have any laptops registered under your paYent account. Register your laptop to generate a unique Security QR and physical screw anchor sticker.
          </p>
        </div>
        {onOpenRegisterModal && (
          <Button
            type="button"
            variant="primary"
            onClick={onOpenRegisterModal}
            className="text-xs font-bold px-6 h-11 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
          >
            Register My Laptop
          </Button>
        )}
      </div>
    );
  }

  const isRevealed = revealedData !== null && revealedData.deviceId === currentDevice.deviceId;

  // Status Badge color helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        );
      case "REPORTED_LOST":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            Reported Lost
          </span>
        );
      case "REPORTED_STOLEN":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
            Reported Stolen
          </span>
        );
      case "TRANSFER_PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/50">
            <RefreshCw className="h-3.5 w-3.5 text-sky-500" />
            Transfer Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-white/10">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="card-premium p-6 sm:p-8 bg-white dark:bg-[#0D151D] border border-neutral-200 dark:border-white/10 rounded-3xl shadow-sm space-y-6">
      {/* Header & Device Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-200 dark:border-white/10">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white font-display tracking-tight flex items-center gap-2.5">
            <QrCode className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            My Security QR
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Your unique QR identity for your registered device.
          </p>
        </div>

        {/* Device selector if multiple laptops owned */}
        {devices.length > 1 && (
          <div className="relative">
            <label htmlFor="device-selector" className="sr-only">
              Select Laptop
            </label>
            <div className="relative inline-block w-full sm:w-auto">
              <select
                id="device-selector"
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  setRevealedData(null);
                }}
                className="w-full sm:w-64 appearance-none h-10 pl-3.5 pr-9 text-xs font-semibold bg-neutral-50 dark:bg-[#131E2A] border border-neutral-200 dark:border-white/10 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 cursor-pointer"
              >
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.deviceName} ({d.deviceId})
                  </option>
                ))}
              </select>
              <ChevronDown className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* Device Summary Badges Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-neutral-50 dark:bg-[#131E2A]/70 border border-neutral-200/80 dark:border-white/5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block">
            Device
          </span>
          <span className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate block mt-0.5">
            {currentDevice.deviceName}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block">
            Device ID
          </span>
          <span className="text-xs sm:text-sm font-mono font-bold text-neutral-900 dark:text-white block mt-0.5">
            {currentDevice.deviceId}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block">
            Security ID
          </span>
          <span className="text-xs sm:text-sm font-mono font-extrabold text-sky-600 dark:text-sky-400 block mt-0.5">
            {currentDevice.securityId}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block">
            Device Status
          </span>
          <div className="mt-0.5">{getStatusBadge(currentDevice.deviceStatus)}</div>
        </div>
      </div>

      {/* UNREVEALED STATE */}
      {!isRevealed ? (
        <div className="p-8 sm:p-10 rounded-3xl bg-neutral-50 dark:bg-black/30 border border-neutral-200 dark:border-white/10 text-center space-y-6 flex flex-col items-center justify-center">
          <div className="relative">
            <div className="h-24 w-24 rounded-3xl bg-neutral-100 dark:bg-[#131E2A] border border-neutral-300 dark:border-white/10 flex items-center justify-center text-neutral-400 shadow-inner">
              <QrCode className="h-12 w-12 opacity-40 blur-[1px]" />
            </div>
            <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-[#0D151D]">
              <Lock className="h-4 w-4" />
            </div>
          </div>

          <div className="max-w-md space-y-2">
            <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white font-display">
              Your Security QR is locked
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed font-medium">
              “Your Security QR is linked to your paYent account and registered device.”
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              “For your security, enter your account password to reveal the QR code.”
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setPasswordAction("reveal");
              setIsPasswordModalOpen(true);
            }}
            className="text-xs sm:text-sm font-bold px-8 h-12 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 shadow-lg shadow-black/10 dark:shadow-white/5 flex items-center gap-2"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Reveal My QR
          </Button>
        </div>
      ) : (
        /* REVEALED STATE */
        <div className="p-6 sm:p-8 rounded-3xl bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-white/10 space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
            {/* High-Contrast Crisp QR Code Card */}
            <div className="p-5 bg-white text-black border-2 border-black rounded-3xl shadow-2xl flex flex-col items-center justify-center space-y-3 w-fit shrink-0">
              <div className="p-2 bg-white rounded-2xl border border-neutral-200 shadow-inner">
                {qrCanvasUrl ? (
                  <img
                    src={qrCanvasUrl}
                    alt={`paYent Security QR ${revealedData.securityId}`}
                    className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-xs text-neutral-400">
                    Rendering QR...
                  </div>
                )}
              </div>

              <div className="text-center w-full px-2">
                <div className="text-[10px] uppercase font-bold tracking-widest text-neutral-500">
                  Security ID
                </div>
                <div className="text-sm font-mono font-extrabold tracking-wider text-black">
                  {revealedData.securityId}
                </div>
              </div>
            </div>

            {/* Revealed Details & Interactive Action Buttons */}
            <div className="space-y-5 text-left w-full max-w-md">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-2">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Password Verified &bull; Active Identity
                </div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white font-display">
                  {currentDevice.deviceName}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Device ID: <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">{currentDevice.deviceId}</span> &bull; Model: {currentDevice.model || "Standard Chassis"}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#131E2A] border border-neutral-200 dark:border-white/5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
                  <span className="text-neutral-400">Brand:</span>
                  <span className="font-semibold">{currentDevice.brand}</span>
                </div>
                <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
                  <span className="text-neutral-400">Device Type:</span>
                  <span className="font-semibold">{currentDevice.deviceType}</span>
                </div>
                <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
                  <span className="text-neutral-400">Registered:</span>
                  <span className="font-semibold">{new Date(currentDevice.registeredAt).toLocaleDateString()}</span>
                </div>
                {currentDevice.lastVerifiedAt && (
                  <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
                    <span className="text-neutral-400">Last Scanned:</span>
                    <span className="font-semibold">{new Date(currentDevice.lastVerifiedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadQR}
                  className="text-xs font-semibold h-11 rounded-xl flex items-center justify-center gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  Download QR
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setIsStickerModalOpen(true)}
                  className="text-xs font-semibold h-11 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Printer className="h-4 w-4" />
                  Print Security Sticker
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPasswordAction("regenerate");
                    setIsPasswordModalOpen(true);
                  }}
                  className="text-xs font-semibold h-10 rounded-xl text-neutral-600 dark:text-neutral-400 flex items-center justify-center gap-1.5 hover:text-amber-600 dark:hover:text-amber-400"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Regenerate QR
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLockQR}
                  className="text-xs font-semibold h-10 rounded-xl text-neutral-600 dark:text-neutral-400 flex items-center justify-center gap-1.5"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  Lock / Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal for Reveal / Regenerate */}
      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSubmit={handlePasswordSubmit}
        title={passwordAction === "reveal" ? "Enter Your Password" : "Confirm QR Regeneration"}
        description={
          passwordAction === "reveal"
            ? "For your security, please enter your account password to view your Security QR."
            : "Regenerating will permanently invalidate your current QR code and assign a new secure token. Enter your account password to confirm."
        }
        actionButtonText={passwordAction === "reveal" ? "Continue" : "Regenerate QR"}
        isDestructive={passwordAction === "regenerate"}
      />

      {/* Printable Security Sticker Modal */}
      {revealedData && (
        <SecurityStickerModal
          isOpen={isStickerModalOpen}
          onClose={() => setIsStickerModalOpen(false)}
          device={currentDevice}
          qrUrl={revealedData.qrUrl}
        />
      )}
    </div>
  );
};
