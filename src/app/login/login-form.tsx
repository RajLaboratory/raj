"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: f.get("email"), password: f.get("password") }),
    });
    setBusy(false);
    if (res.ok) { router.replace("/dashboard"); router.refresh(); return; }
    const j = await res.json().catch(() => null);
    setError(j?.error?.message ?? "Could not sign in. Try again.");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Email"><Input name="email" type="email" autoComplete="username" required autoFocus /></Field>
      <Field label="Password"><Input name="password" type="password" autoComplete="current-password" required /></Field>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Signing in" : "Sign in"}</Button>
    </form>
  );
}
