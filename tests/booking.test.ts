import { describe, it, expect } from "vitest";
import { priceSelection, effectivePrice, isUnknownChoice, normalizePhone, isBookableDate, isSlotOpen, addDays, istDateString, slotLabel, MAX_DAYS_AHEAD } from "../src/lib/booking";

const bhatt = { labId: "L1", labName: "Bhatt Laboratory", price: 30000, tatHours: 24 };
const metro = { labId: "L2", labName: "Metropolis", price: 38000, tatHours: 12 };
const catalog = {
  tests: [
    { id: "t1", code: "CBC", name: "CBC", price: 35000, discountPrice: null, tatHours: 4, rates: [bhatt, metro] },
    { id: "t2", code: "FBS", name: "Fasting Sugar", price: 10000, discountPrice: 8000 },
    { id: "t3", code: "TSH", name: "TSH", price: 40000, discountPrice: 45000 }, // bad discount (higher): ignored
  ],
  packages: [{ id: "p1", code: "PKG", name: "Basic Checkup", price: 90000, testIds: ["t1", "t2"] }],
};
const pick = (...ids: string[]) => ids.map((id) => ({ id }));

describe("booking price", () => {
  it("uses the discount only when it is lower than the list price", () => {
    expect(effectivePrice(catalog.tests[1])).toBe(8000);
    expect(effectivePrice(catalog.tests[2])).toBe(40000);
    expect(effectivePrice(catalog.tests[0])).toBe(35000);
  });
  it("sums tests", () => expect(priceSelection(catalog, { packageIds: [], tests: pick("t1", "t2") }).total).toBe(43000));
  it("does not charge a test twice when its package is selected", () => {
    const r = priceSelection(catalog, { packageIds: ["p1"], tests: pick("t1", "t3") });
    expect(r.total).toBe(90000 + 40000);
    expect(r.lines.find((l) => l.id === "t1")).toMatchObject({ amount: 0, coveredBy: "Basic Checkup" });
  });
  it("ignores unknown ids", () => expect(priceSelection(catalog, { packageIds: ["x"], tests: pick("y") }).total).toBe(0));
});

describe("partner labs", () => {
  it("charges the partner lab's own price and records its name and report time", () => {
    const r = priceSelection(catalog, { packageIds: [], tests: [{ id: "t1", labId: "L1" }] });
    expect(r.total).toBe(30000);
    expect(r.lines[0]).toMatchObject({ labId: "L1", labName: "Bhatt Laboratory", tatHours: 24, amount: 30000 });
  });
  it("uses Raj Laboratory's price and report time when no lab is chosen", () => {
    const r = priceSelection(catalog, { packageIds: [], tests: [{ id: "t1", labId: null }] });
    expect(r.lines[0]).toMatchObject({ amount: 35000, tatHours: 4 });
    expect(r.lines[0].labId).toBeUndefined();
  });
  it("lets different tests use different labs", () => {
    expect(priceSelection(catalog, { packageIds: [], tests: [{ id: "t1", labId: "L2" }, { id: "t2" }] }).total).toBe(38000 + 8000);
  });
  it("ignores a lab that does not offer the test", () => {
    expect(isUnknownChoice(catalog.tests[1], { id: "t2", labId: "L1" })).toBe(true);
    expect(priceSelection(catalog, { packageIds: [], tests: [{ id: "t2", labId: "L1" }] }).lines).toHaveLength(0);
  });
  it("keeps a package test in-house even if a partner lab was picked", () => {
    const r = priceSelection(catalog, { packageIds: ["p1"], tests: [{ id: "t1", labId: "L1" }] });
    expect(r.total).toBe(90000);
    expect(r.lines.find((l) => l.id === "t1")?.labId).toBeUndefined();
  });
});

describe("phone", () => {
  it.each([["98765 43210", "9876543210"], ["+91 98765-43210", "9876543210"], ["09876543210", "9876543210"], ["919876543210", "9876543210"]])("accepts %s", (i, o) => expect(normalizePhone(i)).toBe(o));
  it.each(["12345", "5876543210", "98765432", "abcdefghij"])("rejects %s", (i) => expect(normalizePhone(i)).toBeNull());
});

describe("dates and slots", () => {
  const now = new Date("2026-10-09T08:00:00Z"); // 13:30 in India
  it("computes the Indian date", () => {
    expect(istDateString(now)).toBe("2026-10-09");
    expect(istDateString(new Date("2026-10-09T19:00:00Z"))).toBe("2026-10-10"); // 00:30 next day IST
  });
  it("accepts today up to the booking window and rejects the rest", () => {
    expect(isBookableDate("2026-10-09", now)).toBe(true);
    expect(isBookableDate(addDays("2026-10-09", MAX_DAYS_AHEAD), now)).toBe(true);
    expect(isBookableDate(addDays("2026-10-09", MAX_DAYS_AHEAD + 1), now)).toBe(false);
    expect(isBookableDate("2026-10-08", now)).toBe(false);
    expect(isBookableDate("2026-02-30", now)).toBe(false);
    expect(isBookableDate("tomorrow", now)).toBe(false);
  });
  it("closes slots that have started today but not on later days", () => {
    expect(isSlotOpen("2026-10-09", "11:00-13:00", now)).toBe(false);
    expect(isSlotOpen("2026-10-09", "16:00-18:00", now)).toBe(true);
    expect(isSlotOpen("2026-10-10", "07:00-09:00", now)).toBe(true);
    expect(isSlotOpen("2026-10-10", "03:00-05:00", now)).toBe(false);
  });
  it("labels slots in plain words", () => {
    expect(slotLabel("07:00-09:00")).toBe("7 am to 9 am");
    expect(slotLabel("11:00-13:00")).toBe("11 am to 1 pm");
  });
});
