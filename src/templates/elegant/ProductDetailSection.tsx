import type { ProductDetail } from "@/src/modules/products/products.types";
import type { TemplateSectionProps } from "@/src/templates/types";
import ProductCustomizer from "./ProductCustomizer";

export default function ProductDetailSection({ product }: TemplateSectionProps & { product: ProductDetail }) {
  const primaryImage = product.images[0]?.url;

  return (
    <section className="mx-auto grid max-w-5xl gap-10 px-6 py-12 sm:grid-cols-2">
      <div className="aspect-square w-full overflow-hidden rounded-xl bg-[#f3ece3] dark:bg-[#241c16]">
        {primaryImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={primaryImage} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400">No photo</div>
        )}
      </div>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-semibold">{product.name}</h1>
          {product.description && <p className="mt-3 text-zinc-700 dark:text-zinc-300">{product.description}</p>}
          {product.orderingMode === "request_confirm" && (
            <p className="mt-3 text-sm text-[#8a5a3b] dark:text-[#e0b48c]">
              This item is made to order — the baker will confirm availability before it&apos;s finalized.
            </p>
          )}
        </div>
        <ProductCustomizer product={product} />
      </div>
    </section>
  );
}
