"use client";

import { Header } from "@/components/layout/Header";
import { ErrorBoundaryContent } from "@/components/features/error/ErrorBoundaryContent";

export default function BusinessDetailError({
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
          title="Error loading business"
          description="We couldn't load this business's details. It may have been removed or there's a connection issue."
        />
      </div>
    </div>
  );
}
