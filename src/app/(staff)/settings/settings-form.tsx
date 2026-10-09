"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import type { LabProfile } from "@/lib/settings";
import type { NumberFormat } from "@/lib/numbering";

async function save(key: string, value: unknown) {
  const res = await fetch("/api/v1/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, value }) });
  const j = await res.json();
  return res.ok ? null : (j.error?.message as string);
}

export function SettingsForm({ profile, numbering }: { profile: LabProfile; numbering: Record<string, NumberFormat> }) {
  const [p, setP] = useState(profile);
  const [n, setN] = useState(numbering);
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();

  const set = (k: keyof LabProfile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setP({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function onSave() {
    setMsg(undefined);
    const errs = [await save("lab.profile", p), ...(await Promise.all(Object.entries(n).map(([t, v]) => save(`numbering.${t}`, v))))].filter(Boolean);
    setMsg(errs.length ? { ok: false, text: String(errs[0]) } : { ok: true, text: "Settings saved" });
  }

  const text: [keyof LabProfile, string][] = [
    ["name", "Laboratory name"], ["phone", "Phone"], ["email", "Email"], ["website", "Website"],
    ["address", "Address"], ["gstin", "GST number"], ["license", "Registration / license"],
    ["signatory", "Authorized signatory"], ["reportFooter", "Report footer"],
  ];

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6">
        <h2 className="font-semibold">Laboratory details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {text.map(([k, label]) => (
            <Field key={k} label={label}><Input value={String(p[k] ?? "")} onChange={set(k)} /></Field>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={p.gstEnabled} onChange={set("gstEnabled")} /> Charge GST on invoices
        </label>
      </section>

      <section className="space-y-4 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6">
        <h2 className="font-semibold">Numbering</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[var(--muted)]"><th className="py-2">Document</th><th>Prefix</th><th>Digits</th><th>Reset every year</th></tr></thead>
            <tbody>
              {Object.entries(n).map(([t, f]) => (
                <tr key={t} className="border-t border-[var(--line)]">
                  <td className="py-2">{t.replace("_", " ").toLowerCase()}</td>
                  <td><Input className="w-24" value={f.prefix} onChange={(e) => setN({ ...n, [t]: { ...f, prefix: e.target.value } })} /></td>
                  <td><Input className="w-20" type="number" min={3} max={10} value={f.digits} onChange={(e) => setN({ ...n, [t]: { ...f, digits: Number(e.target.value) } })} /></td>
                  <td><input type="checkbox" checked={f.yearlyReset} onChange={(e) => setN({ ...n, [t]: { ...f, yearlyReset: e.target.checked } })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-[var(--muted)]">Changes apply to new documents only. Existing numbers never change.</p>
      </section>

      <div className="flex items-center gap-4">
        <Button onClick={onSave}>Save settings</Button>
        {msg && <span role="status" className={msg.ok ? "text-green-700" : "text-red-600"}>{msg.text}</span>}
      </div>
    </div>
  );
}
