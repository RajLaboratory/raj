import { z } from "zod";
import { handle } from "@/lib/api";
import { HttpError } from "@/lib/rbac";
import { getLabProfile, getNumberFormats, saveSetting, schemaForKey } from "@/lib/settings";

export const GET = (req: Request) =>
  handle(req, "settings.manage", async ({ user }) => ({
    labProfile: await getLabProfile(user.branchId),
    numbering: await getNumberFormats(user.branchId),
  }));

const body = z.object({ key: z.string(), value: z.unknown() });

export const PUT = (req: Request) =>
  handle(req, "settings.manage", async ({ user }) => {
    const { key, value } = body.parse(await req.json());
    const schema = schemaForKey(key);
    if (!schema) throw new HttpError(400, "Unknown setting", "UNKNOWN_SETTING");
    const saved = await saveSetting(user.branchId, key, schema.parse(value), user.id);
    return { key: saved.key, value: saved.value };
  });
