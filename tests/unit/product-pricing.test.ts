import { describe, expect, it } from "vitest";
import { computeCustomizedPrice } from "@/src/modules/products/product-pricing";
import type { ProductDetail } from "@/src/modules/products/products.types";

function makeProduct(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: "product-1",
    tenantId: "tenant-1",
    categoryId: null,
    name: "Vanilla Cake",
    slug: "vanilla-cake",
    description: null,
    basePrice: 200000,
    prepTimeMinutes: null,
    orderingMode: "instant",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
    images: [],
    optionGroups: [],
    ...overrides,
  };
}

describe("computeCustomizedPrice", () => {
  it("returns the base price when there are no option groups", () => {
    const product = makeProduct();
    expect(computeCustomizedPrice(product, {})).toBe(200000);
  });

  it("returns the base price when a group has no selection", () => {
    const product = makeProduct({
      optionGroups: [
        {
          id: "group-size",
          tenantId: "tenant-1",
          productId: "product-1",
          name: "Size",
          selectionType: "single",
          required: false,
          position: 0,
          values: [
            { id: "value-small", tenantId: "tenant-1", optionGroupId: "group-size", label: "Small", priceDelta: 0, available: true, position: 0 },
            { id: "value-large", tenantId: "tenant-1", optionGroupId: "group-size", label: "Large", priceDelta: 50000, available: true, position: 1 },
          ],
        },
      ],
    });
    expect(computeCustomizedPrice(product, {})).toBe(200000);
  });

  it("adds a single-select group's price delta when chosen", () => {
    const product = makeProduct({
      optionGroups: [
        {
          id: "group-size",
          tenantId: "tenant-1",
          productId: "product-1",
          name: "Size",
          selectionType: "single",
          required: true,
          position: 0,
          values: [
            { id: "value-small", tenantId: "tenant-1", optionGroupId: "group-size", label: "Small", priceDelta: 0, available: true, position: 0 },
            { id: "value-large", tenantId: "tenant-1", optionGroupId: "group-size", label: "Large", priceDelta: 50000, available: true, position: 1 },
          ],
        },
      ],
    });
    expect(computeCustomizedPrice(product, { "group-size": ["value-large"] })).toBe(250000);
  });

  it("sums every selected value across a multiple-select group", () => {
    const product = makeProduct({
      optionGroups: [
        {
          id: "group-extras",
          tenantId: "tenant-1",
          productId: "product-1",
          name: "Extras",
          selectionType: "multiple",
          required: false,
          position: 0,
          values: [
            { id: "value-sprinkles", tenantId: "tenant-1", optionGroupId: "group-extras", label: "Sprinkles", priceDelta: 10000, available: true, position: 0 },
            { id: "value-candles", tenantId: "tenant-1", optionGroupId: "group-extras", label: "Candles", priceDelta: 15000, available: true, position: 1 },
          ],
        },
      ],
    });
    expect(
      computeCustomizedPrice(product, { "group-extras": ["value-sprinkles", "value-candles"] })
    ).toBe(225000);
  });

  it("allows a negative price delta to reduce the total", () => {
    const product = makeProduct({
      optionGroups: [
        {
          id: "group-filling",
          tenantId: "tenant-1",
          productId: "product-1",
          name: "Filling",
          selectionType: "single",
          required: false,
          position: 0,
          values: [
            { id: "value-none", tenantId: "tenant-1", optionGroupId: "group-filling", label: "None", priceDelta: -20000, available: true, position: 0 },
          ],
        },
      ],
    });
    expect(computeCustomizedPrice(product, { "group-filling": ["value-none"] })).toBe(180000);
  });
});
