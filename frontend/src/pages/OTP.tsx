import { MainLayout } from "@/layouts/MainLayout";
import { BackButton } from "@/components/common/BackButton";
import { OTPVerification } from "@/components/auth/OTPVerification";

export default function OTP() {
  return (
    <MainLayout>
      <section className="mx-auto max-w-md px-4 md:px-6 py-16">
        <BackButton fallback="/login" className="mb-4" />
        <div className="card-premium p-8">
          <h1 className="text-3xl font-bold">Enter verification code</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A 6-digit verification code was sent to your registered mobile phone
            or email.
          </p>
          <div className="mt-8">
            <OTPVerification />
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
