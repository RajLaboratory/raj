import { z } from "zod";
import { handle } from "@/lib/api";
import { prisma, basePrisma } from "@/lib/db";
import { HttpError } from "@/lib/rbac";

const schema = z.object({ status: z.enum(["CONFIRMED", "COMPLETED", "CANCELLED"]) });

// Allowed moves: PENDING -> CONFIRMED | CANCELLED, CONFIRMED -> COMPLETED | CANCELLED.
const NEXT: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const PATCH = (req: Request, { params }: { params: { id: string } }) =>
  handle(req, "order.create", async ({ user }) => {
    const { status } = schema.parse(await req.json());
    const row = await basePrisma.onlineBooking.findFirst({ where: { id: params.id, branchId: user.branchId } });
    if (!row) throw new HttpError(404, "Booking not found", "NOT_FOUND");
    if (!NEXT[row.status].includes(status)) throw new HttpError(409, `A ${row.status.toLowerCase()} booking cannot be set to ${status.toLowerCase()}`, "BAD_STATE");
    const updated = await prisma.onlineBooking.update({ where: { id: row.id }, data: { status } });
    return { id: updated.id, status: updated.status };
  });
