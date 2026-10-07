import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import {
  Printer,
  Download,
  X,
  ShieldCheck,
  Cpu,
  Info,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/common/Button";
import { RegisteredDevice } from "@/services/deviceService";

interface SecurityStickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: RegisteredDevice;
  qrUrl: string;
}

export const SecurityStickerModal: React.FC<SecurityStickerModalProps> = ({
  isOpen,
  onClose,
  device,
  qrUrl,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [selectedScrewPosition, setSelectedScrewPosition] = useState<"center" | "left" | "right">("center");
  const [activeView, setActiveView] = useState<"sticker" | "chassis_guide">("sticker");
  const printableRef = useRef<HTMLDivElement>(null);

  // Generate full verification URL
  const fullVerificationUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${qrUrl.startsWith("/") ? qrUrl : `/${qrUrl}`}`
      : qrUrl;

  useEffect(() => {
    if (isOpen && fullVerificationUrl) {
      QRCode.toDataURL(fullVerificationUrl, {
        width: 320,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "H",
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("QR Generation error", err));
    }
  }, [isOpen, fullVerificationUrl]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadSticker = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `payent-security-sticker-${device.securityId}.png`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="w-full max-w-3xl bg-white dark:bg-[#0D151D] border border-neutral-200 dark:border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6 my-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sticker-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-sky-500/10 dark:bg-sky-400/15 border border-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 id="sticker-modal-title" className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white font-display">
                Printable Security Sticker & Screw Placement
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {device.deviceName} &bull; Security ID: <span className="font-mono text-sky-600 dark:text-sky-400 font-bold">{device.securityId}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="h-8 w-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center p-1 rounded-2xl bg-neutral-100 dark:bg-[#131E2A] border border-neutral-200 dark:border-white/5 w-fit">
          <button
            type="button"
            onClick={() => setActiveView("sticker")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeView === "sticker"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            Physical Sticker Preview
          </button>
          <button
            type="button"
            onClick={() => setActiveView("chassis_guide")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeView === "chassis_guide"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <Cpu className="h-3.5 w-3.5 text-sky-500" />
            Laptop Screw Placement Guide
          </button>
        </div>

        {/* Tab 1: Physical Sticker Preview */}
        {activeView === "sticker" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 p-6 rounded-3xl bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-white/10">
              {/* Sticker Printable Card */}
              <div
                ref={printableRef}
                id="security-sticker-print-area"
                className="w-72 bg-white text-black border-2 border-black rounded-2xl p-4 shadow-xl flex flex-col items-center justify-between text-center select-none"
                style={{
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
              >
                {/* Header branding */}
                <div className="w-full flex items-center justify-between border-b-2 border-black pb-1.5 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold tracking-tighter text-sm text-black">paYent</span>
                    <span className="text-[9px] font-bold uppercase bg-black text-white px-1.5 py-0.5 rounded tracking-wider">
                      SECURE DEVICE
                    </span>
                  </div>
                  <span className="text-[8px] font-mono font-bold text-neutral-600">ID: {device.deviceId}</span>
                </div>

                {/* QR Code with screw anchor hole indicators */}
                <div className="relative p-2 bg-white rounded-xl border border-neutral-300 shadow-inner my-1">
                  {/* Visual screw cutout circle indicators */}
                  <div
                    title="Screw anchor aperture"
                    className="absolute -top-1.5 -left-1.5 h-4 w-4 rounded-full border border-black bg-neutral-100 flex items-center justify-center"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-black/40" />
                  </div>
                  <div
                    title="Screw anchor aperture"
                    className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full border border-black bg-neutral-100 flex items-center justify-center"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-black/40" />
                  </div>
                  <div
                    title="Screw anchor aperture"
                    className="absolute -bottom-1.5 -left-1.5 h-4 w-4 rounded-full border border-black bg-neutral-100 flex items-center justify-center"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-black/40" />
                  </div>
                  <div
                    title="Screw anchor aperture"
                    className="absolute -bottom-1.5 -right-1.5 h-4 w-4 rounded-full border border-black bg-neutral-100 flex items-center justify-center"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-black/40" />
                  </div>

                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`Security QR for ${device.securityId}`}
                      className="w-44 h-44 object-contain"
                    />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center bg-neutral-100 text-neutral-400 text-xs">
                      Generating QR...
                    </div>
                  )}
                </div>

                {/* Security ID Badge */}
                <div className="w-full mt-2 py-1 px-2 bg-neutral-100 border border-neutral-400 rounded-lg">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-neutral-600">
                    Security Identifier
                  </div>
                  <div className="text-xs font-mono font-extrabold tracking-wider text-black">
                    {device.securityId}
                  </div>
                </div>

                {/* Verification CTA and Tamper Warning */}
                <div className="w-full mt-2.5 pt-2 border-t border-dashed border-neutral-400 space-y-1">
                  <div className="text-[9px] font-black tracking-wider uppercase text-black">
                    SCAN TO VERIFY &bull; PROTECTED DEVICE
                  </div>
                  <div className="text-[7.5px] font-bold uppercase text-red-600 tracking-wider">
                    TAMPER EVIDENT &mdash; DO NOT REMOVE
                  </div>
                  <div className="text-[7px] text-neutral-600 font-medium">
                    Tamper-evident adhesive &bull; Anchored around chassis screws
                  </div>
                </div>
              </div>

              {/* Physical specifications and instructions */}
              <div className="space-y-4 max-w-sm text-left">
                <div>
                  <h4 className="font-bold text-sm text-neutral-900 dark:text-white">
                    Tamper-Evident Security Seal
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Engineered with high-durability destructible vinyl. Designed for physical placement directly over designated chassis screws.
                  </p>
                </div>

                <div className="space-y-2 text-xs text-neutral-600 dark:text-neutral-300">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Dimensions:</strong> 50mm &times; 65mm standard label sizing.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Substrate:</strong> Matte synthetic destructible film with ultra-bond resin.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Contrast:</strong> Pure black & white Level-H error correction scannable in any lighting.</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/40 text-xs text-sky-800 dark:text-sky-300 flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 mt-0.5 text-sky-600 dark:text-sky-400" />
                  <span>
                    When printed, apply the sticker across the laptop's service screw area as shown in the placement guide.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Laptop Screw Placement Guide (Requirement 11 & Step 6) */}
        {activeView === "chassis_guide" && (
          <div className="space-y-5">
            <div className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-3xl bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-white/10">
              {/* Interactive Laptop Bottom Panel Illustration */}
              <div className="relative w-full max-w-sm aspect-[16/10] bg-neutral-200 dark:bg-[#131E2A] rounded-2xl border-2 border-neutral-300 dark:border-white/15 p-4 flex flex-col justify-between shadow-inner">
                {/* Rubber feet indicators */}
                <div className="flex justify-between">
                  <div className="w-8 h-2 rounded-full bg-neutral-400 dark:bg-neutral-600" />
                  <div className="w-8 h-2 rounded-full bg-neutral-400 dark:bg-neutral-600" />
                </div>

                {/* Ventilation grilles (Must NOT be covered) */}
                <div className="w-3/4 mx-auto space-y-1 py-1">
                  <div className="w-full h-1 bg-neutral-300 dark:bg-neutral-700/80 rounded-full" />
                  <div className="w-full h-1 bg-neutral-300 dark:bg-neutral-700/80 rounded-full" />
                  <div className="w-full h-1 bg-neutral-300 dark:bg-neutral-700/80 rounded-full" />
                  <div className="text-[9px] text-center font-bold tracking-wider text-neutral-400 uppercase">
                    Ventilation Grille (Do Not Cover)
                  </div>
                </div>

                {/* Screw Positions */}
                {/* Screw 1: Top Left */}
                <div className="absolute top-3 left-4 flex flex-col items-center">
                  <div className="h-3.5 w-3.5 rounded-full border border-neutral-400 dark:border-neutral-500 bg-neutral-300 dark:bg-neutral-700 flex items-center justify-center">
                    <div className="w-2 h-0.5 bg-neutral-500" />
                  </div>
                </div>

                {/* Screw 2: Top Right */}
                <div className="absolute top-3 right-4 flex flex-col items-center">
                  <div className="h-3.5 w-3.5 rounded-full border border-neutral-400 dark:border-neutral-500 bg-neutral-300 dark:bg-neutral-700 flex items-center justify-center">
                    <div className="w-2 h-0.5 bg-neutral-500" />
                  </div>
                </div>

                {/* Screw 3: Bottom Left Option */}
                <button
                  type="button"
                  onClick={() => setSelectedScrewPosition("left")}
                  className={`absolute bottom-6 left-8 p-1 rounded-xl transition-all cursor-pointer ${
                    selectedScrewPosition === "left"
                      ? "ring-2 ring-sky-500 bg-sky-500/20"
                      : "hover:bg-neutral-300 dark:hover:bg-neutral-800"
                  }`}
                >
                  <div className="h-4 w-4 rounded-full border-2 border-sky-500 bg-sky-400/30 flex items-center justify-center shadow">
                    <div className="w-2.5 h-0.5 bg-sky-600 dark:bg-sky-300" />
                  </div>
                  {selectedScrewPosition === "left" && (
                    <div className="absolute -top-12 -left-4 w-24 bg-sky-600 text-white text-[8px] font-bold py-1 px-1.5 rounded-lg shadow-lg text-center animate-in fade-in">
                      Sticker Anchor 1
                    </div>
                  )}
                </button>

                {/* Screw 4: Center Chassis Screw Option (Recommended) */}
                <button
                  type="button"
                  onClick={() => setSelectedScrewPosition("center")}
                  className={`absolute bottom-5 left-1/2 -translate-x-1/2 p-1 rounded-xl transition-all cursor-pointer ${
                    selectedScrewPosition === "center"
                      ? "ring-2 ring-emerald-500 bg-emerald-500/20"
                      : "hover:bg-neutral-300 dark:hover:bg-neutral-800"
                  }`}
                >
                  <div className="h-5 w-5 rounded-full border-2 border-emerald-500 bg-emerald-400/30 flex items-center justify-center shadow-lg animate-pulse">
                    <div className="w-3 h-0.5 bg-emerald-600 dark:bg-emerald-300" />
                  </div>
                  {selectedScrewPosition === "center" && (
                    <div className="absolute -top-14 -left-12 w-32 bg-emerald-600 text-white text-[9px] font-bold py-1 px-1.5 rounded-lg shadow-xl text-center animate-in fade-in">
                      ★ Recommended Anchor
                    </div>
                  )}
                </button>

                {/* Screw 5: Bottom Right Option */}
                <button
                  type="button"
                  onClick={() => setSelectedScrewPosition("right")}
                  className={`absolute bottom-6 right-8 p-1 rounded-xl transition-all cursor-pointer ${
                    selectedScrewPosition === "right"
                      ? "ring-2 ring-sky-500 bg-sky-500/20"
                      : "hover:bg-neutral-300 dark:hover:bg-neutral-800"
                  }`}
                >
                  <div className="h-4 w-4 rounded-full border-2 border-sky-500 bg-sky-400/30 flex items-center justify-center shadow">
                    <div className="w-2.5 h-0.5 bg-sky-600 dark:bg-sky-300" />
                  </div>
                  {selectedScrewPosition === "right" && (
                    <div className="absolute -top-12 -right-4 w-24 bg-sky-600 text-white text-[8px] font-bold py-1 px-1.5 rounded-lg shadow-lg text-center animate-in fade-in">
                      Sticker Anchor 2
                    </div>
                  )}
                </button>

                {/* Sticker Representation on the Selected Screw */}
                <div
                  className={`absolute border-2 border-sky-500 bg-white/90 dark:bg-black/90 p-1.5 rounded-md shadow-md transition-all duration-300 flex items-center gap-1.5 ${
                    selectedScrewPosition === "center"
                      ? "bottom-12 left-1/2 -translate-x-1/2 w-32"
                      : selectedScrewPosition === "left"
                      ? "bottom-12 left-4 w-28"
                      : "bottom-12 right-4 w-28"
                  }`}
                >
                  <div className="w-5 h-5 bg-black rounded shrink-0 flex items-center justify-center text-[6px] text-white font-mono">
                    QR
                  </div>
                  <div className="text-[7.5px] font-bold text-neutral-800 dark:text-neutral-200 truncate">
                    {device.securityId}
                  </div>
                </div>

                {/* Bottom rubber feet */}
                <div className="flex justify-between">
                  <div className="w-8 h-2 rounded-full bg-neutral-400 dark:bg-neutral-600" />
                  <div className="w-8 h-2 rounded-full bg-neutral-400 dark:bg-neutral-600" />
                </div>
              </div>

              {/* Explanatory rules for physical screw anchoring */}
              <div className="space-y-4 max-w-sm text-left">
                <div>
                  <h4 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    How to Position the Sticker Around Screws
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                    “Apply the Security QR sticker around the designated laptop screws.”
                  </p>
                </div>

                <div className="space-y-2.5 text-xs text-neutral-600 dark:text-neutral-300">
                  <div className="flex items-start gap-2">
                    <div className="h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                      1
                    </div>
                    <span>
                      <strong>Clean the chassis:</strong> Use an isopropyl alcohol wipe around the bottom service screws and let dry completely.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                      2
                    </div>
                    <span>
                      <strong>Align with screw head:</strong> Position the sticker aperture over the central bottom-panel chassis screw head.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                      3
                    </div>
                    <span>
                      <strong>Firmly press down:</strong> Smooth edges from center outward. The tamper-evident adhesive cures within 15 minutes.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <span>
                    <strong>Safety note:</strong> Never cover exhaust fans, intake grilles, regulatory barcode labels, or moving hinge joints.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-200 dark:border-white/10">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
            {device.deviceName} &bull; {device.deviceType}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadSticker}
              className="text-xs font-semibold px-4 h-10 rounded-xl flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Download Sticker PNG
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handlePrint}
              className="text-xs font-semibold px-5 h-10 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 flex items-center gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Security Sticker
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
