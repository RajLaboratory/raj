import { NextResponse } from "next/server";
import { z } from "zod";
import { basePrisma, requestContext, writeAudit } from "@/lib/db";
import { clientInfo } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { HttpError } from "@/lib/rbac";
import { nextNumber } from "@/lib/numbering";
import {
  SLOTS, MAX_DAYS_AHEAD, normalizePhone, isBookableDate, isSlotOpen, priceSelection, effectivePrice, isUnknownChoice,
  type CatalogPackage, type CatalogTest, type TestChoice,
} from "@/lib/booking";

// Public endpoint: no sign-in. Everything is validated and priced on the server.

const bodySchema = z
  .object({
    name: z.string().trim().min(2, "Enter the patient's full name").max(80),
    phone: z.string().trim().min(1, "Enter a mobile number"),
    email: z.string().trim().email("Enter a valid email").or(z.literal("")).optional(),
    age: z.number().int().min(0).max(120).optional(),
    sex: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
    visitType: z.enum(["LAB", "HOME"]),
    address: z.string().trim().max(300).optional(),
    date: z.string(),
    slot: z.string(),
    notes: z.string().trim().max(500).optional(),
    packageIds: z.array(z.string().max(40)).max(10).default([]),
    tests: z.array(z.object({ id: z.string().max(40), labId: z.string().max(40).nullable().optional() })).max(40).default([]),
    website: z.string().optional(), // honeypot: real people never fill this in
  })
  .superRefine((v, ctx) => {
    if (!normalizePhone(v.phone)) ctx.addIssue({ code: "custom", path: ["phone"], message: "Enter a 10-digit mobile number" });
    if (!isBookableDate(v.date)) ctx.addIssue({ code: "custom", path: ["date"], message: `Pick a date within the next ${MAX_DAYS_AHEAD} days` });
    else if (!isSlotOpen(v.date, v.slot)) ctx.addIssue({ code: "custom", path: ["slot"], message: "Pick a time slot that has not started yet" });
    if (v.visitType === "HOME" && (v.address ?? "").trim().length < 10)
      ctx.addIssue({ code: "custom", path: ["address"], message: "Enter the full address for home collection" });
    if (v.packageIds.length + v.tests.length === 0)
      ctx.addIssue({ code: "custom", path: ["testIds"], message: "Choose at least one test or package" });
  });

// Small in-memory limiter. Good enough for one server; move to Redis if you run several.
const hits = new Map<string, number[]>();
const WINDOW_MS = 60 * 60_000;
const MAX_PER_WINDOW = 6;
function tooMany(key: string, now = Date.now()) {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) { hits.set(key, recent); return true; }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

export async function POST(req: Request) {
  try {
    const { ip, userAgent } = clientInfo();
    let json: unknown;
    try { json = await req.json(); } catch { throw new HttpError(400, "Invalid request", "BAD_REQUEST"); }
    const body = bodySchema.parse(json);

    if (body.website) return NextResponse.json({ data: { reference: "BK-0000", total: 0 } }); // bot: pretend success
    if (tooMany(ip ?? "unknown")) throw new HttpError(429, "Too many bookings from this device. Please call the lab to book.", "RATE_LIMITED");

    const branch = await basePrisma.branch.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
    if (!branch) throw new HttpError(503, "Booking is not available right now. Please call the lab.", "UNAVAILABLE");

    const packageIds = [...new Set(body.packageIds)];
    const choices: TestChoice[] = [...new Map<string, TestChoice>(body.tests.map((t): [string, TestChoice] => [t.id, { id: t.id, labId: t.labId || null }])).values()]; // one choice per test
    const testIds = choices.map((c) => c.id);
    const [tests, packages] = await Promise.all([
      basePrisma.test.findMany({
        where: { id: { in: testIds }, branchId: branch.id, isActive: true, deletedAt: null },
        select: {
          id: true, code: true, name: true, price: true, discountPrice: true, tatHours: true,
          outsourcingRates: {
            where: { isActive: true, lab: { isActive: true, deletedAt: null, branchId: branch.id } },
            select: { labId: true, price: true, tatHours: true, lab: { select: { name: true } } },
          },
        },
      }),
      basePrisma.package.findMany({ where: { id: { in: packageIds }, branchId: branch.id, isActive: true, deletedAt: null }, include: { tests: { select: { testId: true } } } }),
    ]);
    const catalogTests: CatalogTest[] = tests.map((t) => ({
      id: t.id, code: t.code, name: t.name, price: t.price, discountPrice: t.discountPrice, tatHours: t.tatHours,
      rates: t.outsourcingRates.map((r) => ({ labId: r.labId, labName: r.lab.name, price: r.price, tatHours: r.tatHours })),
    }));
    if (
      tests.length !== testIds.length || packages.length !== packageIds.length ||
      choices.some((c) => isUnknownChoice(catalogTests.find((t) => t.id === c.id), c))
    )
      throw new HttpError(409, "Some of the selected tests or labs are no longer available. Refresh the page and choose again.", "STALE_CATALOG");

    const catalog = {
      tests: catalogTests,
      packages: packages.map((p): CatalogPackage => ({ id: p.id, code: p.code, name: p.name, price: p.price, testIds: p.tests.map((t) => t.testId) })),
    };
    const { lines, total } = priceSelection(catalog, { packageIds, tests: choices });

    const booking = await requestContext.run({ ip, userAgent, branchId: branch.id, userName: "Online booking" }, () =>
      basePrisma.$transaction(async (tx) => {
        const reference = await nextNumber(tx, branch.id, "BOOKING");
        const created = await tx.onlineBooking.create({
          data: {
            branchId: branch.id,
            reference,
            name: body.name,
            phone: normalizePhone(body.phone)!,
            email: body.email || null,
            age: body.age ?? null,
            sex: body.sex ?? null,
            visitType: body.visitType,
            address: body.visitType === "HOME" ? body.address : null,
            preferredDate: new Date(`${body.date}T00:00:00.000Z`),
            slot: body.slot,
            notes: body.notes || null,
            items: JSON.parse(JSON.stringify(lines)),
            totalPaise: total,
            ip: ip ?? null,
          },
        });
        await writeAudit(tx, "CREATE", "OnlineBooking", created.id, null, created);
        return created;
      }),
    );

    return NextResponse.json({ data: { reference: booking.reference, total: booking.totalPaise } }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}

// Exposed for the unit tests / tooling only.
export const _internal = { effectivePrice, SLOTS };
