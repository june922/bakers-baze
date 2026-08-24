import type { Category, ProductDetail, ProductSummary } from "@/src/modules/products/products.types";
import type { Bakery } from "@/src/modules/tenants/tenants.types";

export interface StorefrontSettings {
  tenantId: string;
  templateKey: string;
  displayName: string;
  tagline: string | null;
  aboutText: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  heroImageUrl: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  branding: Record<string, unknown>;
  social: Record<string, unknown>;
}

export interface StorefrontData {
  bakery: Bakery;
  settings: StorefrontSettings;
  categories: Category[];
  products: ProductSummary[];
}

export interface StorefrontCategoryPageData extends StorefrontData {
  category: Category;
}

export interface StorefrontProductPageData extends StorefrontData {
  product: ProductDetail;
}
