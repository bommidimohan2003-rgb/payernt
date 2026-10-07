import React, { useState } from "react";
import { Laptop, X, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { deviceService, RegisteredDevice } from "@/services/deviceService";

interface RegisterDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newDevice: RegisteredDevice) => void;
}

export const RegisterDeviceModal: React.FC<RegisterDeviceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [deviceName, setDeviceName] = useState("");
  const [brand, setBrand] = useState("Apple");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [deviceType, setDeviceType] = useState("LAPTOP");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim()) {
      setError("Please enter a device name.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await deviceService.registerDevice({
        deviceName: deviceName.trim(),
        brand,
        model: model.trim(),
        serialNumber: serialNumber.trim(),
        deviceType,
        notes: notes.trim(),
      });
      onSuccess(res.device);
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr?.response?.data?.detail || "Failed to register device. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#0D151D] border border-neutral-200 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 my-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-device-title"
      >
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-sky-500/10 dark:bg-sky-400/15 border border-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Laptop className="h-5 w-5" />
            </div>
            <div>
              <h3 id="register-device-title" className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white font-display">
                Register Device Identity
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Create a unique Security ID and QR verification key.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="h-8 w-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1">
              Laptop / Device Name *
            </label>
            <input
              type="text"
              required
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder='e.g. MacBook Pro 16" M3 Max'
              className="w-full h-10 px-3.5 text-xs bg-neutral-50 dark:bg-[#131E2A] border border-neutral-300 dark:border-white/10 rounded-xl text-neutral-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1">
                Brand
              </label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-neutral-50 dark:bg-[#131E2A] border border-neutral-300 dark:border-white/10 rounded-xl text-neutral-900 dark:text-white"
              >
                <option value="Apple">Apple</option>
                <option value="Dell">Dell</option>
                <option value="Lenovo">Lenovo</option>
                <option value="ASUS">ASUS</option>
                <option value="HP">HP</option>
                <option value="Razer">Razer</option>
                <option value="MSI">MSI</option>
                <option value="Acer">Acer</option>
                <option value="Microsoft">Microsoft</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1">
                Model Identifier
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. XPS 9530 / A2991"
                className="w-full h-10 px-3 text-xs bg-neutral-50 dark:bg-[#131E2A] border border-neutral-300 dark:border-white/10 rounded-xl text-neutral-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1">
                Hardware Serial Number
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g. C02G1234MD6R"
                className="w-full h-10 px-3 text-xs bg-neutral-50 dark:bg-[#131E2A] border border-neutral-300 dark:border-white/10 rounded-xl text-neutral-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1">
                Device Category
              </label>
              <select
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-neutral-50 dark:bg-[#131E2A] border border-neutral-300 dark:border-white/10 rounded-xl text-neutral-900 dark:text-white"
              >
                <option value="LAPTOP">Laptop</option>
                <option value="MACBOOK">MacBook</option>
                <option value="ULTRABOOK">Ultrabook</option>
                <option value="GAMING_LAPTOP">Gaming Laptop</option>
                <option value="WORKSTATION">Workstation</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1">
              Chassis Screw Placement Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Positioned over central bottom-panel chassis screw head."
              className="w-full p-2.5 text-xs bg-neutral-50 dark:bg-[#131E2A] border border-neutral-300 dark:border-white/10 rounded-xl text-neutral-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 text-[11px] text-neutral-500 dark:text-neutral-400 border border-neutral-200/60 dark:border-white/5">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Generates a unique cryptographic Security ID and tamper sticker.</span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={onClose}
              className="text-xs font-semibold px-4 h-10 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !deviceName.trim()}
              variant="primary"
              className="text-xs font-semibold px-5 h-10 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Registering...
                </>
              ) : (
                "Register Device"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
