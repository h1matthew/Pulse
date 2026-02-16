"use client";

import { Header } from "@/components/layout/Header";
import { ErrorBoundaryContent } from "@/components/features/error/ErrorBoundaryContent";

export default function LeaderboardError({
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
          title="Error loading leaderboard"
          description="We couldn't load the impact leaderboard. Please try again."
        />
      </div>
    </div>
  );
}
