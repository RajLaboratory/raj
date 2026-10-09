import { z } from "zod";
import { handle } from "@/lib/api";
import { prisma, basePrisma } from "@/lib/db";
import { HttpError } from "@/lib/rbac";

// One row per test. price + tatHours set = offered; price null = not offered (any existing rate is switched off, never deleted).
const schema = z.object({
  rows: z
    .array(
      z.object({
        testId: z.string().max(40),
        price: z.number().int().min(1, "Price must be more than zero").max(100_000_000).nullable(), // paise
        tatHours: z.number().int().min(1, "Report time must be at least 1 hour").max(720).nullable(),
      }),
    )
    .max(1000),
});

export const PUT = (req: Request, { params }: { params: { id: string } }) =>
  handle(req, "outsource.manage", async ({ user }) => {
    const { rows } = schema.parse(await req.json());
    const lab = await basePrisma.outsourcingLab.findFirst({ where: { id: params.id, branchId: user.branchId, deletedAt: null } });
    if (!lab) throw new HttpError(404, "Lab not found", "NOT_FOUND");
    for (const r of rows) if (r.price != null && r.tatHours == null) throw new HttpError(422, "Enter a report time for every test that has a price", "VALIDATION");

    const tests = await basePrisma.test.findMany({
      where: { id: { in: rows.map((r) => r.testId) }, branchId: user.branchId, deletedAt: null },
      select: { id: true },
    });
    const valid = new Set(tests.map((t) => t.id));
    const existing = await basePrisma.outsourcingRate.findMany({ where: { labId: lab.id } });
    const byTest = new Map(existing.map((e) => [e.testId, e]));

    let saved = 0;
    for (const r of rows) {
      if (!valid.has(r.testId)) continue;
      const cur = byTest.get(r.testId);
      if (r.price == null) {
        if (cur?.isActive) { await prisma.outsourcingRate.update({ where: { id: cur.id }, data: { isActive: false } }); saved++; }
        continue;
      }
      if (!cur) { await prisma.outsourcingRate.create({ data: { labId: lab.id, testId: r.testId, price: r.price, tatHours: r.tatHours! } }); saved++; }
      else if (cur.price !== r.price || cur.tatHours !== r.tatHours || !cur.isActive) {
        await prisma.outsourcingRate.update({ where: { id: cur.id }, data: { price: r.price, tatHours: r.tatHours!, isActive: true } });
        saved++;
      }
    }
    return { saved };
  });
