import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
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
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('pulse-theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})();`

export const metadata: Metadata = {
  title: "Pulse - Local Business Directory",
  description: "Find independent businesses nearby. Compare hours, ratings, deals, and verified local spend.",
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
    <html lang="en" className={`dark ${inter.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* Flat page ground, shared by every page (fixed, -z-10) */}
        <AppBackground />
        {/* Skip to main content link for keyboard/screen reader accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none"
        >
          Skip to main content
        </a>
        <ThemeProvider defaultTheme="dark">
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
