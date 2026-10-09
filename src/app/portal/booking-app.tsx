"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  SLOTS, MAX_DAYS_AHEAD, addDays, istDateString, isSlotOpen, normalizePhone, priceSelection, slotLabel,
  type CatalogPackage, type CatalogTest, type LabOption, type TestChoice,
} from "@/lib/booking";

export type PortalTest = {
  id: string; code: string; name: string; sample: string | null; fasting: boolean; prep: string | null;
  tatHours: number; price: number; discountPrice: number | null; pay: number;
  /** Partner labs that also offer this test, each with its own price and report time. */
  rates: LabOption[];
};
export type PortalCatalog = {
  lab: { name: string; phone: string; address: string };
  departments: { id: string; name: string; tests: PortalTest[] }[];
  packages: { id: string; code: string; name: string; price: number; tests: { id: string; name: string }[] }[];
};

const rupees = (paise: number) =>
  paise % 100 === 0
    ? `₹${new Intl.NumberFormat("en-IN").format(paise / 100)}`
    : `₹${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(paise / 100)}`;

const turnaround = (h: number) => (h < 48 ? `Report in ${h} hours` : `Report in ${Math.ceil(h / 24)} days`);

type Fields = Partial<Record<"name" | "phone" | "email" | "age" | "address" | "date" | "slot" | "testIds", string>>;
type Done = { reference: string; total: number; phone: string; date: string; slot: string; visit: "LAB" | "HOME" };

