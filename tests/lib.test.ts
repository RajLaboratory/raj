import { describe, it, expect } from "vitest";
import { formatNumber, DEFAULT_FORMATS } from "../src/lib/numbering";
import { formatINR, percentOf, rupeesToPaise } from "../src/lib/money";
import { resolveCommission } from "../src/lib/commission";
import { startOfTodayIST } from "../src/lib/dates";
import { ALL_PERMISSIONS, DEFAULT_ROLES } from "../src/lib/permissions";
import { can, type AuthUser } from "../src/lib/rbac";

describe("numbering", () => {
  it("formats yearly numbers", () => expect(formatNumber(DEFAULT_FORMATS.PATIENT, 2026, 1)).toBe("RL-2026-000001"));
  it("formats non-resetting numbers", () =>
    expect(formatNumber({ prefix: "X", digits: 4, yearlyReset: false }, 2026, 42)).toBe("X-0042"));
});

describe("money", () => {
  it("formats Indian grouping", () => expect(formatINR(12345678)).toBe("₹1,23,456.78"));
  it("converts rupees to paise without float drift", () => expect(rupeesToPaise("19.99")).toBe(1999));
  it("computes the spec example: CBC ₹250 at 10% = ₹25", () => expect(percentOf(25000, 1000)).toBe(2500));
});

describe("commission", () => {
  const def = { type: "PERCENT" as const, value: 1000 };
  it("falls back to the doctor default", () =>
    expect(resolveCommission({ testId: "t1", netPrice: 25000 }, [], def).amount).toBe(2500));
  it("test rule beats department rule", () => {
    const r = resolveCommission(
      { testId: "t1", departmentId: "d1", netPrice: 10000 },
      [{ scope: "DEPARTMENT", refId: "d1", type: "PERCENT", value: 2000 }, { scope: "TEST", refId: "t1", type: "FIXED", value: 500 }],
      def,
    );
    expect(r).toMatchObject({ scope: "TEST", amount: 500 });
  });
  it("never exceeds net price and ignores inactive rules", () => {
    const r = resolveCommission({ testId: "t1", netPrice: 300 }, [{ scope: "TEST", refId: "t1", type: "FIXED", value: 9999, isActive: false }, { scope: "DEFAULT", refId: null, type: "FIXED", value: 9999 }], def);
    expect(r.amount).toBe(300);
  });
});

describe("dates", () => {
  it("start of day is IST midnight", () =>
    expect(startOfTodayIST(new Date("2026-03-10T20:00:00Z")).toISOString()).toBe("2026-03-10T18:30:00.000Z"));
});

describe("permissions", () => {
  it("entry operator cannot approve reports", () => expect(DEFAULT_ROLES.entry_operator.permissions).not.toContain("report.approve"));
  it("pathologist can approve", () => expect(DEFAULT_ROLES.pathologist.permissions).toContain("report.approve"));
  it("all role permissions are valid keys", () => {
    for (const r of Object.values(DEFAULT_ROLES)) for (const p of r.permissions) expect(ALL_PERMISSIONS).toContain(p);
  });
  it("can() reads the permission set", () => {
    const u = { permissions: new Set(["patient.view"]) } as unknown as AuthUser;
    expect(can(u, "patient.view")).toBe(true);
    expect(can(u, "report.approve")).toBe(false);
    expect(can(null, "patient.view")).toBe(false);
  });
});
