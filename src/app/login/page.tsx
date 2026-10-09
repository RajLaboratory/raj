import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-8">
        <div className="space-y-1">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-brand-600 font-bold text-white">R</div>
          <h1 className="pt-3 text-xl font-semibold">Sign in to Raj Laboratory</h1>
          <p className="text-sm text-[var(--muted)]">Use the email and password given by your lab admin.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
