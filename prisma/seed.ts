import { PrismaClient, type Sex, type ResultType, type PaymentMethod } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { ALL_PERMISSIONS, DEFAULT_ROLES, PERMISSIONS, type RoleKey } from "../src/lib/permissions";
import { nextNumber } from "../src/lib/numbering";
import { resolveCommission } from "../src/lib/commission";
import { DEPARTMENTS, PACKAGES, TESTS } from "./seed-data";

const db = new PrismaClient();

// Deterministic pseudo-random so every seed run is identical.
let seedState = 20260;
const rnd = () => ((seedState = (seedState * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];

async function main() {
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe@123";
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@rajlab.local";
  const pwHash = await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });

  const branch = await db.branch.upsert({
    where: { code: "MAIN" },
    update: {},
    create: { code: "MAIN", name: "Raj Laboratory - Main", address: "Rajkot, Gujarat", phone: "0281-0000000", email: "info@rajlab.local" },
  });
  const branchId = branch.id;

  await db.setting.upsert({
    where: { branchId_key: { branchId, key: "lab.profile" } }, update: {},
    create: { branchId, key: "lab.profile", value: { name: "Raj Laboratory", address: "Rajkot, Gujarat", phone: "0281-0000000", email: "info@rajlab.local", website: "", gstin: "", license: "", reportFooter: "This report is electronically generated. Clinical correlation is advised.", signatory: "", gstEnabled: false } },
  });

  // Permissions and roles
  for (const [module, perms] of Object.entries(PERMISSIONS)) {
    for (const [key, description] of Object.entries(perms)) {
      await db.permission.upsert({ where: { key }, update: { module, description }, create: { key, module, description } });
    }
  }
  const permRows = await db.permission.findMany();
  const permId = new Map(permRows.map((p) => [p.key, p.id]));
  const roleId = new Map<string, string>();
  for (const [key, def] of Object.entries(DEFAULT_ROLES)) {
    const role = await db.role.upsert({ where: { key }, update: { name: def.name, description: def.description }, create: { key, name: def.name, description: def.description, isSystem: true } });
    roleId.set(key, role.id);
    await db.rolePermission.deleteMany({ where: { roleId: role.id } });
    await db.rolePermission.createMany({ data: def.permissions.map((p) => ({ roleId: role.id, permissionId: permId.get(p)! })) });
  }

  // Users: one admin plus one demo user per role
  await db.user.upsert({
    where: { email: adminEmail }, update: {},
    create: { branchId, roleId: roleId.get("super_admin")!, email: adminEmail, name: "Super Admin", passwordHash: pwHash },
  });
  const demoUsers: [RoleKey, string][] = [
    ["lab_owner", "Dr. Raj Owner"], ["reception", "Reception Desk"], ["phlebotomist", "Phlebotomist One"], ["lab_tech", "Lab Technician"],
    ["entry_operator", "Entry Operator"], ["pathologist", "Dr. Meera Pathologist"], ["outsourcing_manager", "Outsourcing Manager"],
    ["accountant", "Accountant"], ["home_collection", "Home Collection Staff"],
  ];
  for (const [rk, name] of demoUsers) {
    const email = `${rk.replace(/_/g, ".")}@rajlab.local`;
    const u = await db.user.upsert({ where: { email }, update: {}, create: { branchId, roleId: roleId.get(rk)!, email, name, passwordHash: pwHash, ...(rk === "pathologist" ? { qualification: "MD (Pathology)", registrationNo: "DEMO-0000" } : {}) } });
    if (rk === "home_collection" || rk === "phlebotomist") await db.phlebotomist.upsert({ where: { userId: u.id }, update: {}, create: { userId: u.id } });
  }

  // Departments, tests, parameters, ranges
  const deptId = new Map<string, string>();
  for (const [i, [code, name]] of DEPARTMENTS.entries()) {
    const d = await db.department.upsert({ where: { branchId_code: { branchId, code } }, update: {}, create: { branchId, code, name, sortOrder: i } });
    deptId.set(code, d.id);
  }
  const testId = new Map<string, string>();
  for (const t of TESTS) {
    const existing = await db.test.findUnique({ where: { branchId_code: { branchId, code: t.code } } });
    if (existing) { testId.set(t.code, existing.id); continue; }
    const created = await db.test.create({
      data: {
        branchId, departmentId: deptId.get(t.dept)!, code: t.code, name: t.name, shortName: t.code, category: DEPARTMENTS.find((d) => d[0] === t.dept)![1],
        sampleType: t.sample, container: t.container, fastingRequired: !!t.fasting, method: t.method, tatHours: t.tat,
        price: t.price, costPrice: t.cost, outsourcePrice: t.out, isOutsourced: !!t.out,
      },
    });
    testId.set(t.code, created.id);
    for (const [idx, p] of t.params.entries()) {
      const type = (p.type ?? "NUMERIC") as ResultType;
      const param = await db.testParameter.create({ data: { testId: created.id, code: p.c, name: p.n, unit: p.u, resultType: type, decimals: p.d ?? 1, sortOrder: idx } });
      const crit = p.crit ?? [null, null];
      const ranges: any[] = [];
      if (p.m) ranges.push({ sex: "MALE" as Sex, low: p.m[0], high: p.m[1], criticalLow: crit[0], criticalHigh: crit[1], displayText: `${p.m[0]} - ${p.m[1]}` });
      if (p.f) ranges.push({ sex: "FEMALE" as Sex, low: p.f[0], high: p.f[1], criticalLow: crit[0], criticalHigh: crit[1], displayText: `${p.f[0]} - ${p.f[1]}` });
      if (p.lo !== undefined && p.hi !== undefined) ranges.push({ low: p.lo, high: p.hi, criticalLow: crit[0], criticalHigh: crit[1], displayText: `${p.lo} - ${p.hi}` });
      if (p.text) ranges.push({ displayText: p.text, normalValues: [p.text] });
      if (ranges.length) await db.testReferenceRange.createMany({ data: ranges.map((r) => ({ parameterId: param.id, ...r })) });
    }
  }

  // Packages
  const pkgId = new Map<string, string>();
  for (const p of PACKAGES) {
    const pk = await db.package.upsert({ where: { branchId_code: { branchId, code: p.code } }, update: {}, create: { branchId, code: p.code, name: p.name, price: p.price } });
    pkgId.set(p.code, pk.id);
    await db.packageTest.createMany({ data: p.tests.map((c) => ({ packageId: pk.id, testId: testId.get(c)! })), skipDuplicates: true });
  }

  // Partner labs
  await db.outsourcingLab.upsert({ where: { branchId_code: { branchId, code: "PL01" } }, update: {}, create: { branchId, code: "PL01", name: "Demo Reference Laboratory", contactPerson: "Partner Contact", phone: "0000000000", email: "partner@example.com", reportingMethod: "Email" } });

  // Doctors + commission rules
  const doctors = [
    ["Dr. Amit Shah", "General Physician", "Shah Clinic", 1000], ["Dr. Neha Mehta", "Gynaecologist", "Mehta Women's Care", 1500],
    ["Dr. Ketan Patel", "Diabetologist", "Patel Diabetes Centre", 1200], ["Dr. Sunita Joshi", "Paediatrician", "Joshi Child Clinic", 1000],
    ["Dr. Rakesh Desai", "Cardiologist", "Desai Heart Hospital", 800], ["Dr. Pooja Trivedi", "Endocrinologist", "Trivedi Endocrine Clinic", 1500],
  ] as const;
  const doctorIds: string[] = [];
  for (const [i, [name, spec, clinic, pct]] of doctors.entries()) {
    const code = `DR-${String(i + 1).padStart(4, "0")}`;
    const d = await db.doctor.upsert({
      where: { code }, update: {},
      create: { branchId, code, name, specialization: spec, clinic, mobile: `90000${String(10000 + i).slice(-5)}`, defaultCommissionType: "PERCENT", defaultCommissionValue: pct },
    });
    doctorIds.push(d.id);
  }
  // Example test-wise and department-wise rules
  await db.commissionRule.upsert({ where: { doctorId_scope_refId: { doctorId: doctorIds[0], scope: "TEST", refId: testId.get("CBC")! } }, update: {}, create: { doctorId: doctorIds[0], scope: "TEST", refId: testId.get("CBC")!, type: "PERCENT", value: 1000 } });
  await db.commissionRule.upsert({ where: { doctorId_scope_refId: { doctorId: doctorIds[5], scope: "DEPARTMENT", refId: deptId.get("END")! } }, update: {}, create: { doctorId: doctorIds[5], scope: "DEPARTMENT", refId: deptId.get("END")!, type: "PERCENT", value: 2000 } });

  // Patients (fictional; mobile numbers are placeholders)
  if ((await db.patient.count()) === 0) {
    const names: [string, string, Sex, number][] = [
      ["Ramesh", "Parmar", "MALE", 54], ["Kavita", "Solanki", "FEMALE", 38], ["Harsh", "Vora", "MALE", 27], ["Priya", "Sharma", "FEMALE", 31],
      ["Mahesh", "Chauhan", "MALE", 62], ["Anjali", "Bhatt", "FEMALE", 45], ["Dev", "Rathod", "MALE", 9], ["Nirali", "Dave", "FEMALE", 29],
      ["Suresh", "Gohil", "MALE", 48], ["Hetal", "Kotecha", "FEMALE", 52], ["Jay", "Pandya", "MALE", 35], ["Bhavna", "Raval", "FEMALE", 66],
    ];
    const patients = [];
    for (const [i, [fn, ln, sex, age]] of names.entries()) {
      const p = await db.$transaction(async (tx) => db.patient.create({
        data: {
          branchId, uhid: await nextNumber(tx as any, branchId, "PATIENT"), firstName: fn, lastName: ln, fullName: `${fn} ${ln}`, sex, ageYears: age,
          mobile: `98000${String(10000 + i).slice(-5)}`, whatsapp: `98000${String(10000 + i).slice(-5)}`, city: "Rajkot", state: "Gujarat",
          referringDoctorId: pick(doctorIds),
        },
      }));
      patients.push(p);
    }

    // Orders + invoices + payments. No results are seeded: results must only come from real entry.
    const codes = TESTS.map((t) => t.code);
    const methods: PaymentMethod[] = ["CASH", "UPI", "CARD", "ONLINE", "BANK_TRANSFER"];
    for (let i = 0; i < 34; i++) {
      const patient = pick(patients);
      const doctorId = rnd() < 0.8 ? pick(doctorIds) : null;
      const chosen = [...new Set([pick(codes), pick(codes), ...(rnd() < 0.4 ? [pick(codes)] : [])])];
      const dbTests = await db.test.findMany({ where: { branchId, code: { in: chosen } } });
      const rules = doctorId ? await db.commissionRule.findMany({ where: { doctorId } }) : [];
      const doc = doctorId ? await db.doctor.findUnique({ where: { id: doctorId } }) : null;
      const discountPct = rnd() < 0.25 ? 10 : 0;
      const when = new Date(Date.now() - Math.floor(rnd() * 20) * 86_400_000);

      await db.$transaction(async (tx) => {
        const order = await tx.order.create({ data: { branchId, orderNo: await nextNumber(tx as any, branchId, "ORDER"), patientId: patient.id, doctorId, createdAt: when } });
        const items = [];
        for (const t of dbTests) {
          const discount = Math.round((t.price * discountPct) / 100);
          const net = t.price - discount;
          const c = doc ? resolveCommission({ testId: t.id, departmentId: t.departmentId, netPrice: net }, rules as any, { type: doc.defaultCommissionType, value: doc.defaultCommissionValue }) : null;
          items.push(await tx.orderItem.create({ data: {
            orderId: order.id, testId: t.id, description: t.name, listPrice: t.price, discount, netPrice: net, isOutsourced: t.isOutsourced,
            commissionRuleScope: c?.scope, commissionType: c?.type, commissionValue: c?.value, commissionAmount: c?.amount ?? 0,
          } }));
        }
        if (i >= 8) { // 26 invoices; the first 8 orders stay un-billed drafts
          const subtotal = items.reduce((s, x) => s + x.listPrice, 0);
          const discount = items.reduce((s, x) => s + x.discount, 0);
          const net = subtotal - discount;
          const payFull = rnd() < 0.7;
          const paid = payFull ? net : rnd() < 0.5 ? Math.round(net / 2) : 0;
          const inv = await tx.invoice.create({ data: {
            branchId, invoiceNo: await nextNumber(tx as any, branchId, "INVOICE"), orderId: order.id, patientId: patient.id,
            status: paid === 0 ? "ISSUED" : paid >= net ? "PAID" : "PARTIALLY_PAID", subtotal, discount, netAmount: net, paidAmount: paid, dueAmount: net - paid,
            issuedAt: when, createdAt: when,
            items: { create: items.map((x) => ({ orderItemId: x.id, description: x.description, amount: x.listPrice, discount: x.discount })) },
          } });
          if (paid > 0) await tx.payment.create({ data: { invoiceId: inv.id, receiptNo: await nextNumber(tx as any, branchId, "RECEIPT"), method: pick(methods), amount: paid, receivedAt: when } });
        }
      });
    }
  }

  console.log(`Seed complete. Sign in as ${adminEmail} (demo users: <role>@rajlab.local) with the SEED_ADMIN_PASSWORD value.`);
  console.log(`Tests: ${TESTS.length}, departments: ${DEPARTMENTS.length}, permissions: ${ALL_PERMISSIONS.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
