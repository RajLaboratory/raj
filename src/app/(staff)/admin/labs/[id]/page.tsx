import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { basePrisma } from "@/lib/db";
import { effectivePrice } from "@/lib/booking";
import { LabForm } from "../lab-form";
import { RateGrid, type RateRow } from "./rate-grid";

export default async function LabRatesPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  assertCan(user, "outsource.manage");
  const lab = await basePrisma.outsourcingLab.findFirst({ where: { id: params.id, branchId: user.branchId, deletedAt: null } });
  if (!lab) notFound();
  const [departments, rates] = await Promise.all([
    basePrisma.department.findMany({
      where: { branchId: user.branchId, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { tests: { where: { isActive: true, deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, code: true, price: true, discountPrice: true, tatHours: true } } },
    }),
    basePrisma.outsourcingRate.findMany({ where: { labId: lab.id, isActive: true } }),
  ]);
  const byTest = new Map(rates.map((r) => [r.testId, r]));
  const rows: RateRow[] = departments.flatMap((d) =>
    d.tests.map((t) => ({
      testId: t.id, name: t.name, code: t.code, department: d.name, ownPrice: effectivePrice(t), ownTat: t.tatHours,
      price: byTest.get(t.id) ? String(byTest.get(t.id)!.price / 100) : "", tat: byTest.get(t.id) ? String(byTest.get(t.id)!.tatHours) : "",
    })),
  );
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/labs" className="text-sm text-brand-700 underline">Back to partner labs</Link>
        <h1 className="mt-1 text-2xl font-semibold">{lab.name}</h1>
      </div>
      <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
        <h2 className="mb-3 font-semibold">Lab details</h2>
        <LabForm lab={{ id: lab.id, name: lab.name, phone: lab.phone, address: lab.address, isActive: lab.isActive }} />
      </section>
      <section className="space-y-3">
        <div>
          <h2 className="font-semibold">Prices and report times</h2>
          <p className="text-sm text-[var(--muted)]">
            Fill in the price the patient pays and the report time in hours, only for tests this lab does. Leave both blank for tests it does not do. Clear a row to stop offering that test.
          </p>
        </div>
        <RateGrid labId={lab.id} rows={rows} />
      </section>
    </div>
  );
}
