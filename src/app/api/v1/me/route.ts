import { handle } from "@/lib/api";

export const GET = (req: Request) =>
  handle(req, null, async ({ user }) => ({
    id: user.id, name: user.name, email: user.email, role: user.roleName,
    permissions: [...user.permissions],
  }));
