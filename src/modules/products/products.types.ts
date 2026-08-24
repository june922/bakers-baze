export type ProductStatus = "draft" | "published";
export type OrderingMode = "instant" | "request_confirm";
export type SelectionType = "single" | "multiple";

export interface Category {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductImage {
  id: string;
  tenantId: string;
  productId: string;
  url: string;
  altText: string | null;
  position: number;
}

export interface ProductOptionValue {
  id: string;
  tenantId: string;
  optionGroupId: string;
  label: string;
  priceDelta: number;
  available: boolean;
  position: number;
}

export interface ProductOptionGroup {
  id: string;
  tenantId: string;
  productId: string;
  name: string;
  selectionType: SelectionType;
  required: boolean;
  position: number;
  values: ProductOptionValue[];
}

export interface Product {
  id: string;
  tenantId: string;
  categoryId: string | null;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  prepTimeMinutes: number | null;
  orderingMode: OrderingMode;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductSummary extends Product {
  primaryImageUrl: string | null;
}

export interface ProductDetail extends Product {
  images: ProductImage[];
  optionGroups: ProductOptionGroup[];
}
