import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";

export default function Login() {
  return (
    <AuthLayout
      mode="login"
      title="Welcome, Payrent"
      subtitle="Find what you need and rent it with ease."
      role="payrent"
    >
      <LoginForm />
    </AuthLayout>
  );
}
