"use client";

import { Header } from "@/components/layout/Header";
import { ErrorBoundaryContent } from "@/components/features/error/ErrorBoundaryContent";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="relative min-h-screen bg-background">
      <Header />
      <div className="pt-20">
        <ErrorBoundaryContent
          error={error}
          reset={reset}
          title="Error loading dashboard"
          description="We couldn't load your impact data. Please try again."
        />
      </div>
    </div>
  );
}
