import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Cog } from "lucide-react";
import { NavTabs } from "@/components/nav-tabs";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";
import { CommandPalette } from "@/components/command-palette";
import { SearchTrigger } from "@/components/search-trigger";
import { QuickCapture } from "@/components/quick-capture";
import { NotificationBell } from "@/components/notification-bell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenClaw Dashboard",
  description: "Dashboard for OpenClaw agents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <div className="min-h-screen bg-background">
            <header className="border-b border-border/50 bg-card/30">
              <div className="px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary text-primary-foreground">
                    <Cog className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <div className="hidden sm:block">
                    <h1 className="text-base sm:text-lg font-bold tracking-tight">
                      OpenClaw Dashboard
                    </h1>
                    <p className="text-xs text-muted-foreground">
                      Task management for agents
                    </p>
                  </div>
                  <span className="sm:hidden text-sm font-bold">OC</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 min-w-0 overflow-x-auto">
                  <SearchTrigger />
                  <NavTabs />
                  <NotificationBell />
                  <ThemeToggle />
                  <LogoutButton />
                </div>
              </div>
            </header>
            <CommandPalette />
            <QuickCapture />
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
