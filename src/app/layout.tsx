import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Raj Laboratory",
  description: "Raj Laboratory Management System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
