import { NextResponse } from "next/server";
import { z } from "zod";
import { login } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

const body = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const { email, password } = body.parse(await req.json());
    const result = await login(email, password);
    if (!result.ok) return NextResponse.json({ error: { code: "LOGIN_FAILED", message: result.message } }, { status: 401 });
    return NextResponse.json({ data: { ok: true } });
  } catch (e) {
    return errorResponse(e);
  }
}
