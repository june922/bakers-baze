"use client";

import { useMemo, useState } from "react";
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

export default function ProductCustomizer({ product }: { product: ProductDetail }) {
  const [selection, setSelection] = useState<Record<string, string[]>>(() => defaultSelection(product));

  const totalPrice = useMemo(() => computeCustomizedPrice(product, selection), [product, selection]);

  function selectSingle(groupId: string, valueId: string) {
    setSelection((prev) => ({ ...prev, [groupId]: [valueId] }));
  }

  function toggleMultiple(groupId: string, valueId: string) {
    setSelection((prev) => {
      const current = prev[groupId] ?? [];
      const next = current.includes(valueId) ? current.filter((id) => id !== valueId) : [...current, valueId];
      return { ...prev, [groupId]: next };
    });
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
    </div>
  );
}
