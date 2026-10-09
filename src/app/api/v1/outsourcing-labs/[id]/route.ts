import { z } from "zod";
import { handle } from "@/lib/api";
import { prisma, basePrisma } from "@/lib/db";
import { HttpError } from "@/lib/rbac";

const schema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(300).optional(),
  isActive: z.boolean().optional(),
});

export const PATCH = (req: Request, { params }: { params: { id: string } }) =>
  handle(req, "outsource.manage", async ({ user }) => {
    const body = schema.parse(await req.json());
    const lab = await basePrisma.outsourcingLab.findFirst({ where: { id: params.id, branchId: user.branchId, deletedAt: null } });
    if (!lab) throw new HttpError(404, "Lab not found", "NOT_FOUND");
    await prisma.outsourcingLab.update({
      where: { id: lab.id },
      data: { ...body, phone: body.phone === undefined ? undefined : body.phone || null, address: body.address === undefined ? undefined : body.address || null },
    });
    return { id: lab.id };
  });
