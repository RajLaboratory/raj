import type { Tx } from "./db";
import { basePrisma } from "./db";

export type NumberType =
  | "PATIENT" | "ORDER" | "INVOICE" | "SAMPLE" | "REPORT"
  | "RECEIPT" | "REFUND" | "CREDIT_NOTE" | "PO" | "BOOKING";

export type NumberFormat = { prefix: string; digits: number; yearlyReset: boolean };

export const DEFAULT_FORMATS: Record<NumberType, NumberFormat> = {
  PATIENT: { prefix: "RL", digits: 6, yearlyReset: true },
  ORDER: { prefix: "ORD", digits: 6, yearlyReset: true },
  INVOICE: { prefix: "INV", digits: 6, yearlyReset: true },
  SAMPLE: { prefix: "SMP", digits: 6, yearlyReset: true },
  REPORT: { prefix: "RPT", digits: 6, yearlyReset: true },
  RECEIPT: { prefix: "RCT", digits: 6, yearlyReset: true },
  REFUND: { prefix: "RFD", digits: 6, yearlyReset: true },
  CREDIT_NOTE: { prefix: "CN", digits: 6, yearlyReset: true },
  PO: { prefix: "PO", digits: 6, yearlyReset: true },
  BOOKING: { prefix: "BK", digits: 6, yearlyReset: true },
};

/** Pure formatter, e.g. RL-2026-000001 (or RL-000001 when the year is not part of the number). */
export function formatNumber(fmt: NumberFormat, year: number, seq: number): string {
  const padded = String(seq).padStart(fmt.digits, "0");
  return fmt.yearlyReset ? `${fmt.prefix}-${year}-${padded}` : `${fmt.prefix}-${padded}`;
}

/**
 * Atomically allocates the next number. A single INSERT ... ON CONFLICT DO UPDATE
 * takes a row lock, so concurrent requests can never receive the same number.
 * Must be called with the same tx as the record being created, so a rollback also
 * rolls back the allocation (no gaps caused by failed saves).
 */
export async function nextNumber(
  tx: Tx | typeof basePrisma,
  branchId: string,
  type: NumberType,
  now = new Date(),
): Promise<string> {
  const setting = await tx.setting.findUnique({
    where: { branchId_key: { branchId, key: `numbering.${type}` } },
  });
  const fmt: NumberFormat = { ...DEFAULT_FORMATS[type], ...((setting?.value as Partial<NumberFormat>) ?? {}) };
  const year = now.getFullYear();
  const seqYear = fmt.yearlyReset ? year : 0;

  const rows = await tx.$queryRaw<{ current: number }[]>`
    INSERT INTO "NumberSequence" ("id", "branchId", "type", "year", "current")
    VALUES (gen_random_uuid()::text, ${branchId}, ${type}, ${seqYear}, 1)
    ON CONFLICT ("branchId", "type", "year")
    DO UPDATE SET "current" = "NumberSequence"."current" + 1
    RETURNING "current"`;
  return formatNumber(fmt, year, rows[0].current);
}
