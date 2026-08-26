import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AppBackground } from "@/components/layout/AppBackground";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { AccessibilityProvider } from "@/components/providers/AccessibilityProvider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Analytics } from "@vercel/analytics/next"
import { ChatWidgetLazy } from "@/components/features/assistant/ChatWidgetLazy";
import { OnboardingTour } from "@/components/features/help/OnboardingTour";
import "./globals.css";

// No-flash theme init: applies the saved theme class before the page paints.
// Server-rendered (not inside a client component), so it does not trigger
// React 19's "script tag in client component" warning. Keep the storage key
// in sync with THEME_STORAGE_KEY in components/providers/theme-provider.tsx.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('pulse-theme');if(t==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})();`

export const metadata: Metadata = {
  title: "Pulse - Discover Local Businesses",
  description: "Find and support local businesses in your community. Every interaction strengthens your local economy.",
  icons: {
    icon: '/pulse-logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* Ambient drifting-orb background, shared by every page (fixed, -z-10) */}
        <AppBackground />
        {/* Skip to main content link for keyboard/screen reader accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none"
        >
          Skip to main content
        </a>
        <ThemeProvider defaultTheme="light">
          <QueryProvider>
            <AuthProvider>
              <AccessibilityProvider>
                <TooltipProvider>
                  <main id="main-content" role="main">
                    {children}
                  </main>
                <Toaster />
                <Analytics />
                <ChatWidgetLazy />
                <OnboardingTour />
                </TooltipProvider>
              </AccessibilityProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
