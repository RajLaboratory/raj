import type { PermissionKey } from "./permissions";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  branchId: string;
  roleKey: string;
  roleName: string;
  permissions: ReadonlySet<PermissionKey>;
};

export const can = (user: AuthUser | null | undefined, perm: PermissionKey): boolean =>
  !!user && user.permissions.has(perm);

export const canAny = (user: AuthUser | null | undefined, perms: PermissionKey[]): boolean =>
  perms.some((p) => can(user, p));

export class HttpError extends Error {
  constructor(public status: number, message: string, public code = "ERROR") {
    super(message);
  }
}

export function assertCan(user: AuthUser | null | undefined, perm: PermissionKey): asserts user is AuthUser {
  if (!user) throw new HttpError(401, "Please sign in", "UNAUTHENTICATED");
  if (!can(user, perm)) throw new HttpError(403, "You do not have permission to do this", "FORBIDDEN");
}
