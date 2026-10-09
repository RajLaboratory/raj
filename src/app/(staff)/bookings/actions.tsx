"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const MOVES: Record<string, { to: "CONFIRMED" | "COMPLETED" | "CANCELLED"; label: string; variant: "primary" | "secondary" | "danger" }[]> = {
  PENDING: [{ to: "CONFIRMED", label: "Confirm", variant: "primary" }, { to: "CANCELLED", label: "Cancel booking", variant: "secondary" }],
  CONFIRMED: [{ to: "COMPLETED", label: "Mark completed", variant: "primary" }, { to: "CANCELLED", label: "Cancel booking", variant: "secondary" }],
};

export function BookingActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const moves = MOVES[status] ?? [];
  if (moves.length === 0) return null;

  async function go(to: string) {
    if (to === "CANCELLED" && !window.confirm("Cancel this booking?")) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/v1/online-bookings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: to }) });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.error?.message ?? "Could not update. Try again.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span role="alert" className="text-sm text-red-600">{error}</span>}
      {moves.map((m) => (
        <Button key={m.to} size="sm" variant={m.variant} disabled={busy} onClick={() => go(m.to)}>{m.label}</Button>
      ))}
    </div>
  );
}
