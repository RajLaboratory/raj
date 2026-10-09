import { PrismaClient, type Prisma } from "@prisma/client";
import { AsyncLocalStorage } from "node:async_hooks";

/** Per-request context used by the audit layer. */
export type RequestContext = {
  userId?: string;
  userName?: string;
  branchId?: string;
  ip?: string;
  userAgent?: string;
};
export const requestContext = new AsyncLocalStorage<RequestContext>();

// Models whose writes are audited automatically (before/after snapshots).
const AUDITED = new Set([
  "User", "Role", "Setting", "Patient", "Doctor", "CommissionRule", "Department", "Test",
  "TestParameter", "TestReferenceRange", "Package", "Order", "OrderItem", "Invoice",
  "Result", "Report", "ReportTemplate", "OutsourcingLab", "OutsourcingOrder",
  "HomeCollectionBooking", "OnlineBooking", "OutsourcingRate", "InventoryItem", "Supplier", "PurchaseOrder",
]);

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const toJson = (v: unknown) => (v == null ? undefined : JSON.parse(JSON.stringify(v)));

const globalForPrisma = globalThis as unknown as { base?: PrismaClient };
export const basePrisma = globalForPrisma.base ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.base = basePrisma;

/**
 * Extended client: create / update / delete on audited models run in one transaction
 * together with their audit row, so a change can never exist without its audit trail.
 * NOTE: inside an interactive $transaction, use `auditTx()` explicitly (see audit.ts).
 */
export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async create({ model, args, query }) {
        if (!AUDITED.has(model)) return query(args);
        return basePrisma.$transaction(async (tx) => {
          const created = await (tx as any)[lowerFirst(model)].create(args);
          await writeAudit(tx as any, "CREATE", model, created.id, null, created);
          return created;
        });
      },
      async update({ model, args, query }) {
        if (!AUDITED.has(model)) return query(args);
        return basePrisma.$transaction(async (tx) => {
          const delegate = (tx as any)[lowerFirst(model)];
          const before = await delegate.findUnique({ where: args.where });
          const updated = await delegate.update(args);
          await writeAudit(tx as any, "UPDATE", model, updated.id, before, updated);
          return updated;
        });
      },
      async delete({ model, args, query }) {
        if (!AUDITED.has(model)) return query(args);
        return basePrisma.$transaction(async (tx) => {
          const delegate = (tx as any)[lowerFirst(model)];
          const before = await delegate.findUnique({ where: args.where });
          const removed = await delegate.delete(args);
          await writeAudit(tx as any, "DELETE", model, removed.id, before, null);
          return removed;
        });
      },
    },
  },
});

export async function writeAudit(
  tx: Pick<PrismaClient, "auditLog">,
  action: string,
  entity: string,
  entityId: string | null,
  before: unknown,
  after: unknown,
  reason?: string,
) {
  const ctx = requestContext.getStore();
  await tx.auditLog.create({
    data: {
      branchId: ctx?.branchId,
      userId: ctx?.userId,
      userName: ctx?.userName,
      action,
      entity,
      entityId: entityId ?? undefined,
      before: toJson(before),
      after: toJson(after),
      reason,
      ip: ctx?.ip,
      userAgent: ctx?.userAgent,
    },
  });
}

export type Tx = Prisma.TransactionClient;
