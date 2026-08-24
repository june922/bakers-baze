import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/src/components/LogoutButton";
import { requireBaker } from "@/src/modules/auth/auth.service";

const NAV_LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/orders", label: "Orders" },
  { href: "/dashboard/categories", label: "Categories" },
  { href: "/dashboard/products", label: "Products" },
  { href: "/dashboard/settings", label: "Storefront settings" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let user;
  try {
    user = await requireBaker();
  } catch {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-black/[.08] dark:border-white/[.145]">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-zinc-700 hover:underline dark:text-zinc-300">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-zinc-500">{user.email}</span>
            <LogoutButton action="/api/dashboard/auth/logout" redirectTo="/login" />
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">{children}</div>
    </div>
  );
}
