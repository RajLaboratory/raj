"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

type Lab = { id: string; name: string; phone: string | null; address: string | null; isActive: boolean };

/** Adds a partner lab, or edits one when `lab` is given. */
export function LabForm({ lab }: { lab?: Lab }) {
  const router = useRouter();
  const [name, setName] = useState(lab?.name ?? "");
  const [phone, setPhone] = useState(lab?.phone ?? "");
  const [address, setAddress] = useState(lab?.address ?? "");
  const [isActive, setIsActive] = useState(lab?.isActive ?? true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.SyntheticEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch(lab ? `/api/v1/outsourcing-labs/${lab.id}` : "/api/v1/outsourcing-labs", {
      method: lab ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lab ? { name, phone, address, isActive } : { name, phone, address }),
    });
    const json = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) return setMsg({ ok: false, text: json?.error?.fields?.name?.[0] ?? json?.error?.message ?? "Could not save. Try again." });
    if (lab) { setMsg({ ok: true, text: "Saved" }); router.refresh(); }
    else router.push(`/admin/labs/${json.data.id}`);
  }

  return (
    <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
      <Field label="Lab name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bhatt Laboratory" /></Field>
      <Field label="Phone (optional)"><Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" /></Field>
      <div className="sm:col-span-2"><Field label="Address (optional)"><Input value={address} onChange={(e) => setAddress(e.target.value)} /></Field></div>
      {lab && (
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 accent-brand-600" />
          Show this lab to patients on the booking page
        </label>
      )}
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={busy}>{busy ? "Saving..." : lab ? "Save lab" : "Add lab"}</Button>
        {msg && <span role="status" className={msg.ok ? "text-sm text-flag-normal" : "text-sm text-red-600"}>{msg.text}</span>}
      </div>
    </form>
  );
}
