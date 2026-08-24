"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

export default function CartLink({ bakerySlug }: { bakerySlug: string }) {
  const { totalItems } = useCart();

  return (
    <Link
      href={`/${bakerySlug}/cart`}
      className="ml-auto flex items-center gap-1.5 rounded-full border border-black/[.08] px-3 py-1.5 text-sm dark:border-white/[.145]"
    >
      Cart
      {totalItems > 0 && (
        <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-xs font-medium text-white">
          {totalItems}
        </span>
      )}
    </Link>
  );
}
