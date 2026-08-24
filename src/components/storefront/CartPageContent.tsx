"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";
import { formatPrice } from "@/src/templates/format";

export default function CartPageContent({ bakerySlug }: { bakerySlug: string }) {
  const { lines, updateQuantity, removeLine, totalPrice } = useCart();

  if (lines.length === 0) {
    return (
      <main className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <Link href={`/${bakerySlug}`} className="text-sm text-[var(--accent)] hover:underline">
          Browse products
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">Your cart</h1>
      <ul className="flex flex-col gap-3">
        {lines.map((line) => {
          const optionsTotal = line.selectedOptions.reduce((sum, o) => sum + o.priceDelta, 0);
          const lineTotal = (line.unitPrice + optionsTotal) * line.quantity;
          return (
            <li
              key={line.key}
              className="flex gap-4 rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]"
            >
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[#f3ece3] dark:bg-[#241c16]">
                {line.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={line.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <Link href={`/${bakerySlug}/${line.categorySlug}/${line.productSlug}`} className="font-medium hover:underline">
                  {line.productName}
                </Link>
                {line.selectedOptions.length > 0 && (
                  <p className="text-sm text-zinc-500">
                    {line.selectedOptions.map((o) => o.optionValueLabel).join(", ")}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={line.quantity}
                    onChange={(e) => updateQuantity(line.key, Math.max(1, Math.min(50, Number.parseInt(e.target.value, 10) || 1)))}
                    className="w-16 rounded border border-black/[.08] px-2 py-1 text-sm dark:border-white/[.145]"
                    aria-label={`Quantity for ${line.productName}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(line.key)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <p className="font-medium">{formatPrice(lineTotal)}</p>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between border-t border-black/[.08] pt-4 dark:border-white/[.145]">
        <p className="text-lg font-semibold">Total</p>
        <p className="text-lg font-semibold">{formatPrice(totalPrice)}</p>
      </div>

      <Link
        href={`/${bakerySlug}/checkout`}
        className="self-start rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background"
      >
        Proceed to checkout
      </Link>
    </main>
  );
}
