import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { AchievementWrapper } from "@/components/providers/AchievementWrapper";
import { AccessibilityProvider } from "@/components/providers/AccessibilityProvider";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next"
import { ChatWidget } from "@/components/features/assistant";
import "katex/dist/katex.min.css";
import "./globals.css";

const fallbackFontVars: CSSProperties = {
  // Local font stack to avoid network font fetch during build/demo.
  ["--font-geist-sans" as string]:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
  ["--font-geist-mono" as string]:
    'ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace',
};

export const metadata: Metadata = {
  title: "Pulse - Discover Local Businesses",
  description: "Find and support local businesses in your community. Every interaction strengthens your local economy.",
  icons: {
    icon: '/logo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased"
        style={fallbackFontVars}
        suppressHydrationWarning
      >
        {/* Skip to main content link for keyboard/screen reader accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none"
        >
          Skip to main content
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthProvider>
              <AccessibilityProvider>
                <AchievementWrapper>
                  <main id="main-content" role="main">
                    {children}
                  </main>
                </AchievementWrapper>
                <Toaster />
                <Analytics />
                <ChatWidget />
              </AccessibilityProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
