import { writeAudit, type Tx } from "./db";

/**
 * Use inside interactive transactions (where the auto-audit extension is not active):
 *   await basePrisma.$transaction(async (tx) => {
 *     const r = await tx.result.update(...);
 *     await auditTx(tx, "UPDATE", "Result", r.id, before, r, "correction");
 *   });
 */
export async function auditTx(
  tx: Tx,
  action: string,
  entity: string,
  entityId: string | null,
  before: unknown,
  after: unknown,
  reason?: string,
) {
  await writeAudit(tx, action, entity, entityId, before, after, reason);
}
