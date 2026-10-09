import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { hash, verify } from "@node-rs/argon2";
import { basePrisma } from "./db";
import type { AuthUser } from "./rbac";
import type { PermissionKey } from "./permissions";

export const SESSION_COOKIE = "raj_session";
const idleMs = () => Number(process.env.SESSION_IDLE_MINUTES ?? 30) * 60_000;
const maxMs = () => Number(process.env.SESSION_MAX_HOURS ?? 12) * 3_600_000;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

let dummyHash: Promise<string> | undefined;
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export const hashPassword = (pw: string) =>
  hash(pw, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
export const verifyPassword = (hashed: string, pw: string) => verify(hashed, pw).catch(() => false);

export function validatePasswordStrength(pw: string): string | null {
  if (pw.length < 10) return "Use at least 10 characters";
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw)) return "Use upper case, lower case and a number";
  return null;
}

export function clientInfo() {
  const h = headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? undefined,
    userAgent: h.get("user-agent") ?? undefined,
  };
}

export type LoginResult =
  | { ok: true }
  | { ok: false; message: string };

export async function login(email: string, password: string): Promise<LoginResult> {
  const { ip, userAgent } = clientInfo();
  const normalized = email.trim().toLowerCase();
  const user = await basePrisma.user.findUnique({ where: { email: normalized } });
  const fail = async (reason: string, message = "Incorrect email or password") => {
    await basePrisma.loginActivity.create({ data: { userId: user?.id, email: normalized, success: false, reason, ip, userAgent } });
    return { ok: false as const, message };
  };

  if (!user || user.deletedAt || !user.isActive) {
    // Still spend hashing time so response timing does not reveal whether the email exists.
    dummyHash ??= hashPassword("timing-equaliser-not-a-real-password");
    await verifyPassword(await dummyHash, password);
    return fail("UNKNOWN_OR_INACTIVE");
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return fail("LOCKED", "Too many attempts. Try again in a few minutes.");
  }
  if (!(await verifyPassword(user.passwordHash, password))) {
    const failed = user.failedLogins + 1;
    await basePrisma.user.update({
      where: { id: user.id },
      data: failed >= MAX_FAILED
        ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) }
        : { failedLogins: failed },
    });
    return fail("BAD_PASSWORD");
  }

  const token = randomBytes(32).toString("base64url");
  await basePrisma.$transaction([
    basePrisma.session.create({
      data: { userId: user.id, tokenHash: sha256(token), ip, userAgent, expiresAt: new Date(Date.now() + maxMs()) },
    }),
    basePrisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } }),
    basePrisma.loginActivity.create({ data: { userId: user.id, email: normalized, success: true, ip, userAgent } }),
    basePrisma.auditLog.create({ data: { branchId: user.branchId, userId: user.id, userName: user.name, action: "LOGIN", entity: "Session", ip, userAgent } }),
  ]);

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(maxMs() / 1000),
  });
  return { ok: true };
}

export async function logout() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    await basePrisma.session.updateMany({ where: { tokenHash: sha256(token), revokedAt: null }, data: { revokedAt: new Date() } });
  }
  cookies().delete(SESSION_COOKIE);
}

/** Resolves the signed-in user, enforcing idle timeout and absolute expiry. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await basePrisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
  });
  const now = Date.now();
  if (
    !session || session.revokedAt || session.expiresAt.getTime() < now ||
    now - session.lastSeenAt.getTime() > idleMs() ||
    !session.user.isActive || session.user.deletedAt
  ) return null;

  // Touch at most once a minute to avoid a write on every request.
  if (now - session.lastSeenAt.getTime() > 60_000) {
    await basePrisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
  }
  const u = session.user;
  return {
    id: u.id, name: u.name, email: u.email, branchId: u.branchId,
    roleKey: u.role.key, roleName: u.role.name,
    permissions: new Set(u.role.permissions.map((rp) => rp.permission.key as PermissionKey)),
  };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
