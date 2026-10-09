import type { PermissionKey } from "@/lib/permissions";

export type NavItem = { href: string; label: string; perm?: PermissionKey; anyOf?: PermissionKey[] };

// Items are added here as each phase ships.
export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/bookings", label: "Online bookings", perm: "order.view" },
  { href: "/admin/labs", label: "Partner labs", perm: "outsource.manage" },
  { href: "/settings", label: "Settings", perm: "settings.manage" },
  { href: "/admin/users", label: "Users and roles", perm: "user.manage" },
  { href: "/admin/audit", label: "Audit log", perm: "audit.view" },
];
