import { redirect } from "next/navigation";
import LogoutButton from "@/src/components/LogoutButton";
import { requireAdmin } from "@/src/modules/auth/auth.service";

export default async function AdminHome() {
  let user;
  try {
    user = await requireAdmin();
  } catch {
    redirect("/admin-login");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-16 text-center">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="text-zinc-600 dark:text-zinc-400">Signed in as {user.email}</p>
      <LogoutButton action="/api/admin/auth/logout" redirectTo="/admin-login" />
    </main>
  );
}
