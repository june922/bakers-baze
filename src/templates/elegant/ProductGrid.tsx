import type { Category, ProductSummary } from "@/src/modules/products/products.types";
import type { TemplateSectionProps } from "@/src/templates/types";
import ProductCard from "./ProductCard";

export default function ProductGrid({
  data,
  products,
  category,
}: TemplateSectionProps & { products: ProductSummary[]; category?: Category }) {
  const categoryById = new Map(data.categories.map((c) => [c.id, c] as const));

  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      {category && <h2 className="mb-6 text-2xl font-semibold">{category.name}</h2>}
      {products.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">No products available yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              bakerySlug={data.bakery.slug}
              categorySlugById={categoryById}
            />
          ))}
        </div>
      )}
    </section>
  );
}
