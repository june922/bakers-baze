"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface CartOptionSelection {
  optionGroupId: string;
  optionGroupName: string;
  optionValueId: string;
  optionValueLabel: string;
  priceDelta: number;
}

export interface CartLine {
  key: string;
  productId: string;
  productName: string;
  productSlug: string;
  categorySlug: string;
  unitPrice: number;
  imageUrl: string | null;
  quantity: number;
  selectedOptions: CartOptionSelection[];
}

interface CartContextValue {
  lines: CartLine[];
  addLine: (line: Omit<CartLine, "quantity">, quantity: number) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
  clear: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextValue | null>(null);

function lineKey(productId: string, selectedOptions: CartOptionSelection[]): string {
  const sortedIds = [...selectedOptions.map((o) => o.optionValueId)].sort();
  return `${productId}::${sortedIds.join(",")}`;
}

function storageKey(bakerySlug: string): string {
  return `cart:${bakerySlug}`;
}

export function CartProvider({ bakerySlug, children }: { bakerySlug: string; children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Deliberately synchronous: SSR and the initial client render both must
    // produce an empty cart (localStorage doesn't exist on the server), then
    // this effect syncs in the real value once mounted — the standard pattern
    // for avoiding a hydration mismatch on browser-storage-backed state.
    try {
      const raw = window.localStorage.getItem(storageKey(bakerySlug));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setLines(JSON.parse(raw));
    } catch {
      // Ignore corrupt/inaccessible storage — start with an empty cart.
    } finally {
      setHydrated(true);
    }
  }, [bakerySlug]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey(bakerySlug), JSON.stringify(lines));
    } catch {
      // Storage may be unavailable (private browsing, quota) — cart just won't persist.
    }
  }, [bakerySlug, lines, hydrated]);

  const addLine = useCallback((line: Omit<CartLine, "quantity">, quantity: number) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.key === line.key);
      if (existing) {
        return prev.map((l) => (l.key === line.key ? { ...l, quantity: l.quantity + quantity } : l));
      }
      return [...prev, { ...line, quantity }];
    });
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, quantity } : l))
    );
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const totalItems = useMemo(() => lines.reduce((sum, l) => sum + l.quantity, 0), [lines]);
  const totalPrice = useMemo(
    () =>
      lines.reduce((sum, l) => {
        const optionsTotal = l.selectedOptions.reduce((s, o) => s + o.priceDelta, 0);
        return sum + (l.unitPrice + optionsTotal) * l.quantity;
      }, 0),
    [lines]
  );

  const value = useMemo(
    () => ({ lines, addLine, updateQuantity, removeLine, clear, totalItems, totalPrice }),
    [lines, addLine, updateQuantity, removeLine, clear, totalItems, totalPrice]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}

export { lineKey };
