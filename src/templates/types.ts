import type { ComponentType } from "react";
import type { Category, ProductDetail, ProductSummary } from "@/src/modules/products/products.types";
import type { StorefrontData } from "@/src/modules/storefront/storefront.types";

export interface TemplateSectionProps {
  data: StorefrontData;
}

export interface TemplateComponents {
  Header: ComponentType<TemplateSectionProps & { activeCategorySlug?: string }>;
  Hero: ComponentType<TemplateSectionProps>;
  CategoryNav: ComponentType<TemplateSectionProps & { activeCategorySlug?: string }>;
  ProductGrid: ComponentType<TemplateSectionProps & { products: ProductSummary[]; category?: Category }>;
  About: ComponentType<TemplateSectionProps>;
  Footer: ComponentType<TemplateSectionProps>;
  ProductDetailSection: ComponentType<TemplateSectionProps & { product: ProductDetail }>;
}
