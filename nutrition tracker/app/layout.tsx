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
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <div className="min-h-screen md:pl-16">
            <NavBar />
            <main className="max-w-2xl md:max-w-4xl mx-auto w-full px-4 py-5 pb-tab-bar md:pb-5">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
