"use client";

import { Header } from "@/components/layout/Header";
import { ErrorBoundaryContent } from "@/components/features/error/ErrorBoundaryContent";

export default function MissionsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="relative min-h-screen bg-background">
      <Header />
      <div className="pt-28">
        <ErrorBoundaryContent
          error={error}
          reset={reset}
          title="Error loading missions"
          description="We couldn't load boost missions. Please try again."
        />
      </div>
    </div>
  );
}
