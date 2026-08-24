import Link from "next/link";

export default function DashboardHome() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Manage your storefront&apos;s categories, products, and settings.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/categories"
          className="rounded-full border border-black/[.08] px-4 py-2 text-sm hover:bg-black/[.03] dark:border-white/[.145] dark:hover:bg-white/[.05]"
        >
          Manage categories
        </Link>
        <Link
          href="/dashboard/products"
          className="rounded-full border border-black/[.08] px-4 py-2 text-sm hover:bg-black/[.03] dark:border-white/[.145] dark:hover:bg-white/[.05]"
        >
          Manage products
        </Link>
        <Link
          href="/dashboard/settings"
          className="rounded-full border border-black/[.08] px-4 py-2 text-sm hover:bg-black/[.03] dark:border-white/[.145] dark:hover:bg-white/[.05]"
        >
          Storefront settings
        </Link>
      </div>
    </div>
  );
}
