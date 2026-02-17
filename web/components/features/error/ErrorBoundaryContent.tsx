"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NavLink } from "@/components/ui/nav-link";

interface ErrorBoundaryContentProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
}

export function ErrorBoundaryContent({
  error,
  reset,
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
}: ErrorBoundaryContentProps) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-12">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div
            className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6"
            aria-hidden="true"
          >
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold mb-2">{title}</h2>
          <p className="text-muted-foreground mb-6">{description}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={reset} className="gap-2">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try Again
            </Button>
            <NavLink href="/">
              <Button variant="outline" className="gap-2 w-full">
                <Home className="h-4 w-4" aria-hidden="true" />
                Go Home
              </Button>
            </NavLink>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
