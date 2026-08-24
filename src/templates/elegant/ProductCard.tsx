import Link from "next/link";
import type { Category, ProductSummary } from "@/src/modules/products/products.types";
import { formatPrice } from "@/src/templates/format";

export default function ProductCard({
  product,
  bakerySlug,
  categorySlugById,
}: {
  product: ProductSummary;
  bakerySlug: string;
  categorySlugById: Map<string, Category>;
}) {
  const category = product.categoryId ? categorySlugById.get(product.categoryId) : undefined;
  const categorySlug = category?.slug ?? "uncategorized";

  return (
    <Link
      href={`/${bakerySlug}/${categorySlug}/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-black/[.08] bg-white transition-shadow hover:shadow-lg dark:border-white/[.145] dark:bg-[#1a1512]"
    >
      <div className="aspect-square w-full overflow-hidden bg-[#f3ece3] dark:bg-[#241c16]">
        {product.primaryImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.primaryImageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400">No photo</div>
        )}
      </div>
      <div className="flex flex-col gap-1 p-4">
        <h3 className="font-medium">{product.name}</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{formatPrice(product.basePrice)}</p>
      </div>
    </Link>
  );
}
