import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser, clientInfo } from "./auth";
import { requestContext } from "./db";
import { HttpError, assertCan, type AuthUser } from "./rbac";
import type { PermissionKey } from "./permissions";

type Handler<T> = (ctx: { user: AuthUser; req: Request }) => Promise<T>;

/** Wraps a route handler: auth, permission check, audit context, uniform error shape. */
export async function handle<T>(req: Request, perm: PermissionKey | null, fn: Handler<T>) {
  try {
    const user = await getCurrentUser();
    if (perm) assertCan(user, perm);
    else if (!user) throw new HttpError(401, "Please sign in", "UNAUTHENTICATED");
    const { ip, userAgent } = clientInfo();
    const data = await requestContext.run(
      { userId: user!.id, userName: user!.name, branchId: user!.branchId, ip, userAgent },
      () => fn({ user: user!, req }),
    );
    return NextResponse.json({ data });
  } catch (e) {
    return errorResponse(e);
  }
}

export function errorResponse(e: unknown) {
  if (e instanceof HttpError) return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: e.status });
  if (e instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Check the highlighted fields", fields: e.flatten().fieldErrors } },
      { status: 422 },
    );
  }
  console.error(e);
  return NextResponse.json({ error: { code: "INTERNAL", message: "Something went wrong. Try again." } }, { status: 500 });
}
