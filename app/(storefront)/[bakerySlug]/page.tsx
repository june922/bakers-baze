import type { Metadata } from "next";
import { getTemplate } from "@/src/templates/registry";
import { loadStorefrontData } from "./data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bakerySlug: string }>;
}): Promise<Metadata> {
  const { bakerySlug } = await params;
  const data = await loadStorefrontData(bakerySlug);
  if (!data) return {};
  return {
    title: data.settings.displayName,
    description: data.settings.tagline ?? undefined,
  };
}

export default async function BakeryHomePage({ params }: { params: Promise<{ bakerySlug: string }> }) {
  const { bakerySlug } = await params;
  const data = await loadStorefrontData(bakerySlug);
  if (!data) return null;

  const template = getTemplate(data.settings.templateKey);

  return (
    <>
      <template.Hero data={data} />
      <template.ProductGrid data={data} products={data.products} />
      <template.About data={data} />
    </>
  );
}
