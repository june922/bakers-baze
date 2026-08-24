import { notFound } from "next/navigation";
import { getTemplate } from "@/src/templates/registry";
import { loadCategoryPageData, loadStorefrontData } from "../data";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ bakerySlug: string; categorySlug: string }>;
}) {
  const { bakerySlug, categorySlug } = await params;

  const storefront = await loadStorefrontData(bakerySlug);
  if (!storefront) return null;

  const data = await loadCategoryPageData(bakerySlug, categorySlug);
  if (!data) notFound();

  const template = getTemplate(data.settings.templateKey);
  const products = data.products.filter((product) => product.categoryId === data.category.id);

  return <template.ProductGrid data={data} products={products} category={data.category} />;
}
