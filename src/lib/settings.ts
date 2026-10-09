import { z } from "zod";
import { basePrisma, prisma } from "./db";
import { DEFAULT_FORMATS, type NumberType } from "./numbering";

export const labProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().max(300).default(""),
  phone: z.string().trim().max(40).default(""),
  email: z.string().trim().email().or(z.literal("")).default(""),
  website: z.string().trim().max(120).default(""),
  gstin: z.string().trim().toUpperCase().regex(/^([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])?$/, "Invalid GSTIN").default(""),
  license: z.string().trim().max(120).default(""),
  reportFooter: z.string().trim().max(400).default(""),
  signatory: z.string().trim().max(120).default(""),
  gstEnabled: z.boolean().default(false),
});
export type LabProfile = z.infer<typeof labProfileSchema>;

export const numberFormatSchema = z.object({
  prefix: z.string().trim().min(1).max(8).regex(/^[A-Za-z0-9]+$/),
  digits: z.number().int().min(3).max(10),
  yearlyReset: z.boolean(),
});

const NUMBER_KEYS = Object.keys(DEFAULT_FORMATS) as NumberType[];

/** key -> validator. Only keys listed here can be written through the API. */
export function schemaForKey(key: string): z.ZodTypeAny | null {
  if (key === "lab.profile") return labProfileSchema;
  if (key.startsWith("numbering.") && NUMBER_KEYS.includes(key.slice(10) as NumberType)) return numberFormatSchema;
  return null;
}

export async function getSetting<T>(branchId: string, key: string): Promise<T | null> {
  const row = await basePrisma.setting.findUnique({ where: { branchId_key: { branchId, key } } });
  return (row?.value as T) ?? null;
}

export async function getLabProfile(branchId: string): Promise<LabProfile> {
  const stored = await getSetting<Partial<LabProfile>>(branchId, "lab.profile");
  return labProfileSchema.parse({ name: "Raj Laboratory", ...stored });
}

export async function getNumberFormats(branchId: string) {
  const rows = await basePrisma.setting.findMany({ where: { branchId, key: { startsWith: "numbering." } } });
  const out = { ...DEFAULT_FORMATS };
  for (const r of rows) out[r.key.slice(10) as NumberType] = { ...out[r.key.slice(10) as NumberType], ...(r.value as object) };
  return out;
}

export async function saveSetting(branchId: string, key: string, value: unknown, userId: string) {
  const existing = await basePrisma.setting.findUnique({ where: { branchId_key: { branchId, key } } });
  if (existing) {
    return prisma.setting.update({ where: { id: existing.id }, data: { value: value as object, updatedBy: userId } });
  }
  return prisma.setting.create({ data: { branchId, key, value: value as object, updatedBy: userId } });
}
