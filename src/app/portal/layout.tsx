import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Figtree({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Book lab tests | Raj Laboratory",
  description: "Choose your tests, pick a time, and Raj Laboratory will confirm your booking by phone.",
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${display.variable} ${body.variable} font-sans`}>{children}</div>;
}
