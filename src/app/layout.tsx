import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portfolio Tracker",
  description: "Investment portfolio tracker for Sameer and Snehal",
};

export default function RootLayout({ children }:
  LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
