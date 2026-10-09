import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { basePrisma } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";

export default async function AuditPage({ searchParams }: { searchParams: { entity?: string; q?: string } }) {
  const user = await requireUser();
  assertCan(user, "audit.view");
  const rows = await basePrisma.auditLog.findMany({
    where: {
      branchId: user.branchId,
      ...(searchParams.entity ? { entity: searchParams.entity } : {}),
      ...(searchParams.q ? { OR: [{ userName: { contains: searchParams.q, mode: "insensitive" } }, { entityId: searchParams.q }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Audit log</h1>
      <form className="flex gap-2">
        <input name="q" defaultValue={searchParams.q} placeholder="User name or record ID" className="h-10 w-72 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm" />
        <input name="entity" defaultValue={searchParams.entity} placeholder="Record type, e.g. Patient" className="h-10 w-56 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm" />
        <button className="h-10 rounded-md bg-brand-600 px-4 text-sm font-medium text-white">Filter</button>
      </form>
      <div className="overflow-x-auto rounded-lg border border-[var(--line)] bg-[var(--surface)]">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[var(--muted)]"><th className="p-3">When</th><th>User</th><th>Action</th><th>Record</th><th>IP</th><th>Change</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[var(--line)] align-top">
                <td className="p-3 whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                <td>{r.userName ?? "System"}</td>
                <td>{r.action}</td>
                <td>{r.entity}<div className="text-xs text-[var(--muted)]">{r.entityId}</div></td>
                <td>{r.ip ?? ""}</td>
                <td>
                  {(r.before || r.after) && (
                    <details><summary className="cursor-pointer text-brand-700">View</summary>
                      <pre className="mt-2 max-w-md overflow-auto text-xs">{JSON.stringify({ before: r.before, after: r.after }, null, 2)}</pre>
                    </details>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-[var(--muted)]">No matching activity.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
