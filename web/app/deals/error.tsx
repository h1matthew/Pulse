"use client";

import { Header } from "@/components/layout/Header";
import { ErrorBoundaryContent } from "@/components/features/error/ErrorBoundaryContent";

export default function DealsError({
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
          title="Error loading deals"
          description="We couldn't load available deals. Please try again."
        />
      </div>
    </div>
  );
}
