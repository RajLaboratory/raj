import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { getLabProfile, getNumberFormats } from "@/lib/settings";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const user = await requireUser();
  assertCan(user, "settings.manage");
  const [profile, numbering] = await Promise.all([getLabProfile(user.branchId), getNumberFormats(user.branchId)]);
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <SettingsForm profile={profile} numbering={numbering} />
    </div>
  );
}
