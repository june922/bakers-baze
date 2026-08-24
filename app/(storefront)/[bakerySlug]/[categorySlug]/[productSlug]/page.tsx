import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTemplate } from "@/src/templates/registry";
import { loadProductPageData, loadStorefrontData } from "../../data";

interface ProductPageParams {
  params: Promise<{ bakerySlug: string; categorySlug: string; productSlug: string }>;
}

export async function generateMetadata({ params }: ProductPageParams): Promise<Metadata> {
  const { bakerySlug, categorySlug, productSlug } = await params;
  const data = await loadProductPageData(bakerySlug, categorySlug, productSlug);
  if (!data) return {};
  return {
    title: `${data.product.name} | ${data.settings.displayName}`,
    description: data.product.description ?? undefined,
  };
}

export default async function ProductPage({ params }: ProductPageParams) {
  const { bakerySlug, categorySlug, productSlug } = await params;

  const storefront = await loadStorefrontData(bakerySlug);
  if (!storefront) return null;

  const data = await loadProductPageData(bakerySlug, categorySlug, productSlug);
  if (!data) notFound();

  const template = getTemplate(data.settings.templateKey);

  return <template.ProductDetailSection data={data} product={data.product} />;
}
