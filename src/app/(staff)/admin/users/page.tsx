import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { basePrisma } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";

// Read-only in Phase 1. Create / edit / role-permission editing lands with the admin CRUD in Phase 2.
export default async function UsersPage() {
  const user = await requireUser();
  assertCan(user, "user.manage");
  const [users, roles] = await Promise.all([
    basePrisma.user.findMany({ where: { branchId: user.branchId, deletedAt: null }, include: { role: true }, orderBy: { name: "asc" } }),
    basePrisma.role.findMany({ include: { _count: { select: { permissions: true, users: true } } }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Users and roles</h1>
      <section className="overflow-x-auto rounded-lg border border-[var(--line)] bg-[var(--surface)]">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[var(--muted)]"><th className="p-3">Name</th><th>Email</th><th>Role</th><th>Last sign-in</th><th>Status</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-[var(--line)]">
                <td className="p-3">{u.name}</td><td>{u.email}</td><td>{u.role.name}</td>
                <td>{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</td>
                <td>{u.isActive ? "Active" : "Inactive"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="overflow-x-auto rounded-lg border border-[var(--line)] bg-[var(--surface)]">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[var(--muted)]"><th className="p-3">Role</th><th>Permissions</th><th>Users</th></tr></thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id} className="border-t border-[var(--line)]">
                <td className="p-3">{r.name}</td><td>{r._count.permissions}</td><td>{r._count.users}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
