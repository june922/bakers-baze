import Link from "next/link";
import DeleteEntityButton from "@/src/components/dashboard/DeleteEntityButton";
import { formatPrice } from "@/src/templates/format";
import { toTenantContext } from "@/src/lib/tenant-context";
import { requireBaker } from "@/src/modules/auth/auth.service";
import { productsService } from "@/src/modules/products/products.service";

export default async function ProductsPage() {
  const ctx = toTenantContext(await requireBaker());
  const [products, categories] = await Promise.all([
    productsService.listProducts(ctx),
    productsService.listCategories(ctx),
  ]);
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name] as const));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Link
          href="/dashboard/products/new"
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          New product
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-zinc-500">No products yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {products.map((product) => (
            <li
              key={product.id}
              className="flex flex-col gap-2 rounded-lg border border-black/[.08] p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/[.145]"
            >
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-zinc-500">
                  {formatPrice(product.basePrice)} · {product.categoryId ? categoryNameById.get(product.categoryId) ?? "Uncategorized" : "Uncategorized"} ·{" "}
                  <span className={product.status === "published" ? "text-green-600 dark:text-green-500" : "text-zinc-500"}>
                    {product.status}
                  </span>{" "}
                  · {product.orderingMode === "instant" ? "Instant order" : "Request to confirm"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/products/${product.id}`}
                  className="rounded-full border border-black/[.08] px-3 py-1 text-xs dark:border-white/[.145]"
                >
                  Edit
                </Link>
                <DeleteEntityButton
                  action={`/api/dashboard/products/${product.id}`}
                  confirmMessage={`Delete product "${product.name}"? This cannot be undone.`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
