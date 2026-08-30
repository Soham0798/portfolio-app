import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portfolio Tracker",
  description: "Investment portfolio tracker for Sameer, Snehal & Soham",
  openGraph: {
    title: "Portfolio Tracker",
    description: "Investment portfolio tracker for Sameer, Snehal & Soham",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Portfolio Tracker",
    description: "Investment portfolio tracker for Sameer, Snehal & Soham",
    images: ["/og-image.png"],
  },
};

import { ThemeProvider } from "@/components/ThemeProvider";

export default function RootLayout({ children }:
  LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
