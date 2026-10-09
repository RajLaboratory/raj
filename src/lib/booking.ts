// Pure helpers for public test booking. No imports on purpose: used by the browser,
// the API route and the unit tests, so the price the patient sees is the price the server computes.

export const SLOTS = ["07:00-09:00", "09:00-11:00", "11:00-13:00", "16:00-18:00", "18:00-20:00"] as const;
export type Slot = (typeof SLOTS)[number];

/** How many days ahead a patient can book. */
export const MAX_DAYS_AHEAD = 30;

/** A partner lab that can process a test, with its own price and report time. */
export type LabOption = { labId: string; labName: string; price: number; tatHours: number };

export type CatalogTest = {
  id: string;
  code: string;
  name: string;
  price: number; // paise, when Raj Laboratory handles it
  discountPrice: number | null; // paise
  tatHours?: number; // report time when Raj Laboratory handles it
  rates?: LabOption[]; // partner labs offering this test
};
export type CatalogPackage = { id: string; code: string; name: string; price: number; testIds: string[] };

/** A test the patient picked. labId is null/absent for Raj Laboratory, or a partner lab id. */
export type TestChoice = { id: string; labId?: string | null };

export type BookingLine = {
  kind: "PACKAGE" | "TEST";
  id: string;
  code: string;
  name: string;
  /** Amount charged for this line, in paise. 0 when the test is already inside a selected package. */
  amount: number;
  coveredBy?: string;
  /** Set only when a partner lab processes the test. */
  labId?: string;
  labName?: string;
  tatHours?: number;
};

/** What the patient pays for a test: the discounted price when there is one, otherwise the list price. */
export const effectivePrice = (t: Pick<CatalogTest, "price" | "discountPrice">): number =>
  t.discountPrice != null && t.discountPrice >= 0 && t.discountPrice < t.price ? t.discountPrice : t.price;

/** True when the choice names a lab that does not offer the test (stale page, or a tampered request). */
export const isUnknownChoice = (t: CatalogTest | undefined, c: TestChoice): boolean =>
  !t || (!!c.labId && !(t.rates ?? []).some((r) => r.labId === c.labId));

/**
 * Prices a selection. A test that is already part of a selected package is listed but not charged twice,
 * and is always handled in-house. Unknown ids and labs are ignored here; the API rejects them first.
 */
export function priceSelection(
  catalog: { tests: CatalogTest[]; packages: CatalogPackage[] },
  selected: { packageIds: string[]; tests: TestChoice[] },
): { lines: BookingLine[]; total: number } {
  const pkgs = selected.packageIds
    .map((id) => catalog.packages.find((p) => p.id === id))
    .filter((p): p is CatalogPackage => !!p);
  const coveredBy = new Map<string, string>();
  for (const p of pkgs) for (const tid of p.testIds) if (!coveredBy.has(tid)) coveredBy.set(tid, p.name);

  const lines: BookingLine[] = pkgs.map((p) => ({ kind: "PACKAGE", id: p.id, code: p.code, name: p.name, amount: p.price }));
  for (const c of selected.tests) {
    const t = catalog.tests.find((x) => x.id === c.id);
    if (!t || isUnknownChoice(t, c)) continue;
    const cover = coveredBy.get(t.id);
    const rate = !cover && c.labId ? t.rates?.find((r) => r.labId === c.labId) : undefined;
    lines.push({
      kind: "TEST",
      id: t.id,
      code: t.code,
      name: t.name,
      amount: cover ? 0 : rate ? rate.price : effectivePrice(t),
      ...(cover ? { coveredBy: cover } : {}),
      ...(rate ? { labId: rate.labId, labName: rate.labName, tatHours: rate.tatHours } : t.tatHours != null ? { tatHours: t.tatHours } : {}),
    });
  }
  return { lines, total: lines.reduce((s, l) => s + l.amount, 0) };
}

/** Accepts 98765 43210, +91 98765-43210, 098765 43210 and returns 10 digits, or null if it is not an Indian mobile number. */
export function normalizePhone(input: string): string | null {
  let d = input.replace(/[\s\-().]/g, "");
  if (d.startsWith("+91")) d = d.slice(3);
  else if (d.startsWith("91") && d.length === 12) d = d.slice(2);
  else if (d.startsWith("0") && d.length === 11) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

/** Today's date in India as YYYY-MM-DD (IST = UTC+05:30, no daylight saving). */
export const istDateString = (now = new Date()): string => new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const isRealDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && addDays(s, 0) === s;

export function isBookableDate(date: string, now = new Date()): boolean {
  if (!isRealDate(date)) return false;
  const today = istDateString(now);
  return date >= today && date <= addDays(today, MAX_DAYS_AHEAD);
}

/** A slot is open if it is on a later day, or on today and starts after the current hour in India. */
export function isSlotOpen(date: string, slot: string, now = new Date()): boolean {
  if (!(SLOTS as readonly string[]).includes(slot)) return false;
  if (date !== istDateString(now)) return true;
  const startHour = Number(slot.slice(0, 2));
  const nowHour = new Date(now.getTime() + 330 * 60_000).getUTCHours();
  return startHour > nowHour;
}

export const slotLabel = (slot: string): string => {
  const [a, b] = slot.split("-");
  const h = (t: string) => {
    const n = Number(t.slice(0, 2));
    return `${n % 12 === 0 ? 12 : n % 12}${n >= 12 ? " pm" : " am"}`;
  };
  return `${h(a)} to ${h(b)}`;
};
