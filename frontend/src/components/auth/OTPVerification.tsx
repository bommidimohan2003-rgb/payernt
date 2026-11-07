import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { CodeSlots } from "@/components/reactbits/CodeSlots";
import { STORAGE_KEYS, storage } from "@/utils/storage";
import { api } from "@/utils/api";
import { Info, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface PendingUser {
  email: string;
  phone: string;
  password?: string;
  fullName?: string;
  address?: string;
  city?: string;
  pincode?: string;
  panNumber?: string;
  adminCode?: string;
}

export function OTPVerification() {
  const navigate = useNavigate();
  const [code, setCode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(60);
  const [loading, setLoading] = useState(false);

  const email = storage.get<string>(STORAGE_KEYS.otpEmail, "your email");

  const pendingUser = storage.get<PendingUser | null>(
    STORAGE_KEYS.pendingUser,
    null,
  );
  const targetContact = pendingUser?.email || email || "your email";

  // Timer countdown
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const verify = async (overrideCode?: string) => {
    const activeCode = overrideCode || code;
    if (activeCode.length < 6) return setError("Enter all 6 digits");

    setError(null);
    setLoading(true);

    try {
      if (pendingUser) {
        const res = await api.registerVerify(
          pendingUser.email,
          pendingUser.phone,
          activeCode,
          pendingUser.password || "",
          pendingUser.fullName,
          pendingUser.adminCode,
          pendingUser.address,
          pendingUser.city,
          pendingUser.pincode,
          undefined,
          pendingUser.panNumber,
        );
        if (res?.token && res?.user) {
          storage.set(STORAGE_KEYS.token, res.token);
          storage.set(STORAGE_KEYS.currentUser, res.user);
          if (res.refreshToken) {
            storage.set(STORAGE_KEYS.refreshToken, res.refreshToken);
          }
        }
        storage.remove(STORAGE_KEYS.otp);
        storage.remove(STORAGE_KEYS.pendingUser);
        storage.remove(STORAGE_KEYS.otpEmail);
        toast.success(res?.message || "Registration successful! Please log in.");
        navigate({ to: "/login" });
      } else {
        toast.error("No pending registration found. Please register or sign in.");
        navigate({ to: "/login" });
      }
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError(null);
    try {
      if (pendingUser) {
        await api.registerRequest(pendingUser.email, pendingUser.phone);
      }
      setSeconds(60);
      setDigits(Array(6).fill(""));
      toast.success("New verification code sent!");
    } catch (err) {
      const error = err as { message?: string };
      toast.error(error.message || "Failed to resend code");
    }
  };

  return (
    <div className="space-y-6">
      {/* Real-time Email Verification */}
      <div className="bg-card border border-border rounded-xl p-4 text-sm flex gap-3 items-start shadow-sm">
        <Info className="h-5 w-5 text-foreground shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-foreground">
            Email Verification
          </span>
          <p className="text-muted-foreground mt-0.5 text-xs">
            We sent a 6-digit verification code to{" "}
            <span className="font-semibold text-foreground">
              {targetContact}
            </span>
            .
          </p>
          <p className="text-muted-foreground text-xs mt-1.5 italic">
            Check your email inbox for the 6-digit OTP code.
          </p>
        </div>
      </div>

      {/* React Bits CodeSlots: 6-digit OTP Input */}
      <div className="py-2">
        <CodeSlots
          length={6}
          value={code}
          onChange={(val) => {
            setCode(val);
            setError(null);
          }}
          onComplete={(completedCode) => {
            setCode(completedCode);
            verify(completedCode);
          }}
          error={error}
          disabled={loading}
          autoFocus
        />
      </div>

      <Button className="w-full" onClick={() => verify()} loading={loading}>
        Verify Code
      </Button>

      <div className="text-center text-sm text-muted-foreground">
        {seconds > 0 ? (
          <>
            Resend in <span className="font-medium">{seconds}s</span>
          </>
        ) : (
          <button
            onClick={resend}
            className="text-primary hover:underline font-medium"
          >
            Resend code
          </button>
        )}
      </div>
    </div>
  );
}
