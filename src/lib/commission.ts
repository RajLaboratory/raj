import { percentOf } from "./money";

export type Rule = { scope: "DEFAULT" | "TEST" | "PACKAGE" | "DEPARTMENT"; refId: string | null; type: "PERCENT" | "FIXED"; value: number; isActive?: boolean };
export type DoctorDefault = { type: "PERCENT" | "FIXED"; value: number };
export type CommissionLine = { testId?: string | null; packageId?: string | null; departmentId?: string | null; netPrice: number };
export type CommissionResult = { scope: Rule["scope"]; type: "PERCENT" | "FIXED"; value: number; amount: number };

/**
 * Priority: TEST > PACKAGE > DEPARTMENT > doctor rule DEFAULT > doctor default fields.
 * Commission is computed on the net price (after discount). Fixed commission never exceeds the net price.
 * The result is snapshotted on the order item at invoice issue, so later rule edits never rewrite history.
 */
export function resolveCommission(line: CommissionLine, rules: Rule[], doctorDefault: DoctorDefault): CommissionResult {
  const active = rules.filter((r) => r.isActive !== false);
  const pick =
    (line.testId && active.find((r) => r.scope === "TEST" && r.refId === line.testId)) ||
    (line.packageId && active.find((r) => r.scope === "PACKAGE" && r.refId === line.packageId)) ||
    (line.departmentId && active.find((r) => r.scope === "DEPARTMENT" && r.refId === line.departmentId)) ||
    active.find((r) => r.scope === "DEFAULT") ||
    null;
  const rule = pick ?? { scope: "DEFAULT" as const, type: doctorDefault.type, value: doctorDefault.value };
  const raw = rule.type === "PERCENT" ? percentOf(line.netPrice, rule.value) : rule.value;
  return { scope: rule.scope, type: rule.type, value: rule.value, amount: Math.max(0, Math.min(raw, line.netPrice)) };
}
