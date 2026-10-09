import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { basePrisma } from "@/lib/db";
import { LabForm } from "./lab-form";

export default async function PartnerLabsPage() {
  const user = await requireUser();
  assertCan(user, "outsource.manage");
  const labs = await basePrisma.outsourcingLab.findMany({
    where: { branchId: user.branchId, deletedAt: null },
    orderBy: { name: "asc" },
    include: { _count: { select: { rates: { where: { isActive: true } } } } },
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Partner labs</h1>
        <p className="text-sm text-[var(--muted)]">
          Labs you work with in Rajkot. For each lab, set the price and report time per test. Patients then see every lab on the booking page and choose.
        </p>
      </div>
      <section className="overflow-x-auto rounded-lg border border-[var(--line)] bg-[var(--surface)]">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[var(--muted)]"><th className="p-3">Lab</th><th>Phone</th><th>Tests with a price</th><th>On booking page</th><th /></tr></thead>
          <tbody>
            {labs.map((l) => (
              <tr key={l.id} className="border-t border-[var(--line)]">
                <td className="p-3 font-medium">{l.name}</td>
                <td>{l.phone ?? ""}</td>
                <td className="tabular-nums">{l._count.rates}</td>
                <td>{l.isActive ? "Shown" : "Hidden"}</td>
                <td className="p-3 text-right"><Link href={`/admin/labs/${l.id}`} className="font-medium text-brand-700 underline">Set prices</Link></td>
              </tr>
            ))}
            {labs.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-[var(--muted)]">No partner labs yet. Add your first one below.</td></tr>}
          </tbody>
        </table>
      </section>
      <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
        <h2 className="mb-3 font-semibold">Add a partner lab</h2>
        <LabForm />
      </section>
    </div>
  );
}
