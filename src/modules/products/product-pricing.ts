import type { ProductDetail } from "./products.types";

export function computeCustomizedPrice(product: ProductDetail, selection: Record<string, string[]>): number {
  let total = product.basePrice;

  for (const group of product.optionGroups) {
    const selectedIds = selection[group.id] ?? [];
    for (const value of group.values) {
      if (selectedIds.includes(value.id)) {
        total += value.priceDelta;
      }
    }
  }

  return total;
}
