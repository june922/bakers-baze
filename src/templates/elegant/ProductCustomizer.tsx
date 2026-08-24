"use client";

import { useMemo, useState } from "react";
import { lineKey, useCart, type CartOptionSelection } from "@/src/components/storefront/CartProvider";
import { computeCustomizedPrice } from "@/src/modules/products/product-pricing";
import type { ProductDetail } from "@/src/modules/products/products.types";
import { formatPrice } from "@/src/templates/format";

function defaultSelection(product: ProductDetail): Record<string, string[]> {
  const selection: Record<string, string[]> = {};
  for (const group of product.optionGroups) {
    if (group.selectionType === "single" && group.required) {
      const firstAvailable = group.values.find((value) => value.available);
      selection[group.id] = firstAvailable ? [firstAvailable.id] : [];
    } else {
      selection[group.id] = [];
    }
  }
  return selection;
}

function missingRequiredGroups(product: ProductDetail, selection: Record<string, string[]>): string[] {
  return product.optionGroups
    .filter((group) => group.required && (selection[group.id] ?? []).length === 0)
    .map((group) => group.name);
}

export default function ProductCustomizer({
  product,
  categorySlug,
  imageUrl,
}: {
  product: ProductDetail;
  categorySlug: string;
  imageUrl: string | null;
}) {
  const { addLine } = useCart();
  const [selection, setSelection] = useState<Record<string, string[]>>(() => defaultSelection(product));
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const totalPrice = useMemo(() => computeCustomizedPrice(product, selection), [product, selection]);
  const missing = useMemo(() => missingRequiredGroups(product, selection), [product, selection]);

  function selectSingle(groupId: string, valueId: string) {
    setSelection((prev) => ({ ...prev, [groupId]: [valueId] }));
    setAdded(false);
  }

  function toggleMultiple(groupId: string, valueId: string) {
    setSelection((prev) => {
      const current = prev[groupId] ?? [];
      const next = current.includes(valueId) ? current.filter((id) => id !== valueId) : [...current, valueId];
      return { ...prev, [groupId]: next };
    });
    setAdded(false);
  }

  function handleAddToCart() {
    if (missing.length > 0) return;

    const selectedOptions: CartOptionSelection[] = [];
    for (const group of product.optionGroups) {
      for (const valueId of selection[group.id] ?? []) {
        const value = group.values.find((v) => v.id === valueId);
        if (value) {
          selectedOptions.push({
            optionGroupId: group.id,
            optionGroupName: group.name,
            optionValueId: value.id,
            optionValueLabel: value.label,
            priceDelta: value.priceDelta,
          });
        }
      }
    }

    addLine(
      {
        key: lineKey(product.id, selectedOptions),
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        categorySlug,
        unitPrice: product.basePrice,
        imageUrl,
        selectedOptions,
      },
      quantity
    );
    setAdded(true);
  }

  return (
    <div className="flex flex-col gap-6">
      {product.optionGroups.map((group) => (
        <fieldset key={group.id} className="flex flex-col gap-2">
          <legend className="font-medium">
            {group.name}
            {group.required && <span className="ml-1 text-red-600">*</span>}
          </legend>
          <div className="flex flex-col gap-2">
            {group.values.map((value) => {
              const checked = (selection[group.id] ?? []).includes(value.id);
              const inputType = group.selectionType === "single" ? "radio" : "checkbox";
              return (
                <label
                  key={value.id}
                  className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    value.available
                      ? "cursor-pointer border-black/[.08] hover:bg-black/[.03] dark:border-white/[.145] dark:hover:bg-white/[.05]"
                      : "cursor-not-allowed border-black/[.05] opacity-50 dark:border-white/[.08]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type={inputType}
                      name={group.id}
                      checked={checked}
                      disabled={!value.available}
                      onChange={() =>
                        group.selectionType === "single" ? selectSingle(group.id, value.id) : toggleMultiple(group.id, value.id)
                      }
                    />
                    {value.label}
                  </span>
                  {value.priceDelta !== 0 && (
                    <span className="text-zinc-500">
                      {value.priceDelta > 0 ? "+" : ""}
                      {formatPrice(value.priceDelta)}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      <p className="text-2xl font-semibold">{formatPrice(totalPrice)}</p>

      <div className="flex items-center gap-3">
        <label htmlFor="quantity" className="text-sm font-medium">
          Quantity
        </label>
        <input
          id="quantity"
          type="number"
          min={1}
          max={50}
          value={quantity}
          onChange={(e) => {
            setQuantity(Math.max(1, Math.min(50, Number.parseInt(e.target.value, 10) || 1)));
            setAdded(false);
          }}
          className="w-20 rounded border border-black/[.08] px-2 py-1 text-sm dark:border-white/[.145]"
        />
      </div>

      {missing.length > 0 && (
        <p className="text-sm text-red-600">Select {missing.join(", ")} before adding to cart.</p>
      )}

      <button
        type="button"
        onClick={handleAddToCart}
        disabled={missing.length > 0}
        className="self-start rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background disabled:opacity-50"
      >
        {added ? "Added to cart" : "Add to cart"}
      </button>
    </div>
  );
}
