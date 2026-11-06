import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/common/Input";
import { Button } from "@/components/common/Button";
import {
  Phone,
  MapPin,
  Building2,
  Compass,
  ShieldCheck,
  Mail,
} from "lucide-react";
import { toast } from "sonner";

interface CompleteProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    phone: string;
    address: string;
    city: string;
    pincode: string;
    adminCode?: string;
  }) => Promise<void>;
  email: string;
  fullName?: string;
  isAdminRoute?: boolean;
  initialPhone?: string;
  initialAddress?: string;
  initialCity?: string;
  initialPincode?: string;
}

export function CompleteProfileModal({
  isOpen,
  onClose,
  onSubmit,
  email,
  fullName,
  isAdminRoute = false,
  initialPhone = "",
  initialAddress = "",
  initialCity = "",
  initialPincode = "",
}: CompleteProfileModalProps) {
  const [phone, setPhone] = useState(initialPhone);
  const [address, setAddress] = useState(initialAddress);
  const [city, setCity] = useState(initialCity);
  const [pincode, setPincode] = useState(initialPincode);
  const [adminCode, setAdminCode] = useState(
    isAdminRoute ? "PAYENT-ADMIN-2026" : "",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 7) {
      return setError("Enter a valid phone number (at least 7 digits)");
    }
    if (address.trim().length < 3) {
      return setError("Street address is required");
    }
    if (city.trim().length < 2) {
      return setError("City is required");
    }
    if (pincode.trim().length < 5) {
      return setError("Valid PIN code is required");
    }

    setLoading(true);
    try {
      await onSubmit({
        phone: cleanPhone,
        address: address.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        adminCode: adminCode.trim() || undefined,
      });
      toast.success("Profile details saved successfully!");
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to complete profile",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      modal={true}
    >
      <DialogContent className="max-w-md border-border bg-card text-foreground shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">
            Complete Account Setup
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Welcome{" "}
            <span className="font-semibold text-foreground">
              {fullName || email}
            </span>
            ! Please complete your contact & delivery address details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          {error && (
            <div className="p-2.5 rounded-lg text-xs font-semibold bg-destructive/10 border border-destructive/30 text-destructive">
              {error}
            </div>
          )}

          <Input
            label="Google Account Email"
            type="email"
            value={email}
            readOnly
            disabled
            icon={<Mail className="h-4 w-4 text-primary" />}
            className="bg-secondary/40 font-medium text-foreground cursor-not-allowed opacity-90"
          />

          <Input
            label="Phone Number"
            placeholder="9876543210"
            icon={<Phone className="h-4 w-4" />}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          <Input
            label="Street Address"
            placeholder="123 Innovation Way"
            icon={<MapPin className="h-4 w-4" />}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="City"
              placeholder="Bangalore"
              icon={<Building2 className="h-4 w-4" />}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
            <Input
              label="PIN Code"
              placeholder="560001"
              icon={<Compass className="h-4 w-4" />}
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              required
            />
          </div>

          {(isAdminRoute || adminCode) && (
            <Input
              label="Admin Security Code (Optional)"
              placeholder="PAYENT-ADMIN-2026"
              icon={<ShieldCheck className="h-4 w-4" />}
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
            />
          )}

          <div className="pt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Save & Continue
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
