import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hyper-Advanced Dashboard",
  description: "Built for 2026 with Next.js 15.5.2, React 19, and AI-powered insights",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

