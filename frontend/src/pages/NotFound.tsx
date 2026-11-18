import { Link } from "@tanstack/react-router";
import { MainLayout } from "@/layouts/MainLayout";
import { Button } from "@/components/common/Button";
import { BackButton } from "@/components/common/BackButton";

export default function NotFound() {
  return (
    <MainLayout>
      <section className="mx-auto max-w-xl px-4 md:px-6 py-16 text-center">
        <div className="flex items-center justify-start mb-6">
          <BackButton fallback="/payent" />
        </div>
        <div className="text-8xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          404
        </div>
        <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-muted-foreground">
          The page you're looking for doesn't exist or was moved.
        </p>
        <Link to="/" className="mt-8 inline-block">
          <Button size="lg">Back to home</Button>
        </Link>
      </section>
    </MainLayout>
  );
}
