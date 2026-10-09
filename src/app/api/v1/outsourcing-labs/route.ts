import { z } from "zod";
import { handle } from "@/lib/api";
import { prisma, basePrisma } from "@/lib/db";

const labSchema = z.object({
  name: z.string().trim().min(2, "Enter the lab's name").max(100),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
});

export const POST = (req: Request) =>
  handle(req, "outsource.manage", async ({ user }) => {
    const body = labSchema.parse(await req.json());
    const count = await basePrisma.outsourcingLab.count({ where: { branchId: user.branchId } });
    // Short unique code like PL02. Skip codes that already exist (including removed labs).
    let n = count + 1;
    while (await basePrisma.outsourcingLab.findUnique({ where: { branchId_code: { branchId: user.branchId, code: `PL${String(n).padStart(2, "0")}` } } })) n++;
    const lab = await prisma.outsourcingLab.create({
      data: { branchId: user.branchId, code: `PL${String(n).padStart(2, "0")}`, name: body.name, phone: body.phone || null, address: body.address || null },
    });
    return { id: lab.id };
  });
