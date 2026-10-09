import { requireUser } from "@/lib/auth";
import { basePrisma } from "@/lib/db";
import { startOfTodayIST } from "@/lib/dates";
import { formatINR } from "@/lib/money";

// Phase 1 shows the counters that can be computed from the current schema.
// The full dashboard (charts, collection split, commission) ships in Phase 6.
export default async function Dashboard() {
  const user = await requireUser();
  const since = startOfTodayIST();
  const where = { branchId: user.branchId, createdAt: { gte: since } };
  const [patients, orders, pendingItems, payments] = await Promise.all([
    basePrisma.patient.count({ where: { ...where, deletedAt: null } }),
    basePrisma.order.count({ where: { ...where, deletedAt: null } }),
    basePrisma.orderItem.count({
      where: { order: { branchId: user.branchId, deletedAt: null }, status: { notIn: ["APPROVED", "REPORTED", "DELIVERED", "CANCELLED"] } },
    }),
    basePrisma.payment.aggregate({
      _sum: { amount: true },
      where: { receivedAt: { gte: since }, invoice: { branchId: user.branchId } },
    }),
  ]);

  const cards = [
    { label: "New patients today", value: String(patients) },
    { label: "Orders today", value: String(orders) },
    { label: "Tests in progress", value: String(pendingItems) },
    { label: "Collected today", value: formatINR(payments._sum.amount ?? 0) },
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Today at Raj Laboratory</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="text-sm text-[var(--muted)]">{c.label}</div>
            <div className="mt-2 text-3xl font-semibold tabular-nums">{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
