"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export type RateRow = {
  testId: string; name: string; code: string; department: string;
  ownPrice: number; ownTat: number; // Raj Laboratory's own price (paise) and report time, for reference
  price: string; tat: string; // rupees and hours as typed
};

const rupees = (p: number) => `₹${new Intl.NumberFormat("en-IN").format(p / 100)}`;

export function RateGrid({ labId, rows }: { labId: string; rows: RateRow[] }) {
  const router = useRouter();
  const [vals, setVals] = useState<Record<string, { price: string; tat: string }>>(() =>
    Object.fromEntries(rows.map((r) => [r.testId, { price: r.price, tat: r.tat }])),
  );
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? rows.filter((r) => r.name.toLowerCase().includes(n) || r.code.toLowerCase().includes(n) || r.department.toLowerCase().includes(n)) : rows;
  }, [rows, q]);
  const set = (id: string, k: "price" | "tat", v: string) => setVals((cur) => ({ ...cur, [id]: { ...cur[id], [k]: v } }));
  const offered = Object.values(vals).filter((v: { price: string }) => v.price.trim() !== "").length;

  async function save() {
    setMsg(null);
    const payload: { testId: string; price: number | null; tatHours: number | null }[] = [];
    for (const r of rows) {
      const v = vals[r.testId];
      const price = v.price.trim(), tat = v.tat.trim();
      if (!price && !tat) { payload.push({ testId: r.testId, price: null, tatHours: null }); continue; }
      const p = Number(price.replace(/,/g, "")), t = Number(tat);
      if (!price || !Number.isFinite(p) || p <= 0) return setMsg({ ok: false, text: `Enter a valid price for ${r.name}, or clear the row.` });
      if (!tat || !Number.isInteger(t) || t < 1 || t > 720) return setMsg({ ok: false, text: `Enter the report time in whole hours for ${r.name}.` });
      payload.push({ testId: r.testId, price: Math.round(p * 100), tatHours: t });
    }
    setBusy(true);
    const res = await fetch(`/api/v1/outsourcing-labs/${labId}/rates`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: payload }) });
    const json = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) return setMsg({ ok: false, text: json?.error?.message ?? "Could not save. Try again." });
    setMsg({ ok: true, text: json.data.saved === 0 ? "No changes to save" : `Saved ${json.data.saved} change${json.data.saved === 1 ? "" : "s"}` });
    router.refresh();
  }

  const input = "h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 text-sm tabular-nums";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tests" aria-label="Search tests" className="h-10 w-72 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm" />
        <span className="text-sm text-[var(--muted)]">{offered} tests offered by this lab</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--line)] bg-[var(--surface)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--muted)]">
              <th className="p-3">Test</th><th>Our price</th><th>Our report time</th><th className="w-36">Lab price (₹)</th><th className="w-36">Report time (hours)</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.testId} className="border-t border-[var(--line)]">
                <td className="p-3"><div className="font-medium">{r.name}</div><div className="text-xs text-[var(--muted)]">{r.department}</div></td>
                <td className="tabular-nums">{rupees(r.ownPrice)}</td>
                <td className="tabular-nums">{r.ownTat} hours</td>
                <td className="pr-3"><input className={input} inputMode="decimal" aria-label={`Price at this lab for ${r.name}`} value={vals[r.testId].price} onChange={(e) => set(r.testId, "price", e.target.value)} /></td>
                <td className="pr-3"><input className={input} inputMode="numeric" aria-label={`Report time in hours for ${r.name}`} value={vals[r.testId].tat} onChange={(e) => set(r.testId, "tat", e.target.value)} /></td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-[var(--muted)]">No test matches your search.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="sticky bottom-0 flex items-center gap-3 border-t border-[var(--line)] bg-[var(--bg)] py-3">
        <Button onClick={save} disabled={busy}>{busy ? "Saving..." : "Save prices"}</Button>
        {msg && <span role="status" className={msg.ok ? "text-sm text-flag-normal" : "text-sm text-red-600"}>{msg.text}</span>}
      </div>
    </div>
  );
}
