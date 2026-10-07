import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  Laptop,
  CheckCircle2,
  Calendar,
  Clock,
  HelpCircle,
  ArrowLeft,
  Mail,
  ExternalLink,
  Lock,
} from "lucide-react";
import { MainLayout } from "@/layouts/MainLayout";
import { Button } from "@/components/common/Button";
import { deviceService, PublicDeviceVerification } from "@/services/deviceService";

export const DeviceVerificationPage: React.FC = () => {
  const params = useParams({ strict: false }) as { token?: string };
  const token = params.token || "";
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PublicDeviceVerification | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setData({ verified: false, status: "INVALID", message: "No security token provided." });
      return;
    }

    deviceService
      .verifyPublicDevice(token)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error("Public verification scan error", err);
        setData({
          verified: false,
          status: "INVALID",
          message: "This QR code is not registered in the paYent system.",
        });
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <MainLayout>
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl space-y-6">
          {/* Back link */}
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Return to paYent
            </Link>
          </div>

          {loading ? (
            <div className="card-premium p-10 bg-white dark:bg-[#0D151D] border border-neutral-200 dark:border-white/10 rounded-3xl text-center space-y-4 shadow-xl">
              <div className="h-14 w-14 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center mx-auto animate-pulse">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white font-display">
                  Verifying Device Identity...
                </h2>
                <p className="text-xs text-neutral-400">
                  Checking cryptographic registry for token authenticity.
                </p>
              </div>
            </div>
          ) : data?.verified && data.deviceStatus === "ACTIVE" ? (
            /* 1. ACTIVE & VERIFIED DEVICE RESULT */
            <div className="card-premium p-7 sm:p-9 bg-white dark:bg-[#0D151D] border border-emerald-500/30 dark:border-emerald-500/20 rounded-3xl shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
              {/* Status Header */}
              <div className="flex items-center gap-3.5 pb-4 border-b border-neutral-100 dark:border-white/5">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    ✓ Verified Device
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white font-display tracking-tight">
                    This device is registered with paYent.
                  </h1>
                </div>
              </div>

              {/* Hardware Spec Card */}
              <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-[#131E2A] border border-neutral-200/80 dark:border-white/5 space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200/60 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <Laptop className="h-4 w-4 text-sky-500" />
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">
                      {data.deviceName}
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Status: ACTIVE
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 block font-sans">
                      Device ID
                    </span>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200 block mt-0.5">
                      {data.deviceId}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 block font-sans">
                      Security ID
                    </span>
                    <span className="font-extrabold text-sky-600 dark:text-sky-400 block mt-0.5">
                      {data.securityId}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 block font-sans">
                      Device Type
                    </span>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200 block mt-0.5">
                      {data.deviceType || "LAPTOP"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 block font-sans">
                      Registration Date
                    </span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300 block mt-0.5">
                      {data.registeredAt ? new Date(data.registeredAt).toLocaleDateString() : "Verified"}
                    </span>
                  </div>
                </div>

                {data.notes && (
                  <div className="pt-2 text-[11px] text-neutral-500 dark:text-neutral-400 italic">
                    Screw Anchor Note: {data.notes}
                  </div>
                )}
              </div>

              {/* Cryptographic Trust Guarantee */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-50 dark:bg-black/30 border border-neutral-200/60 dark:border-white/5 text-xs text-neutral-500 dark:text-neutral-400">
                <Lock className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Hardware identity cryptographically authenticated against the paYent Registry. Private owner information is strictly protected.
                </span>
              </div>
            </div>
          ) : data?.deviceStatus === "REPORTED_LOST" ? (
            /* 2. REPORTED LOST RESULT */
            <div className="card-premium p-7 sm:p-9 bg-white dark:bg-[#0D151D] border border-amber-500/40 dark:border-amber-500/30 rounded-3xl shadow-2xl space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center gap-3.5 pb-4 border-b border-neutral-100 dark:border-white/5">
                <div className="h-12 w-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    ⚠ Security Alert
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white font-display tracking-tight">
                    This device has been reported lost.
                  </h1>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-2 text-xs text-amber-900 dark:text-amber-300">
                <p className="font-semibold leading-relaxed">
                  “Do not purchase or transfer this device without proper verification.”
                </p>
                <p className="text-neutral-600 dark:text-neutral-400">
                  If you found this device or have information regarding its location, please contact paYent immediately.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#131E2A] border border-neutral-200/80 dark:border-white/5 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-neutral-400 font-sans">Device ID:</span>
                  <span className="font-bold text-neutral-800 dark:text-neutral-200">{data.deviceId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400 font-sans">Security ID:</span>
                  <span className="font-extrabold text-amber-600 dark:text-amber-400">{data.securityId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400 font-sans">Status:</span>
                  <span className="font-bold text-amber-600">REPORTED LOST</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => navigate({ to: "/contact" })}
                  className="text-xs font-bold px-5 h-10 rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Contact paYent
                </Button>
              </div>
            </div>
          ) : data?.deviceStatus === "REPORTED_STOLEN" ? (
            /* 3. REPORTED STOLEN RESULT */
            <div className="card-premium p-7 sm:p-9 bg-white dark:bg-[#0D151D] border border-rose-500/40 dark:border-rose-500/30 rounded-3xl shadow-2xl space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center gap-3.5 pb-4 border-b border-neutral-100 dark:border-white/5">
                <div className="h-12 w-12 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    ⚠ Critical Security Alert
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white font-display tracking-tight text-rose-600 dark:text-rose-400">
                    This device has been reported stolen.
                  </h1>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-2 text-xs text-rose-900 dark:text-rose-300">
                <p className="font-semibold leading-relaxed">
                  Unauthorized purchase, transfer, or resale of this equipment is strictly prohibited and violates security policies.
                </p>
                <p className="text-neutral-600 dark:text-neutral-400">
                  This hardware is permanently flagged in the paYent registry. Please report any sighting to our security desk immediately.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#131E2A] border border-neutral-200/80 dark:border-white/5 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-neutral-400 font-sans">Device ID:</span>
                  <span className="font-bold text-neutral-800 dark:text-neutral-200">{data.deviceId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400 font-sans">Security ID:</span>
                  <span className="font-extrabold text-rose-600 dark:text-rose-400">{data.securityId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400 font-sans">Status:</span>
                  <span className="font-bold text-rose-600">REPORTED STOLEN</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => navigate({ to: "/contact" })}
                  className="text-xs font-bold px-5 h-10 rounded-xl flex items-center gap-1.5"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Contact paYent Security
                </Button>
              </div>
            </div>
          ) : (
            /* 4. INVALID / FAKE QR RESULT */
            <div className="card-premium p-7 sm:p-9 bg-white dark:bg-[#0D151D] border border-neutral-200 dark:border-white/10 rounded-3xl shadow-xl space-y-5 text-center">
              <div className="h-14 w-14 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center mx-auto">
                <ShieldX className="h-7 w-7" />
              </div>
              <div className="space-y-1.5">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-rose-500">
                  ✕ Device Not Verified
                </div>
                <h1 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white font-display">
                  This QR code is not registered in the paYent system.
                </h1>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
                  The scanned verification token could not be found or has been deactivated. Do not trust unverified security stickers.
                </p>
              </div>

              <div className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate({ to: "/" })}
                  className="text-xs font-semibold px-4 h-9 rounded-xl"
                >
                  Go to Home
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default DeviceVerificationPage;
