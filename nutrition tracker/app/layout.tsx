import type { Metadata, Viewport } from "next";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "NutriTrack",
  description: "Track your daily nutrition with minimal friction",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <div className="min-h-screen flex flex-col">
            <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5 pb-tab-bar">
              {children}
            </main>
            <NavBar />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
