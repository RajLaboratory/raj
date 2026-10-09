"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Defaults; Phase 2 makes these configurable per user and wires the target pages.
const DEFAULTS: Record<string, string> = { n: "/patients/new", b: "/orders/new", f: "/search" };

export function Shortcuts() {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.altKey || e.shiftKey) return;
      const target = DEFAULTS[e.key.toLowerCase()];
      if (!target) return; // Ctrl+P / Ctrl+S keep browser behaviour until a page overrides them
      e.preventDefault();
      router.push(target);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
  return null;
}
