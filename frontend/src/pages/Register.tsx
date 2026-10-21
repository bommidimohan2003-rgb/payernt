import { AuthLayout } from "@/components/auth/AuthLayout";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function Register() {
  return (
    <AuthLayout
      mode="register"
      title="Welcome, Payrent"
      subtitle="Find what you need and rent it with ease."
      role="payrent"
    >
      <RegisterForm />
    </AuthLayout>
  );
}