export function BookingApp({ catalog }: { catalog: PortalCatalog }) {
  const [q, setQ] = useState("");
  const [chip, setChip] = useState<string>("all");
  const [picked, setPicked] = useState<TestChoice[]>([]);
  const [packageIds, setPackageIds] = useState<string[]>([]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [visit, setVisit] = useState<"LAB" | "HOME">("LAB");
  const [address, setAddress] = useState("");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [today, setToday] = useState("");
  const [errors, setErrors] = useState<Fields>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  useEffect(() => {
    const t = istDateString();
    setToday(t);
    setDate(addDays(t, 1));
  }, []);

  const flat = useMemo(() => {
    const tests: CatalogTest[] = catalog.departments.flatMap((d) =>
      d.tests.map((t) => ({ id: t.id, code: t.code, name: t.name, price: t.price, discountPrice: t.discountPrice, tatHours: t.tatHours, rates: t.rates })),
    );
    const packages: CatalogPackage[] = catalog.packages.map((p) => ({ id: p.id, code: p.code, name: p.name, price: p.price, testIds: p.tests.map((t) => t.id) }));
    return { tests, packages };
  }, [catalog]);

  const { lines, total } = useMemo(() => priceSelection(flat, { packageIds, tests: picked }), [flat, packageIds, picked]);
  const count = packageIds.length + picked.length;
  const coveredIds = useMemo(() => {
    const s = new Set<string>();
    for (const p of flat.packages) if (packageIds.includes(p.id)) p.testIds.forEach((t) => s.add(t));
    return s;
  }, [flat, packageIds]);

  const needle = q.trim().toLowerCase();
  const matches = (...parts: (string | null | undefined)[]) => !needle || parts.some((p) => p?.toLowerCase().includes(needle));
  const shownPackages = chip === "all" || chip === "packages" ? catalog.packages.filter((p) => matches(p.name, p.code, ...p.tests.map((t) => t.name))) : [];
  const shownDepts = chip === "packages" ? [] : catalog.departments
    .filter((d) => chip === "all" || chip === d.id)
    .map((d) => ({ ...d, tests: d.tests.filter((t) => matches(t.name, t.code, t.sample, d.name)) }))
    .filter((d) => d.tests.length > 0);
  const shownTestCount = shownDepts.reduce((n, d) => n + d.tests.length, 0);
  const totalTests = catalog.departments.reduce((n, d) => n + d.tests.length, 0);

  const toggle = (list: string[], set: (v: string[]) => void, id: string) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const togglePick = (id: string) =>
    setPicked((cur) => (cur.some((c) => c.id === id) ? cur.filter((c) => c.id !== id) : [...cur, { id, labId: null }]));
  const chooseLab = (id: string, labId: string | null) =>
    setPicked((cur) => cur.map((c) => (c.id === id ? { ...c, labId } : c)));

  function jumpToSlip() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("slip")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  function validate(): Fields {
    const e: Fields = {};
    if (count === 0) e.testIds = "Choose at least one test or package";
    if (name.trim().length < 2) e.name = "Enter the patient's full name";
    if (!normalizePhone(phone)) e.phone = "Enter a 10-digit mobile number";
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "Enter a valid email or leave it blank";
    if (age.trim() && !(Number.isInteger(Number(age)) && Number(age) >= 0 && Number(age) <= 120)) e.age = "Enter age in years";
    if (visit === "HOME" && address.trim().length < 10) e.address = "Enter the full address for home collection";
    if (!date) e.date = "Pick a date";
    if (!slot) e.slot = "Pick a time slot";
    else if (date && !isSlotOpen(date, slot)) e.slot = "That slot has already started. Pick a later one.";
    return e;
  }

  async function submit(ev: React.SyntheticEvent) {
    ev.preventDefault();
    setFormError("");
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const res = await fetch("/api/v1/portal/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, phone, email: email.trim(), age: age.trim() ? Number(age) : undefined, sex: sex || undefined,
          visitType: visit, address: visit === "HOME" ? address : undefined, date, slot, notes: notes.trim() || undefined,
          packageIds, tests: picked, website,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const f = json?.error?.fields as Record<string, string[]> | undefined;
        if (f) setErrors(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v[0]])) as Fields);
        setFormError(json?.error?.message ?? "Could not place the booking. Try again or call the lab.");
        return;
      }
      setDone({ reference: json.data.reference, total: json.data.total, phone: normalizePhone(phone) ?? phone, date, slot, visit });
      window.scrollTo({ top: 0 });
    } catch {
      setFormError("No connection. Check your internet and try again.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setDone(null); setPicked([]); setPackageIds([]); setName(""); setPhone(""); setEmail(""); setAge(""); setSex("");
    setAddress(""); setNotes(""); setSlot(""); setErrors({}); setFormError("");
  }

  const telHref = catalog.lab.phone ? `tel:${catalog.lab.phone.replace(/[^\d+]/g, "")}` : undefined;

  return (
    <div className="min-h-screen pb-28 lg:pb-12">
      <header className="border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-brand-600 font-display text-lg font-bold text-white" aria-hidden>R</div>
            <span className="font-display text-lg font-semibold">{catalog.lab.name}</span>
          </div>
          {telHref && (
            <a href={telHref} className="rounded-md border border-[var(--line)] px-3 py-1.5 text-sm font-medium hover:bg-brand-50">
              Call {catalog.lab.phone}
            </a>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-8">
        {done ? (
          <Confirmation done={done} lab={catalog.lab} onAgain={reset} />
        ) : (
          <>
            <div className="max-w-2xl">
              <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Book your lab tests</h1>
              <p className="mt-2 text-[var(--muted)]">
                Choose your tests, pick a time, and we will call to confirm. You pay at the lab or when our team visits. Nothing to pay now.
              </p>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
              <section aria-label="Tests and packages">
                <div className="sticky top-0 z-10 -mx-4 space-y-3 bg-[var(--bg)]/95 px-4 pb-3 pt-1 backdrop-blur">
                  <label className="block">
                    <span className="sr-only">Search tests</span>
                    <Input
                      type="search" value={q} onChange={(e) => setQ(e.target.value)}
                      placeholder={`Search ${totalTests} tests, for example thyroid or sugar`} className="h-12 text-base"
                    />
                  </label>
                  <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter by group">
                    {[{ id: "all", name: "All" }, ...(catalog.packages.length ? [{ id: "packages", name: "Packages" }] : []), ...catalog.departments.map((d) => ({ id: d.id, name: d.name }))].map((c) => (
                      <button
                        key={c.id} type="button" onClick={() => setChip(c.id)} aria-pressed={chip === c.id}
                        className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm", chip === c.id ? "border-brand-600 bg-brand-600 font-medium text-white" : "border-[var(--line)] bg-[var(--surface)] hover:bg-brand-50")}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="sr-only" aria-live="polite">{shownTestCount} tests and {shownPackages.length} packages shown</p>

                {errors.testIds && <p className="mt-2 text-sm text-red-600" role="alert">{errors.testIds}</p>}

                {shownPackages.length > 0 && (
                  <div className="mt-4">
                    <h2 className="font-display text-xl font-semibold">Health packages</h2>
                    <ul className="mt-2 divide-y divide-[var(--line)] overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)]">
                      {shownPackages.map((p) => {
                        const on = packageIds.includes(p.id);
                        return (
                          <li key={p.id} className={cn(on && "bg-brand-50")}>
                            <button
                              type="button" role="checkbox" aria-checked={on} onClick={() => toggle(packageIds, setPackageIds, p.id)}
                              className="flex w-full items-start gap-3 px-4 py-3 text-left"
                            >
                              <Tick on={on} />
                              <span className="min-w-0 flex-1">
                                <span className="block font-medium">{p.name}</span>
                                <span className="block text-sm text-[var(--muted)]">Includes {p.tests.length} tests</span>
                              </span>
                              <span className="font-display text-lg font-semibold tabular-nums">{rupees(p.price)}</span>
                            </button>
                            <details className="px-4 pb-3 pl-[3.25rem] text-sm text-[var(--muted)]">
                              <summary className="cursor-pointer text-brand-700">See what is included</summary>
                              <p className="mt-1">{p.tests.map((t) => t.name).join(", ")}</p>
                            </details>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {shownDepts.map((d) => (
                  <div key={d.id} className="mt-8">
                    <h2 className="font-display text-xl font-semibold">{d.name}</h2>
                    <ul className="mt-2 divide-y divide-[var(--line)] overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)]">
                      {d.tests.map((t) => {
                        const covered = coveredIds.has(t.id);
                        const choice = picked.find((c) => c.id === t.id);
                        const on = !!choice;
                        const options = [
                          { labId: null as string | null, labName: catalog.lab.name, price: t.pay, tatHours: t.tatHours },
                          ...t.rates.map((r) => ({ labId: r.labId as string | null, labName: r.labName, price: r.price, tatHours: r.tatHours })),
                        ];
                        const multi = t.rates.length > 0;
                        const current = options.find((o) => o.labId === (choice?.labId ?? null)) ?? options[0];
                        const paid = options.filter((o) => o.price > 0).map((o) => o.price);
                        const lowest = paid.length ? Math.min(...paid) : 0;
                        const fastest = Math.min(...options.map((o) => o.tatHours));
                        const pricesDiffer = new Set(options.map((o) => o.price)).size > 1;
                        const timesDiffer = new Set(options.map((o) => o.tatHours)).size > 1;
                        return (
                          <li key={t.id}>
                            <button
                              type="button" role="checkbox" aria-checked={on} onClick={() => togglePick(t.id)}
                              className={cn("flex w-full items-start gap-3 px-4 py-3 text-left", on && "bg-brand-50")}
                            >
                              <Tick on={on} />
                              <span className="min-w-0 flex-1">
                                <span className="block font-medium">{t.name}</span>
                                <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-[var(--muted)]">
                                  {t.sample && <span>{t.sample}</span>}
                                  {!multi || covered ? <span>{turnaround(t.tatHours)}</span> : on ? <span>{turnaround(current.tatHours)}</span> : null}
                                  {t.fasting && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-flag-low">Fasting needed</span>}
                                  {multi && !covered && !on && <span className="rounded bg-brand-100 px-1.5 py-0.5 text-xs font-medium text-brand-800">Compare {options.length} labs</span>}
                                  {covered && <span className="rounded bg-brand-100 px-1.5 py-0.5 text-xs font-medium text-brand-800">Already in your package</span>}
                                </span>
                              </span>
                              <span className="text-right">
                                {multi && !on && !covered && <span className="block text-xs text-[var(--muted)]">From</span>}
                                <span className="block font-display text-lg font-semibold tabular-nums">
                                  {multi && !covered ? rupees(on ? current.price : lowest) : t.pay > 0 ? rupees(t.pay) : "On request"}
                                </span>
                                {!multi && t.pay < t.price && <span className="block text-xs text-[var(--muted)] line-through tabular-nums">{rupees(t.price)}</span>}
                              </span>
                            </button>
                            {on && multi && !covered && (
                              <fieldset className="bg-brand-50 px-4 pb-3 pl-[3.25rem]">
                                <legend className="sr-only">Choose the lab for {t.name}</legend>
                                <p className="mb-1.5 text-sm text-[var(--muted)]">Choose which lab tests your sample</p>
                                <div className="space-y-1.5">
                                  {options.map((o) => {
                                    const sel = o.labId === (choice?.labId ?? null);
                                    return (
                                      <label
                                        key={o.labId ?? "inhouse"}
                                        className={cn("flex cursor-pointer items-center gap-3 rounded-md border bg-white px-3 py-2 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-600", sel ? "border-brand-600" : "border-[var(--line)]")}
                                      >
                                        <input type="radio" name={`lab-${t.id}`} checked={sel} onChange={() => chooseLab(t.id, o.labId)} className="h-4 w-4 accent-brand-600" />
                                        <span className="min-w-0 flex-1">
                                          <span className="block font-medium">{o.labName}</span>
                                          <span className="block text-xs text-[var(--muted)]">{turnaround(o.tatHours)}</span>
                                        </span>
                                        <span className="flex flex-col items-end gap-0.5">
                                          <span className="font-display font-semibold tabular-nums">{o.price > 0 ? rupees(o.price) : "On request"}</span>
                                          <span className="flex gap-1">
                                            {pricesDiffer && o.price > 0 && o.price === lowest && <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-flag-normal">Lowest price</span>}
                                            {timesDiffer && o.tatHours === fastest && <span className="rounded bg-brand-100 px-1.5 py-0.5 text-xs font-medium text-brand-800">Fastest report</span>}
                                          </span>
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </fieldset>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}

                {shownTestCount === 0 && shownPackages.length === 0 && (
                  <div className="mt-8 rounded-lg border border-dashed border-[var(--line)] p-8 text-center text-[var(--muted)]">
                    No test matches &ldquo;{q}&rdquo;. Try a shorter word, or call the lab and we will help you choose.
                  </div>
                )}
              </section>

              <aside id="slip" className="lg:sticky lg:top-4 lg:self-start">
                <form onSubmit={submit} noValidate className="relative rounded-lg border border-[var(--line)] bg-[var(--surface)] shadow-sm">
                  <div className="px-5 pb-4 pt-5">
                    <div className="flex items-baseline justify-between">
                      <h2 className="font-display text-xl font-semibold">Your booking</h2>
                      <span className="text-sm text-[var(--muted)]">{count === 0 ? "Nothing selected" : `${count} selected`}</span>
                    </div>
                    {lines.length === 0 ? (
                      <p className="mt-3 text-sm text-[var(--muted)]">Tap a test or package on the left to add it here.</p>
                    ) : (
                      <ul className="mt-3 space-y-2 text-sm">
                        {lines.map((l) => (
                          <li key={`${l.kind}-${l.id}`} className="flex items-start gap-2">
                            <span className="min-w-0 flex-1">
                              {l.name}
                              {l.coveredBy && <span className="block text-xs text-[var(--muted)]">Included in {l.coveredBy}</span>}
                              {l.kind === "TEST" && !l.coveredBy && (
                                <span className="block text-xs text-[var(--muted)]">
                                  {l.labName ?? catalog.lab.name}{l.tatHours ? `, ${turnaround(l.tatHours).toLowerCase()}` : ""}
                                </span>
                              )}
                            </span>
                            <span className="tabular-nums">{l.coveredBy ? "Included" : rupees(l.amount)}</span>
                            <button
                              type="button" aria-label={`Remove ${l.name}`}
                              onClick={() => (l.kind === "PACKAGE" ? toggle(packageIds, setPackageIds, l.id) : togglePick(l.id))}
                              className="-my-1 rounded px-1.5 py-1 text-[var(--muted)] hover:bg-brand-50 hover:text-red-600"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-4 flex items-baseline justify-between border-t border-[var(--line)] pt-3">
                      <span className="font-medium">Total to pay at the lab</span>
                      <span className="font-display text-2xl font-semibold tabular-nums">{rupees(total)}</span>
                    </div>
                  </div>

                  <div className="relative border-t-2 border-dashed border-[var(--line)]">
                    <span className="absolute -left-2.5 -top-[11px] h-5 w-5 rounded-full border border-[var(--line)] bg-[var(--bg)]" aria-hidden />
                    <span className="absolute -right-2.5 -top-[11px] h-5 w-5 rounded-full border border-[var(--line)] bg-[var(--bg)]" aria-hidden />
                    <div className="space-y-4 px-5 pb-5 pt-5">
                      <fieldset className="grid grid-cols-2 gap-2">
                        <legend className="mb-1.5 text-sm font-medium">Where should we take the sample?</legend>
                        {([["LAB", "Visit the lab"], ["HOME", "Home collection"]] as const).map(([v, label]) => (
                          <label key={v} className={cn("cursor-pointer rounded-md border px-3 py-2.5 text-center text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-600", visit === v ? "border-brand-600 bg-brand-50 font-medium" : "border-[var(--line)]")}>
                            <input type="radio" name="visit" value={v} checked={visit === v} onChange={() => setVisit(v)} className="sr-only" />
                            {label}
                          </label>
                        ))}
                      </fieldset>

                      <Field label="Patient's full name" error={errors.name}>
                        <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                      </Field>
                      <Field label="Mobile number" error={errors.phone}>
                        <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="98765 43210" />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Age (optional)" error={errors.age}>
                          <Input value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" />
                        </Field>
                        <Field label="Sex (optional)">
                          <select value={sex} onChange={(e) => setSex(e.target.value)} className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm">
                            <option value="">Not stated</option>
                            <option value="FEMALE">Female</option>
                            <option value="MALE">Male</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </Field>
                      </div>
                      <Field label="Email for the report (optional)" error={errors.email}>
                        <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" />
                      </Field>

                      {visit === "HOME" && (
                        <Field label="Address for home collection" error={errors.address}>
                          <textarea
                            value={address} onChange={(e) => setAddress(e.target.value)} rows={3} autoComplete="street-address"
                            className="w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
                            placeholder="House or flat number, street, area, landmark"
                          />
                        </Field>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Date" error={errors.date}>
                          <Input type="date" value={date} min={today || undefined} max={today ? addDays(today, MAX_DAYS_AHEAD) : undefined} onChange={(e) => setDate(e.target.value)} />
                        </Field>
                        <Field label="Time" error={errors.slot}>
                          <select value={slot} onChange={(e) => setSlot(e.target.value)} className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm">
                            <option value="">Choose a slot</option>
                            {SLOTS.map((s) => (
                              <option key={s} value={s} disabled={!!date && !isSlotOpen(date, s)}>{slotLabel(s)}</option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <Field label="Anything we should know? (optional)">
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} className="w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm" />
                      </Field>

                      {/* Honeypot: hidden from people, tempting to bots. */}
                      <div className="absolute -left-[9999px]" aria-hidden>
                        <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
                      </div>

                      {formError && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
                      <Button type="submit" size="lg" className="w-full" disabled={busy}>
                        {busy ? "Booking..." : "Book appointment"}
                      </Button>
                      <p className="text-center text-xs text-[var(--muted)]">We will call you on the number above to confirm the time.</p>
                    </div>
                  </div>
                </form>
              </aside>
            </div>

            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--line)] bg-[var(--surface)] px-4 py-3 lg:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
              <div className="mx-auto flex max-w-6xl items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-display text-lg font-semibold tabular-nums">{rupees(total)}</div>
                  <div className="text-xs text-[var(--muted)]">{count === 0 ? "Nothing selected yet" : `${count} selected`}</div>
                </div>
                <Button type="button" onClick={jumpToSlip} disabled={count === 0}>Review and book</Button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Tick({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border-2", on ? "border-brand-600 bg-brand-600 text-white" : "border-slate-400 bg-white")}
    >
      {on && (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8.5l3.2 3L13 4.5" />
        </svg>
      )}
    </span>
  );
}

function Confirmation({ done, lab, onAgain }: { done: Done; lab: PortalCatalog["lab"]; onAgain: () => void }) {
  const when = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${done.date}T00:00:00Z`));
  return (
    <div className="mx-auto max-w-lg py-6">
      <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Booking received</h1>
        <p className="mt-2 text-[var(--muted)]">
          We will call {done.phone} to confirm. Please keep this reference handy.
        </p>
        <div className="my-5 rounded-md border-2 border-dashed border-[var(--line)] px-4 py-4 text-center">
          <div className="text-sm text-[var(--muted)]">Booking reference</div>
          <div className="font-display text-3xl font-semibold tracking-wide tabular-nums" aria-label={`Booking reference ${done.reference}`}>{done.reference}</div>
        </div>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-[var(--muted)]">When</dt><dd className="text-right">{when}, {slotLabel(done.slot)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-[var(--muted)]">Where</dt><dd className="text-right">{done.visit === "HOME" ? "Home collection" : lab.address || "At the lab"}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-[var(--muted)]">To pay</dt><dd className="text-right font-medium">{rupees(done.total)} at the lab or at your door</dd></div>
        </dl>
        {done.visit === "LAB" && <p className="mt-4 text-sm text-[var(--muted)]">Tests marked "Fasting needed" have preparation rules. We will tell you what to do when we call.</p>}
        <Button variant="secondary" className="mt-6 w-full" onClick={onAgain}>Make another booking</Button>
      </div>
    </div>
  );
}
