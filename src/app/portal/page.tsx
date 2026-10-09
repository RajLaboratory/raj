import { basePrisma } from "@/lib/db";
import { getLabProfile } from "@/lib/settings";
import { effectivePrice } from "@/lib/booking";
import { BookingApp, type PortalCatalog } from "./booking-app";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const branch = await basePrisma.branch.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
  if (!branch) {
    return <main className="mx-auto max-w-xl px-4 py-24 text-center">Booking is not available right now. Please call the lab.</main>;
  }
  const [lab, departments, packages] = await Promise.all([
    getLabProfile(branch.id),
    basePrisma.department.findMany({
      where: { branchId: branch.id, isActive: true, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        tests: {
          where: { isActive: true, deletedAt: null },
          orderBy: { name: "asc" },
          select: {
            id: true, code: true, name: true, sampleType: true, fastingRequired: true, patientPrep: true, tatHours: true, price: true, discountPrice: true,
            outsourcingRates: {
              where: { isActive: true, lab: { isActive: true, deletedAt: null, branchId: branch.id } },
              orderBy: { price: "asc" },
              select: { labId: true, price: true, tatHours: true, lab: { select: { name: true } } },
            },
          },
        },
      },
    }),
    basePrisma.package.findMany({
      where: { branchId: branch.id, isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      include: { tests: { select: { test: { select: { id: true, name: true } } } } },
    }),
  ]);

  const catalog: PortalCatalog = {
    lab: { name: lab.name, phone: lab.phone, address: lab.address },
    departments: departments
      .filter((d) => d.tests.length > 0)
      .map((d) => ({
        id: d.id,
        name: d.name,
        tests: d.tests.map((t) => ({
          id: t.id, code: t.code, name: t.name, sample: t.sampleType, fasting: t.fastingRequired,
          prep: t.patientPrep, tatHours: t.tatHours, price: t.price, discountPrice: t.discountPrice, pay: effectivePrice(t),
          rates: t.outsourcingRates.map((r) => ({ labId: r.labId, labName: r.lab.name, price: r.price, tatHours: r.tatHours })),
        })),
      })),
    packages: packages.map((p) => ({
      id: p.id, code: p.code, name: p.name, price: p.price,
      tests: p.tests.map((x) => ({ id: x.test.id, name: x.test.name })),
    })),
  };
  return <BookingApp catalog={catalog} />;
}
